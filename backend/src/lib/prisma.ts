/**
 * Prisma Client Singleton
 *
 * Next.js reloads modules on every request in development, which would
 * otherwise create a new PrismaClient (and a new DB connection pool) per
 * request. We cache the instance on `globalThis` in development so hot
 * reloads reuse the same client. In production a single instance is
 * created per server process, which is the correct behavior anyway.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
