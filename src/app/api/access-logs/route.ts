// GET /api/access-logs — บันทึกการเข้าใช้งานระบบ (ภาพรวม)
// admin: เห็นเฉพาะโครงการตัวเอง (activeProjectId) | super_admin (isCrossProject): เห็นทุกโครงการ
// READ-ONLY, APPEND-ONLY table (กฎเหล็ก #7 / TOR ๔.๗.๒–๔.๗.๓)
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

  // RBAC: ไม่ใช่ super_admin (isCrossProject) → จำกัดเฉพาะโครงการของตัวเอง
  const crossProject = session.user.isCrossProject === true;
  const activeProjectId = session.user.activeProjectId ?? null;
  if (!crossProject && !activeProjectId) {
    return NextResponse.json({ items: [] });
  }

  const rows = await prisma.accessLog.findMany({
    where: {
      ...(crossProject ? {} : { activeProjectId }),
      ...(gte ? { createdAt: { gte } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      username: true,
      action: true,
      activeProjectId: true,
      ip: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      username: r.username,
      action: r.action,
      activeProjectId: r.activeProjectId,
      ip: r.ip,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
