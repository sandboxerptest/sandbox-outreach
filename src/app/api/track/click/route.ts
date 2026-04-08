import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sendId = searchParams.get("id");
  const url = searchParams.get("url");

  if (sendId) {
    try {
      // Record the first click
      await prisma.emailSend.updateMany({
        where: { id: sendId, clickedAt: null },
        data: { clickedAt: new Date() },
      });
      // Also mark as opened if not already (clicking implies opening)
      await prisma.emailSend.updateMany({
        where: { id: sendId, openedAt: null },
        data: { openedAt: new Date() },
      });
    } catch {
      // Silently fail
    }
  }

  // Redirect to the original URL
  const destination = url || "/";
  return NextResponse.redirect(destination, { status: 302 });
}
