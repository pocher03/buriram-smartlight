import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AlarmLevel, HandleStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const days = Math.min(parseInt(searchParams.get("days") ?? "7"), 90);
  const search = searchParams.get("search") ?? "";

  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.alarmLog.findMany({
    where: {
      createdAt: { gte: since },
      ...(search ? {
        OR: [
          { deviceName: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true,
      deviceName: true,
      name: true,
      alarmLevel: true,
      handleStatus: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: rows, days, total: rows.length });
}