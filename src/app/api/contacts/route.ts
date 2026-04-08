import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { createdById: userId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search }, createdById: userId },
      { lastName: { contains: search }, createdById: userId },
      { email: { contains: search }, createdById: userId },
      { company: { contains: search }, createdById: userId },
    ];
    delete where.createdById;
  }

  const contacts = await prisma.contact.findMany({
    where: search ? { AND: [{ createdById: userId }, { OR: (where.OR as object[]) }] } : where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { firstName, lastName, email, company, title, phone, type, source, tags } = body;

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "firstName, lastName, and email are required" }, { status: 400 });
  }

  const contact = await prisma.contact.upsert({
    where: { email_createdById: { email, createdById: userId } },
    update: { firstName, lastName, company, title, phone, type, source },
    create: {
      firstName,
      lastName,
      email,
      company: company || null,
      title: title || null,
      phone: phone || null,
      type: type || "lead",
      source: source || "manual",
      tags: tags ? JSON.stringify(tags) : "[]",
      createdById: userId,
    },
  });

  return NextResponse.json({ contact });
}

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Contact ID required" }, { status: 400 });

  // Verify ownership
  const existing = await prisma.contact.findFirst({ where: { id, createdById: userId } });
  if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const body = await req.json();
  const { firstName, lastName, email, company, title, phone, type, status, leadScore, notes, tags } = body;

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
      ...(company !== undefined && { company: company || null }),
      ...(title !== undefined && { title: title || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
      ...(leadScore !== undefined && { leadScore }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(tags !== undefined && { tags: JSON.stringify(tags) }),
    },
  });

  return NextResponse.json({ contact });
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Contact ID required" }, { status: 400 });

  const existing = await prisma.contact.findFirst({ where: { id, createdById: userId } });
  if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
