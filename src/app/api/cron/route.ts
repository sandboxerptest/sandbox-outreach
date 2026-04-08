import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTransport, getSenderAddress, applyMergeFields, sendEmail, isTransportConfigured, injectTracking, getTrackingBaseUrl } from "@/lib/mailer";

// ─── Cron Endpoint ────────────────────────────────────────────────
//
// Processes ALL users' active campaigns in one pass.
// Runs sequence step advancement, respects per-user send windows and daily limits.
//
// Authentication (checked in order):
//   1. Vercel Cron — automatically sends CRON_SECRET via header
//   2. Authorization header — "Bearer YOUR_CRON_SECRET"
//   3. Dev mode — if CRON_SECRET env is empty, allows unauthenticated calls
//
// ─── Setup by platform ───────────────────────────────────────────
//
// VERCEL:
//   1. Add CRON_SECRET to your Vercel environment variables
//   2. vercel.json is already configured with: { "crons": [{ "path": "/api/cron", "schedule": "* * * * *" }] }
//   3. Vercel automatically calls this endpoint every minute and sends the secret
//   4. Vercel Hobby plan: cron runs once/day. Pro plan: every minute.
//
// RAILWAY / RENDER / FLY.IO:
//   1. Set CRON_SECRET env var in your dashboard
//   2. Add a cron job service that calls:
//      curl -X POST https://your-app.com/api/cron -H "Authorization: Bearer YOUR_CRON_SECRET"
//   3. Schedule: every 1-5 minutes ("*/1 * * * *")
//
// LINUX SERVER (systemd timer or crontab):
//   1. Set CRON_SECRET in your .env
//   2. Add to crontab: crontab -e
//      * * * * * curl -s -X POST https://your-app.com/api/cron -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/sandbox-cron.log 2>&1
//
// GITHUB ACTIONS (free, runs on schedule):
//   1. Create .github/workflows/cron.yml:
//      name: Process Email Queue
//      on:
//        schedule:
//          - cron: '*/5 * * * *'    # every 5 minutes
//      jobs:
//        process:
//          runs-on: ubuntu-latest
//          steps:
//            - run: curl -X POST ${{ secrets.APP_URL }}/api/cron -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
//
// LOCAL DEV:
//   - Leave CRON_SECRET empty in .env — endpoint allows unauthenticated calls
//   - The in-app auto-polling on the Campaigns page handles processing while the app is open
//   - Or manually: curl -X POST http://localhost:3100/api/cron

