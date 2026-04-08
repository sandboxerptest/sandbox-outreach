import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contacts = [
      { firstName: "Sarah", lastName: "Chen", email: "sarah.chen@acmecorp.com", company: "Acme Corp", title: "VP Engineering", type: "customer", leadScore: 85 },
      { firstName: "Marcus", lastName: "Williams", email: "m.williams@techstart.io", company: "TechStart", title: "CTO", type: "lead", leadScore: 65 },
      { firstName: "Jessica", lastName: "Park", email: "jpark@globalfirm.com", company: "Global Firm", title: "Director of Operations", type: "lead", leadScore: 45 },
      { firstName: "David", lastName: "Mueller", email: "david@partnerco.com", company: "PartnerCo", title: "Partner Manager", type: "partner", leadScore: 70 },
      { firstName: "Rachel", lastName: "Kim", email: "rachel.kim@enterprise.com", company: "Enterprise Inc", title: "Head of Product", type: "prospect", leadScore: 30 },
      { firstName: "James", lastName: "Foster", email: "jfoster@buildright.com", company: "BuildRight", title: "CEO", type: "customer", leadScore: 90 },
      { firstName: "Emily", lastName: "Torres", email: "etorres@scaleup.co", company: "ScaleUp", title: "Marketing Lead", type: "lead", leadScore: 55 },
      { firstName: "Alex", lastName: "Nguyen", email: "alex@devshop.io", company: "DevShop", title: "Senior Developer", type: "partner", leadScore: 60 },
    ];

    for (const c of contacts) {
      await prisma.contact.upsert({
        where: { email_createdById: { email: c.email, createdById: userId } },
        update: {},
        create: { ...c, source: "seed", tags: "[]", createdById: userId },
      });
    }

    const templates = [
      {
        name: "Product Update Announcement",
        subject: "What's new at Sandbox, {{firstName}}",
        bodyHtml: "<p>Hi {{firstName}},</p><p>We've been busy building new features for {{company}}. Here's what's new:</p><ul><li><strong>Feature A</strong> — Description</li><li><strong>Feature B</strong> — Description</li></ul><p>Check it out and let us know what you think!</p><p>Best,<br>The Sandbox Team</p>",
        category: "customer-update",
      },
      {
        name: "Cold Outreach - Initial Touch",
        subject: "Quick intro, {{firstName}}",
        bodyHtml: "<p>Hi {{firstName}},</p><p>I came across {{company}} and thought there might be a fit with what we're building at Sandbox.</p><p>We help teams like yours streamline their operations and close deals faster.</p><p>Would you be open to a quick 15-minute chat this week?</p><p>Best,<br>Your Name</p>",
        category: "cold-outreach",
      },
      {
        name: "Lead Nurture - Value Add",
        subject: "Resource for {{company}}, {{firstName}}",
        bodyHtml: "<p>Hi {{firstName}},</p><p>I wanted to share something that might be useful for {{company}} as you evaluate solutions.</p><p>We put together a guide on how teams are solving [problem]. I think you'll find the section on [topic] particularly relevant.</p><p>Happy to walk through it together if you're interested.</p><p>Best,<br>Your Name</p>",
        category: "lead-warming",
      },
    ];

    for (const t of templates) {
      const exists = await prisma.template.findFirst({ where: { name: t.name, createdById: userId } });
      if (!exists) {
        await prisma.template.create({ data: { ...t, createdById: userId } });
      }
    }

    await prisma.activity.create({
      data: {
        type: "import-completed",
        description: `Demo data loaded: ${contacts.length} contacts, ${templates.length} templates`,
        userId,
      },
    });

    return NextResponse.json({
      message: "Seed data created",
      contacts: contacts.length,
      templates: templates.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Seed error:", message);
    return NextResponse.json({
      error: "Seed failed",
      detail: message,
      dbUrl: process.env.DATABASE_URL ? "set" : process.env.TURSO_DATABASE_URL ? "turso_set" : process.env.storage_TURSO_DATABASE_URL ? "storage_set" : "NOT_SET",
    }, { status: 500 });
  }
}
