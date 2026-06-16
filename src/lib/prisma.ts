// src/lib/prisma.ts
// Prisma client singleton — กัน hot-reload สร้าง client ซ้ำใน dev
// ใช้ฝั่ง server เท่านั้น (Local API / Worker) — Frontend ห้าม import (กฎเหล็ก #4)

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
