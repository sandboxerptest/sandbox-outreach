import { PrismaClient } from "@/generated/prisma";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildPrisma() {
  const url = process.env.DATABASE_URL || "";

  // If using Turso (libsql:// or https://), use the libsql adapter
  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    const client = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = new PrismaLibSQL(client as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  }

  // Local file-based SQLite
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || buildPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
