import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
    res.headers.set("Set-Cookie", setSessionCookie(user.id));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Login error:", message);
    return NextResponse.json({
      error: "Login failed",
      detail: message,
      dbUrl: process.env.DATABASE_URL ? "set" : process.env.TURSO_DATABASE_URL ? "turso_set" : process.env.storage_TURSO_DATABASE_URL ? "storage_set" : "NOT_SET",
    }, { status: 500 });
  }
}
