import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(parseInt(searchParams.get("page") ?? "0"), 0);
  const search = searchParams.get("search") ?? "";
  const from = searchParams.get("from") ?? ""; // yyyy-MM-dd
  const to = searchParams.get("to") ?? "";

  // ระบุช่วงวันที่ → ใช้ช่วงนั้น | ไม่ระบุ → ย้อนหลังตาม days (ค่าเดิม)
  let dateFilter: { gte: Date; lte?: Date };
  let days: number | null = null;

  if (from && to) {
    dateFilter = {
      gte: new Date(`${from}T00:00:00+07:00`),
      lte: new Date(`${to}T23:59:59+07:00`),
    };
  } else {
    days = Math.min(parseInt(searchParams.get("days") ?? "7"), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);
    dateFilter = { gte: since };
  }

  const where: Prisma.AlarmLogWhereInput = {
    source: "smart",
    createdAt: dateFilter,
    ...(search ? {
      OR: [
        { deviceName: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  };

  // นับทั้งหมด + ดึงเฉพาะหน้านี้ พร้อมกัน
  const [total, rows] = await Promise.all([
    prisma.alarmLog.count({ where }),
    prisma.alarmLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        deviceName: true,
        name: true,
        alarmLevel: true,
        handleStatus: true,
        divisionName: true,
        createdAt: true,
      },
    }),
  ]);

  const data = rows.map((r) => ({ ...r, id: r.id.toString() }));

  return NextResponse.json({
    data,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
    days,
    from,
    to,
  });
}