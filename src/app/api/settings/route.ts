import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });

  const settings = JSON.parse(user?.settings || "{}");
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Merge with existing settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  const existing = JSON.parse(user?.settings || "{}");
  const merged = { ...existing, ...body };

  await prisma.user.update({
    where: { id: userId },
    data: { settings: JSON.stringify(merged) },
  });

  return NextResponse.json({ settings: merged });
}
