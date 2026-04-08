import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { createTransport, getSenderAddress, applyMergeFields, sendEmail, isTransportConfigured, injectTracking, getTrackingBaseUrl } from "@/lib/mailer";

interface ProcessResult {
  campaignId: string;
  campaignName: string;
  sent: number;
  failed: number;
  skipped: number;
  sequenceStepsCreated: number;
  completed: boolean;
}

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load user settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  const settings = JSON.parse(user?.settings || "{}");

  // Check send window
  const now = new Date();
  const currentHour = now.getHours();
  const windowStart = parseInt(settings.sendWindowStart?.split(":")[0] || "0");
  const windowEnd = parseInt(settings.sendWindowEnd?.split(":")[0] || "23");
  if (windowStart < windowEnd && (currentHour < windowStart || currentHour >= windowEnd)) {
    return NextResponse.json({
      message: `Outside send window (${settings.sendWindowStart || "00:00"} - ${settings.sendWindowEnd || "23:00"})`,
      results: [],
    });
  }

  // Count today's sends to check daily limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySentCount = await prisma.emailSend.count({
    where: {
      campaign: { createdById: userId },
      status: "sent",
      sentAt: { gte: todayStart },
    },
  });
  const dailyLimit = settings.dailySendLimit || 500;
  const remainingToday = Math.max(0, dailyLimit - todaySentCount);
  if (remainingToday === 0) {
    return NextResponse.json({
      message: `Daily send limit reached (${dailyLimit})`,
      results: [],
      todaySent: todaySentCount,
    });
  }

  // Build email transport
  const configured = isTransportConfigured(settings);
  const transport = configured ? createTransport(settings) : null;
  const fromAddress = getSenderAddress(settings);
  const sendDelayMs = (settings.sendDelay || 30) * 1000;

  // Get all active campaigns for this user
  const campaigns = await prisma.campaign.findMany({
    where: { createdById: userId, status: "active" },
    include: {
      template: true,
      sequence: {
        include: {
          steps: { orderBy: { stepOrder: "asc" } },
        },
      },
    },
  });

  const results: ProcessResult[] = [];
  let totalSentThisBatch = 0;

  for (const campaign of campaigns) {
    const result: ProcessResult = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      sent: 0,
      failed: 0,
      skipped: 0,
      sequenceStepsCreated: 0,
      completed: false,
    };

    // ─── Process queued sends ─────────────────────────
    const queuedSends = await prisma.emailSend.findMany({
      where: { campaignId: campaign.id, status: "queued" },
      include: {
        contact: true,
      },
      take: Math.min(50, remainingToday - totalSentThisBatch), // batch size
    });

    if (queuedSends.length === 0 && !campaign.sequence) {
      // No more queued sends and no sequence — check if campaign is done
      const remaining = await prisma.emailSend.count({
        where: { campaignId: campaign.id, status: "queued" },
      });
      if (remaining === 0) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "completed", completedAt: new Date() },
        });
        result.completed = true;
      }
      results.push(result);
      continue;
    }

    // Get template content (from send record's template, campaign template, or sequence step)
    for (const send of queuedSends) {
      if (totalSentThisBatch >= remainingToday) {
        result.skipped++;
        continue;
      }

      const contact = send.contact;

      // Determine email content
      let subject = "";
      let bodyHtml = "";
      let replyToMessageId: string | undefined;

      if (campaign.sequence && send.stepOrder) {
        // Sequence-based: get step content
        const step = campaign.sequence.steps.find(s => s.stepOrder === send.stepOrder);
        if (step) {
          // Use step's template or inline content
          if (step.templateId) {
            const stepTemplate = await prisma.template.findUnique({ where: { id: step.templateId } });
            subject = step.subject || stepTemplate?.subject || "";
            bodyHtml = step.bodyHtml || stepTemplate?.bodyHtml || "";
          } else {
            subject = step.subject || "";
            bodyHtml = step.bodyHtml || "";
          }

          // For forward/reply steps, find the previous send's messageId
          if (step.isForward && send.stepOrder > 1) {
            const prevSend = await prisma.emailSend.findFirst({
              where: {
                campaignId: campaign.id,
                contactId: contact.id,
                stepOrder: send.stepOrder - 1,
                status: "sent",
              },
            });
            if (prevSend?.messageId) {
              replyToMessageId = prevSend.messageId;
              if (!subject.toLowerCase().startsWith("re:")) {
                subject = `Re: ${subject}`;
              }
            }
          }
        }
      } else if (campaign.template) {
        // Single-send campaign with template
        subject = campaign.template.subject;
        bodyHtml = campaign.template.bodyHtml;
      }

      if (!subject && !bodyHtml) {
        // No content to send
        await prisma.emailSend.update({
          where: { id: send.id },
          data: { status: "failed" },
        });
        result.failed++;
        continue;
      }

      // Apply merge fields and inject tracking
      const mergedSubject = applyMergeFields(subject, contact);
      const mergedBody = applyMergeFields(bodyHtml, contact);
      const baseUrl = getTrackingBaseUrl();
      const trackedBody = injectTracking(mergedBody, send.id, baseUrl);

      // Send the email
      if (transport) {
        try {
          const { messageId } = await sendEmail(
            transport,
            contact.email,
            mergedSubject,
            trackedBody,
            fromAddress,
            replyToMessageId,
          );

          await prisma.emailSend.update({
            where: { id: send.id },
            data: { status: "sent", sentAt: new Date(), messageId },
          });
          result.sent++;
          totalSentThisBatch++;

          // Delay between sends
          if (sendDelayMs > 0 && totalSentThisBatch < remainingToday) {
            await new Promise(r => setTimeout(r, Math.min(sendDelayMs, 5000)));
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          await prisma.emailSend.update({
            where: { id: send.id },
            data: { status: "failed" },
          });
          result.failed++;

          // Log the failure
          await prisma.activity.create({
            data: {
              type: "email-failed",
              description: `Failed to send to ${contact.email}: ${errorMsg.slice(0, 200)}`,
              contactId: contact.id,
              userId,
            },
          });
        }
      } else {
        // No transport configured — simulate send for development
        await prisma.emailSend.update({
          where: { id: send.id },
          data: {
            status: "sent",
            sentAt: new Date(),
            messageId: `sim-${send.id.slice(0, 8)}@sandbox.local`,
          },
        });
        result.sent++;
        totalSentThisBatch++;
      }
    }

    // ─── Sequence step advancement ────────────────────
    if (campaign.sequence && campaign.sequence.steps.length > 1) {
      const steps = campaign.sequence.steps;

      for (let i = 0; i < steps.length - 1; i++) {
        const currentStep = steps[i];
        const nextStep = steps[i + 1];

        // Find contacts who completed the current step but don't have the next step queued
        const completedCurrentStep = await prisma.emailSend.findMany({
          where: {
            campaignId: campaign.id,
            stepOrder: currentStep.stepOrder,
            status: "sent",
          },
          select: { contactId: true, sentAt: true },
        });

        for (const completed of completedCurrentStep) {
          if (!completed.sentAt) continue;

          // Calculate if enough time has passed for the next step
          const delayMs = (nextStep.delayDays * 24 * 60 * 60 * 1000) + (nextStep.delayHours * 60 * 60 * 1000);
          const readyAt = new Date(completed.sentAt.getTime() + delayMs);

          if (now < readyAt) continue; // Not ready yet

          // Check if next step already exists for this contact
          const existingNext = await prisma.emailSend.findFirst({
            where: {
              campaignId: campaign.id,
              contactId: completed.contactId,
              stepOrder: nextStep.stepOrder,
            },
          });

          if (!existingNext) {
            await prisma.emailSend.create({
              data: {
                campaignId: campaign.id,
                contactId: completed.contactId,
                templateId: nextStep.templateId,
                stepOrder: nextStep.stepOrder,
                status: "queued",
              },
            });
            result.sequenceStepsCreated++;
          }
        }
      }
    }

    // Check if campaign is complete (all steps done, no queued remaining)
    const totalQueued = await prisma.emailSend.count({
      where: { campaignId: campaign.id, status: "queued" },
    });
    if (totalQueued === 0) {
      // Check if there are still future sequence steps to create
      let hasPendingSteps = false;
      if (campaign.sequence && campaign.sequence.steps.length > 1) {
        const maxStepOrder = Math.max(...campaign.sequence.steps.map(s => s.stepOrder));
        const sendsAtMaxStep = await prisma.emailSend.count({
          where: { campaignId: campaign.id, stepOrder: maxStepOrder },
        });
        const totalContacts = await prisma.emailSend.count({
          where: { campaignId: campaign.id, stepOrder: 1 },
        });
        hasPendingSteps = sendsAtMaxStep < totalContacts;
      }

      if (!hasPendingSteps) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "completed", completedAt: new Date() },
        });
        result.completed = true;
      }
    }

    results.push(result);
  }

  // Log processing activity
  const totalSent = results.reduce((s, r) => s + r.sent, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);
  if (totalSent > 0 || totalFailed > 0) {
    await prisma.activity.create({
      data: {
        type: "email-sent",
        description: `Processed queue: ${totalSent} sent, ${totalFailed} failed across ${results.length} campaign(s)`,
        userId,
        metadata: JSON.stringify({ results }),
      },
    });
  }

  return NextResponse.json({
    message: transport
      ? `Processed: ${totalSent} sent, ${totalFailed} failed`
      : `Simulated: ${totalSent} sent (no email provider configured — emails marked as sent for testing)`,
    todaySent: todaySentCount + totalSent,
    dailyLimit,
    results,
  });
}
