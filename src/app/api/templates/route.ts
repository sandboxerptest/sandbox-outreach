import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const where: Record<string, unknown> = { createdById: userId };
  if (category) where.category = category;

  const templates = await prisma.template.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, subject, bodyHtml, category, isShared } = body;

  if (!name || !subject) {
    return NextResponse.json({ error: "Name and subject are required" }, { status: 400 });
  }

  const template = await prisma.template.create({
    data: {
      name,
      subject,
      bodyHtml: bodyHtml || "",
      category: category || "general",
      isShared: isShared ?? true,
      createdById: userId,
    },
  });

  return NextResponse.json({ template });
}

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Template ID required" }, { status: 400 });

  const existing = await prisma.template.findFirst({ where: { id, createdById: userId } });
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const body = await req.json();
  const { name, subject, bodyHtml, category, isShared } = body;

  const template = await prisma.template.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(subject && { subject }),
      ...(bodyHtml !== undefined && { bodyHtml }),
      ...(category && { category }),
      ...(isShared !== undefined && { isShared }),
    },
  });

  return NextResponse.json({ template });
}
