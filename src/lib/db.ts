import { PrismaClient } from "@prisma/client";

// In der Entwicklung wuerde Next.js bei jedem Hot-Reload eine neue Verbindung
// oeffnen. Darum cachen wir den Client global.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
