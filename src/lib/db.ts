import { PrismaClient } from "@/generated/prisma";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getTursoUrl(): string {
  // Vercel Turso integration may use various prefixed names
  return (
    process.env.TURSO_DATABASE_URL ||
    process.env.storage_TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ""
  );
}

function getTursoToken(): string {
  return (
    process.env.TURSO_AUTH_TOKEN ||
    process.env.storage_TURSO_AUTH_TOKEN ||
    process.env.DATABASE_AUTH_TOKEN ||
    ""
  );
}

function buildPrisma() {
  const url = getTursoUrl();
  const authToken = getTursoToken();

  // If using Turso (libsql:// or https://), use the libsql adapter
  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    const client = createClient({ url, authToken });
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
