import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "0");
  const size = parseInt(searchParams.get("size") ?? "20");
  const days = Math.min(parseInt(searchParams.get("days") ?? "7"), 90);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const search = searchParams.get("search") ?? "";

  // กรอง: ในช่วงเวลา + ไม่เอา account admin จีน (Impact202309)
  const where: Prisma.ServiceControlLogWhereInput = {
    occurredAt: { gte: since },
    NOT: { username: "Impact202309" },
    ...(search ? {
      OR: [
        { objectName: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { operateDescribe: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.serviceControlLog.count({ where }),
    prisma.serviceControlLog.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: page * size,
      take: size,
      select: {
        username: true,
        objectName: true,
        operateDescribe: true,
        actType: true,
        ipAddr: true,
        errorCode: true,
        errorDetails: true,
        occurredAt: true,
      },
    }),
  ]);

  // map camelCase → snake_case ให้ตรงกับที่ frontend ใช้อยู่
  const data = rows.map((r) => ({
    username: r.username,
    object_name: r.objectName,
    operate_describe: r.operateDescribe,
    act_type: r.actType,
    ip_addr: r.ipAddr,
    error_code: r.errorCode,
    error_details: r.errorDetails,
    occurred_at: r.occurredAt,
  }));

  return NextResponse.json({ total, page, size, days, data });
}