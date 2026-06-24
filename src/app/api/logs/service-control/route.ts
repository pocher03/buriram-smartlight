import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "0");
  const size = parseInt(searchParams.get("size") ?? "20");
  const days = Math.min(parseInt(searchParams.get("days") ?? "7"), 90);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [total, rows] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM service_control_logs
      WHERE occurred_at >= ${since}
        AND (username IS NULL OR username != 'Impact202309')
    `,
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT username, object_name, operate_describe,
             act_type, ip_addr, error_code, error_details, occurred_at
      FROM service_control_logs
      WHERE occurred_at >= ${since}
        AND (username IS NULL OR username != 'Impact202309')
      ORDER BY occurred_at DESC
      LIMIT ${size} OFFSET ${page * size}
    `,
  ]);

  return NextResponse.json({
    total: Number(total[0].count),
    page,
    size,
    days,
    data: rows,
  });
}