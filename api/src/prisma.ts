import pkg from "@prisma/client";

const { PrismaClient } = pkg as unknown as { PrismaClient: new (...args: any[]) => any };

const globalForPrisma = globalThis as unknown as { prisma?: any };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  (globalForPrisma as any).prisma = prisma;
}
