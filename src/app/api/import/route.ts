import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { csv, contactType } = body;

  if (!csv) {
    return NextResponse.json({ error: "CSV data is required" }, { status: 400 });
  }

  const lines = csv.trim().split("\n");
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
  }

  const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const emailIdx = headers.indexOf("email");
  const firstNameIdx = headers.indexOf("firstname");
  const lastNameIdx = headers.indexOf("lastname");

  if (emailIdx === -1) {
    return NextResponse.json({ error: "CSV must have an 'email' column" }, { status: 400 });
  }

  let imported = 0;
  let errors = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v: string) => v.trim().replace(/^["']|["']$/g, ""));
    const email = values[emailIdx];
    if (!email || !email.includes("@")) { errors++; continue; }

    const firstName = firstNameIdx >= 0 ? values[firstNameIdx] || "Unknown" : "Unknown";
    const lastName = lastNameIdx >= 0 ? values[lastNameIdx] || "" : "";
    const companyIdx = headers.indexOf("company");
    const titleIdx = headers.indexOf("title");
    const phoneIdx = headers.indexOf("phone");

    try {
      await prisma.contact.upsert({
        where: { email_createdById: { email, createdById: userId } },
        update: { firstName, lastName, company: companyIdx >= 0 ? values[companyIdx] || null : null, title: titleIdx >= 0 ? values[titleIdx] || null : null, phone: phoneIdx >= 0 ? values[phoneIdx] || null : null, type: contactType || "lead", source: "import" },
        create: {
          firstName, lastName, email,
          company: companyIdx >= 0 ? values[companyIdx] || null : null,
          title: titleIdx >= 0 ? values[titleIdx] || null : null,
          phone: phoneIdx >= 0 ? values[phoneIdx] || null : null,
          type: contactType || "lead",
          source: "import",
          createdById: userId,
        },
      });
      imported++;
    } catch { errors++; }
  }

  await prisma.activity.create({
    data: {
      type: "import-completed",
      description: `Imported ${imported} contacts from CSV (${errors} errors)`,
      userId,
      metadata: JSON.stringify({ imported, errors, contactType }),
    },
  });

  return NextResponse.json({ imported, errors, total: lines.length - 1 });
}
