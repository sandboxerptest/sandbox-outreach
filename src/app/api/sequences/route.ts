import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sequences = await prisma.sequence.findMany({
    where: { createdById: userId },
    include: {
      steps: {
        include: { template: { select: { name: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ sequences });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, type, description, steps } = body;

  if (!name) {
    return NextResponse.json({ error: "Sequence name is required" }, { status: 400 });
  }

  const sequence = await prisma.sequence.create({
    data: {
      name,
      type: type || "cold-outreach",
      description: description || null,
      createdById: userId,
      steps: {
        create: (steps || []).map((step: { action: string; delayDays: number; delayHours: number; subject: string; bodyHtml: string; isForward: boolean }, i: number) => ({
          stepOrder: i + 1,
          action: step.action || "send-email",
          delayDays: step.delayDays || 0,
          delayHours: step.delayHours || 0,
          subject: step.subject || null,
          bodyHtml: step.bodyHtml || null,
          isForward: step.isForward || false,
        })),
      },
    },
    include: { steps: true },
  });

  return NextResponse.json({ sequence });
}

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Sequence ID required" }, { status: 400 });

  const existing = await prisma.sequence.findFirst({ where: { id, createdById: userId } });
  if (!existing) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

  const body = await req.json();
  const { name, type, description, steps } = body;

  await prisma.sequenceStep.deleteMany({ where: { sequenceId: id } });

  const sequence = await prisma.sequence.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(type && { type }),
      ...(description !== undefined && { description }),
      steps: steps
        ? {
            create: steps.map((step: { action: string; delayDays: number; delayHours: number; subject: string; bodyHtml: string; isForward: boolean }, i: number) => ({
              stepOrder: i + 1,
              action: step.action || "send-email",
              delayDays: step.delayDays || 0,
              delayHours: step.delayHours || 0,
              subject: step.subject || null,
              bodyHtml: step.bodyHtml || null,
              isForward: step.isForward || false,
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  return NextResponse.json({ sequence });
}
