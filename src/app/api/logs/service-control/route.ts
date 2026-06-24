import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Username ที่ไม่แสดง (admin จีน)
const HIDDEN_USERS = ["Impact202309"];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "0");
  const size = parseInt(searchParams.get("size") ?? "20");
  const days = parseInt(searchParams.get("days") ?? "30");

  // จำกัดสูงสุด 90 วัน
  const limitDays = Math.min(days, 90);
  const since = new Date();
  since.setDate(since.getDate() - limitDays);

  const [total, rows] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM service_control_logs
      WHERE occurred_at >= ${since}
        AND username NOT IN (${HIDDEN_USERS.join("','")})
    `,
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT username, object_name, operate_describe,
             act_type, ip_addr, error_code, error_details, occurred_at
      FROM service_control_logs
      WHERE occurred_at >= ${since}
        AND username NOT IN ('${HIDDEN_USERS.join("','")}')
      ORDER BY occurred_at DESC
      LIMIT ${size} OFFSET ${page * size}
    `,
  ]);

  return NextResponse.json({
    total: Number(total[0].count),
    page,
    size,
    days: limitDays,
    data: rows,
  });
}