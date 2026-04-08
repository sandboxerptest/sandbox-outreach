import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "30d";

  // Calculate date range
  const now = new Date();
  let since: Date;
  switch (range) {
    case "7d": since = new Date(now.getTime() - 7 * 86400000); break;
    case "30d": since = new Date(now.getTime() - 30 * 86400000); break;
    case "90d": since = new Date(now.getTime() - 90 * 86400000); break;
    default: since = new Date(0); // all time
  }

  // Get all sends for this user's campaigns in range
  const sends = await prisma.emailSend.findMany({
    where: {
      campaign: { createdById: userId },
      createdAt: { gte: since },
    },
    select: {
      status: true,
      sentAt: true,
      openedAt: true,
      clickedAt: true,
      campaign: { select: { type: true } },
    },
  });

  const total = sends.length;
  const sent = sends.filter(s => s.status === "sent").length;
  const failed = sends.filter(s => s.status === "failed").length;
  const bounced = sends.filter(s => s.status === "bounced").length;
  const opened = sends.filter(s => s.openedAt !== null).length;
  const clicked = sends.filter(s => s.clickedAt !== null).length;
  const delivered = sent - bounced;

  // Rates (based on sent, not total)
  const deliveredRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;
  const bounceRate = sent > 0 ? Math.round((bounced / sent) * 100) : 0;

  // By campaign type
  const types = ["customer-update", "lead-warming", "cold-outreach", "partner"];
  const byType = types.map(type => {
    const typeSends = sends.filter(s => s.campaign.type === type);
    const typeSent = typeSends.filter(s => s.status === "sent").length;
    const typeOpened = typeSends.filter(s => s.openedAt).length;
    const typeClicked = typeSends.filter(s => s.clickedAt).length;
    const typeBounced = typeSends.filter(s => s.status === "bounced").length;
    return {
      type,
      total: typeSends.length,
      sent: typeSent,
      delivered: typeSent - typeBounced,
      opened: typeOpened,
      clicked: typeClicked,
      bounced: typeBounced,
      openRate: typeSent > 0 ? Math.round((typeOpened / typeSent) * 100) : 0,
      clickRate: typeSent > 0 ? Math.round((typeClicked / typeSent) * 100) : 0,
    };
  });

  // Campaigns count
  const campaignCounts = await prisma.campaign.groupBy({
    by: ["status"],
    where: { createdById: userId },
    _count: true,
  });
  const activeCampaigns = campaignCounts.find(c => c.status === "active")?._count || 0;
  const totalCampaigns = campaignCounts.reduce((s, c) => s + c._count, 0);

  // Contact count
  const contactCount = await prisma.contact.count({ where: { createdById: userId } });

  // Recent activity
  const recentActivity = await prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, type: true, description: true, createdAt: true },
  });

  // Sends over time (daily buckets for charts)
  const dailySends: Record<string, { sent: number; opened: number; clicked: number }> = {};
  for (const s of sends) {
    if (!s.sentAt) continue;
    const day = s.sentAt.toISOString().split("T")[0];
    if (!dailySends[day]) dailySends[day] = { sent: 0, opened: 0, clicked: 0 };
    dailySends[day].sent++;
    if (s.openedAt) dailySends[day].opened++;
    if (s.clickedAt) dailySends[day].clicked++;
  }

  return NextResponse.json({
    kpis: {
      totalContacts: contactCount,
      activeCampaigns,
      totalCampaigns,
      emailsSent: sent,
      delivered,
      deliveredRate,
      openRate,
      clickRate,
      bounceRate,
      opened,
      clicked,
      failed,
      bounced,
    },
    byType,
    dailySends,
    recentActivity,
  });
}
