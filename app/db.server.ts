import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __kern iqPrisma: PrismaClient | undefined;
}

const prisma = globalThis.__kern iqPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__kern iqPrisma = prisma;

export default prisma;
