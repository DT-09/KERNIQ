import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __kerniqPrisma: PrismaClient | undefined;
}

const prisma = globalThis.__kerniqPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__kerniqPrisma = prisma;

export default prisma;
