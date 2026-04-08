import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { createdById: userId };
  if (type) where.type = type;
  if (status) where.status = status;

  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      segment: { select: { name: true } },
      template: { select: { name: true, subject: true } },
      sequence: { select: { name: true } },
      _count: { select: { sends: true } },
      sends: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute send stats per campaign
  const campaignsWithStats = campaigns.map((c) => {
    const sends = c.sends || [];
    const stats = {
      queued: sends.filter(s => s.status === "queued").length,
      sent: sends.filter(s => s.status === "sent").length,
      failed: sends.filter(s => s.status === "failed").length,
      total: sends.length,
    };
    const { sends: _, ...rest } = c;
    return { ...rest, _sendStats: stats };
  });

  return NextResponse.json({ campaigns: campaignsWithStats });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, type, description, segmentId, templateId, sequenceId } = body;

  if (!name) {
    return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      type: type || "customer-update",
      description: description || null,
      segmentId: segmentId || null,
      templateId: templateId || null,
      sequenceId: sequenceId || null,
      createdById: userId,
    },
  });

  return NextResponse.json({ campaign });
}

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });

  const existing = await prisma.campaign.findFirst({ where: { id, createdById: userId } });
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const body = await req.json();
  const { name, type, description, status, segmentId, templateId, sequenceId, scheduledAt } = body;

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(description !== undefined && { description: description || null }),
      ...(status !== undefined && { status }),
      ...(segmentId !== undefined && { segmentId: segmentId || null }),
      ...(templateId !== undefined && { templateId: templateId || null }),
      ...(sequenceId !== undefined && { sequenceId: sequenceId || null }),
      ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
    },
    include: {
      segment: { select: { name: true } },
      template: { select: { name: true } },
      sequence: { select: { name: true } },
    },
  });

  return NextResponse.json({ campaign });
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });

  const existing = await prisma.campaign.findFirst({ where: { id, createdById: userId } });
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
