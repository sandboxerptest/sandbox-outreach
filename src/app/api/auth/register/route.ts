import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role: "admin",
      },
    });

    const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
    res.headers.set("Set-Cookie", setSessionCookie(user.id));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const code = err instanceof Error ? (err as { code?: string }).code : undefined;
    console.error("Register error:", { message, code, stack: err instanceof Error ? err.stack : undefined });
    return NextResponse.json({
      error: "Registration failed",
      detail: message,
      code,
      dbUrl: process.env.DATABASE_URL ? "set" : process.env.TURSO_DATABASE_URL ? "turso_set" : process.env.storage_TURSO_DATABASE_URL ? "storage_set" : "NOT_SET",
    }, { status: 500 });
  }
}
