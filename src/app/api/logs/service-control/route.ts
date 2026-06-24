import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "0");
  const size = parseInt(searchParams.get("size") ?? "20");

  const [total, rows] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM service_control_logs
    `,
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT username, object_name, operate_describe,
             act_type, ip_addr, error_code, error_details, occurred_at
      FROM service_control_logs
      ORDER BY occurred_at DESC
      LIMIT ${size} OFFSET ${page * size}
    `,
  ]);

  return NextResponse.json({
    total: Number(total[0].count),
    page,
    size,
    data: rows,
  });
}