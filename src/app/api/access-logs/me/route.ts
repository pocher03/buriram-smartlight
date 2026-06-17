// GET /api/access-logs/me — ประวัติ session ของผู้ใช้ที่ล็อกอินอยู่
// อ่าน access_logs WHERE userId = ตัวเอง (READ-ONLY, APPEND-ONLY table)
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rangeToGte } from "@/lib/log-range";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const gte = rangeToGte(searchParams.get("range"));

  const rows = await prisma.accessLog.findMany({
    where: {
      userId: session.user.id,
      ...(gte ? { createdAt: { gte } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      action: true,
      activeProjectId: true,
      ip: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      action: r.action,
      activeProjectId: r.activeProjectId,
      ip: r.ip,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
