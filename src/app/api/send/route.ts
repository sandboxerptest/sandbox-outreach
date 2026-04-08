import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { isTransportConfigured } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { campaignId, contactIds } = body;

  if (!campaignId) {
    return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, createdById: userId },
    include: {
      template: true,
      sequence: {
        include: { steps: { orderBy: { stepOrder: "asc" } } },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Validate campaign has content
  if (!campaign.template && !campaign.sequence) {
    return NextResponse.json({ error: "Campaign needs a template or sequence before launching" }, { status: 400 });
  }

  // Get target contacts
  const contacts = contactIds
    ? await prisma.contact.findMany({ where: { id: { in: contactIds }, createdById: userId } })
    : await prisma.contact.findMany({ where: { status: "active", createdById: userId } });

  if (contacts.length === 0) {
    return NextResponse.json({ error: "No contacts to send to" }, { status: 400 });
  }

  // Determine step order for queuing
  // If campaign has a sequence, queue only step 1. The processor handles subsequent steps.
  const stepOrder = campaign.sequence ? 1 : null;
  const templateId = campaign.sequence
    ? campaign.sequence.steps[0]?.templateId || campaign.templateId
    : campaign.templateId;

  // Create EmailSend records
  const sends = await Promise.all(
    contacts.map((contact) =>
      prisma.emailSend.create({
        data: {
          campaignId: campaign.id,
          contactId: contact.id,
          templateId,
          stepOrder,
          status: "queued",
        },
      })
    )
  );

  // Update campaign status
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "active", startedAt: new Date() },
  });

  // Check if email transport is configured
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } });
  const settings = JSON.parse(user?.settings || "{}");
  const configured = isTransportConfigured(settings);
  const providerLabel = (settings.emailProvider || "gmail") === "gmail" ? "Gmail" : "Office 365";

  // Log activity
  const seqInfo = campaign.sequence ? ` (sequence: ${campaign.sequence.name}, step 1 of ${campaign.sequence.steps.length})` : "";
  await prisma.activity.create({
    data: {
      type: "campaign-launched",
      description: `Campaign "${campaign.name}" queued ${sends.length} emails${seqInfo}`,
      userId,
      metadata: JSON.stringify({ campaignId, sendCount: sends.length, hasSequence: !!campaign.sequence }),
    },
  });

  return NextResponse.json({
    queued: sends.length,
    contacts: contacts.length,
    hasSequence: !!campaign.sequence,
    totalSteps: campaign.sequence?.steps.length || 1,
    configured,
    message: configured
      ? `${sends.length} emails queued. Call Process Queue to send via ${providerLabel}.`
      : `${sends.length} emails queued. Process Queue will simulate sending (configure ${providerLabel} in Settings for real delivery).`,
  });
}