export async function GET(req: NextRequest) {
  // Vercel cron calls GET by default
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  // Authenticate
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    // Check Vercel's automatic header first, then Authorization header
    const vercelAuth = req.headers.get("x-vercel-cron-auth");
    const bearerAuth = req.headers.get("authorization");
    const isVercel = vercelAuth === cronSecret;
    const isBearer = bearerAuth === `Bearer ${cronSecret}`;
    if (!isVercel && !isBearer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Get all active campaigns across all users
  const activeCampaigns = await prisma.campaign.findMany({
    where: { status: "active" },
    include: {
      createdBy: { select: { id: true, settings: true } },
      template: true,
      sequence: {
        include: { steps: { orderBy: { stepOrder: "asc" } } },
      },
    },
  });

  if (activeCampaigns.length === 0) {
    return NextResponse.json({ message: "No active campaigns", processed: 0 });
  }

  // Group campaigns by user to respect per-user settings
  const byUser = new Map<string, typeof activeCampaigns>();
  for (const c of activeCampaigns) {
    const userId = c.createdById;
    if (!byUser.has(userId)) byUser.set(userId, []);
    byUser.get(userId)!.push(c);
  }

  let totalSent = 0;
  let totalFailed = 0;
  let totalStepsCreated = 0;
  let campaignsCompleted = 0;

  for (const [userId, userCampaigns] of byUser) {
    const settings = JSON.parse(userCampaigns[0].createdBy.settings || "{}");

    // Check send window
    const windowStart = parseInt(settings.sendWindowStart?.split(":")[0] || "0");
    const windowEnd = parseInt(settings.sendWindowEnd?.split(":")[0] || "23");
    const currentHour = now.getHours();
    if (windowStart < windowEnd && (currentHour < windowStart || currentHour >= windowEnd)) {
      continue; // Outside this user's send window
    }

    // Check daily limit
    const todaySent = await prisma.emailSend.count({
      where: {
        campaign: { createdById: userId },
        status: "sent",
        sentAt: { gte: todayStart },
      },
    });
    const dailyLimit = settings.dailySendLimit || 500;
    let remaining = Math.max(0, dailyLimit - todaySent);
    if (remaining === 0) continue;

    // Build transport for this user
    const configured = isTransportConfigured(settings);
    const transport = configured ? createTransport(settings) : null;
    const fromAddress = getSenderAddress(settings);
    const sendDelayMs = (settings.sendDelay || 30) * 1000;

    for (const campaign of userCampaigns) {
      // Get queued sends
      const queuedSends = await prisma.emailSend.findMany({
        where: { campaignId: campaign.id, status: "queued" },
        include: { contact: true },
        take: Math.min(50, remaining),
      });

      for (const send of queuedSends) {
        if (remaining <= 0) break;
        const contact = send.contact;

        // Determine content
        let subject = "";
        let bodyHtml = "";
        let replyToMessageId: string | undefined;

        if (campaign.sequence && send.stepOrder) {
          const step = campaign.sequence.steps.find(s => s.stepOrder === send.stepOrder);
          if (step) {
            if (step.templateId) {
              const tpl = await prisma.template.findUnique({ where: { id: step.templateId } });
              subject = step.subject || tpl?.subject || "";
              bodyHtml = step.bodyHtml || tpl?.bodyHtml || "";
            } else {
              subject = step.subject || "";
              bodyHtml = step.bodyHtml || "";
            }
            if (step.isForward && send.stepOrder > 1) {
              const prev = await prisma.emailSend.findFirst({
                where: { campaignId: campaign.id, contactId: contact.id, stepOrder: send.stepOrder - 1, status: "sent" },
              });
              if (prev?.messageId) {
                replyToMessageId = prev.messageId;
                if (!subject.toLowerCase().startsWith("re:")) subject = `Re: ${subject}`;
              }
            }
          }
        } else if (campaign.template) {
          subject = campaign.template.subject;
          bodyHtml = campaign.template.bodyHtml;
        }

        if (!subject && !bodyHtml) {
          await prisma.emailSend.update({ where: { id: send.id }, data: { status: "failed" } });
          totalFailed++;
          continue;
        }

        const mergedSubject = applyMergeFields(subject, contact);
        const mergedBody = applyMergeFields(bodyHtml, contact);
        const trackedBody = injectTracking(mergedBody, send.id, getTrackingBaseUrl());

        if (transport) {
          try {
            const { messageId } = await sendEmail(transport, contact.email, mergedSubject, trackedBody, fromAddress, replyToMessageId);
            await prisma.emailSend.update({ where: { id: send.id }, data: { status: "sent", sentAt: new Date(), messageId } });
            totalSent++;
            remaining--;
            if (sendDelayMs > 0) await new Promise(r => setTimeout(r, Math.min(sendDelayMs, 5000)));
          } catch {
            await prisma.emailSend.update({ where: { id: send.id }, data: { status: "failed" } });
            totalFailed++;
          }
        } else {
          // Simulate in dev
          await prisma.emailSend.update({
            where: { id: send.id },
            data: { status: "sent", sentAt: new Date(), messageId: `sim-${send.id.slice(0, 8)}@sandbox.local` },
          });
          totalSent++;
          remaining--;
        }
      }

      // Advance sequence steps
      if (campaign.sequence && campaign.sequence.steps.length > 1) {
        const steps = campaign.sequence.steps;
        for (let i = 0; i < steps.length - 1; i++) {
          const nextStep = steps[i + 1];
          const completedPrev = await prisma.emailSend.findMany({
            where: { campaignId: campaign.id, stepOrder: steps[i].stepOrder, status: "sent" },
            select: { contactId: true, sentAt: true },
          });
          for (const done of completedPrev) {
            if (!done.sentAt) continue;
            const delayMs = (nextStep.delayDays * 86400000) + (nextStep.delayHours * 3600000);
            if (now.getTime() < done.sentAt.getTime() + delayMs) continue;
            const exists = await prisma.emailSend.findFirst({
              where: { campaignId: campaign.id, contactId: done.contactId, stepOrder: nextStep.stepOrder },
            });
            if (!exists) {
              await prisma.emailSend.create({
                data: { campaignId: campaign.id, contactId: done.contactId, templateId: nextStep.templateId, stepOrder: nextStep.stepOrder, status: "queued" },
              });
              totalStepsCreated++;
            }
          }
        }
      }

      // Check completion
      const queued = await prisma.emailSend.count({ where: { campaignId: campaign.id, status: "queued" } });
      if (queued === 0) {
        let pending = false;
        if (campaign.sequence && campaign.sequence.steps.length > 1) {
          const maxStep = Math.max(...campaign.sequence.steps.map(s => s.stepOrder));
          const atMax = await prisma.emailSend.count({ where: { campaignId: campaign.id, stepOrder: maxStep } });
          const step1 = await prisma.emailSend.count({ where: { campaignId: campaign.id, stepOrder: 1 } });
          pending = atMax < step1;
        }
        if (!pending) {
          await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "completed", completedAt: new Date() } });
          campaignsCompleted++;
        }
      }
    }
  }

  return NextResponse.json({
    message: `Cron: ${totalSent} sent, ${totalFailed} failed, ${totalStepsCreated} sequence steps created, ${campaignsCompleted} campaigns completed`,
    totalSent,
    totalFailed,
    totalStepsCreated,
    campaignsCompleted,
    usersProcessed: byUser.size,
  });
}
