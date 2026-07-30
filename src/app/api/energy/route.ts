// API สำหรับดึงข้อมูลพลังงานตามช่วงวันที่ที่ผู้ใช้เลือก
// SSR ใน page.tsx ยังคงเดิม (โหลดหน้าแรกเร็ว) — route นี้ใช้เมื่อผู้ใช้เปลี่ยนช่วงเอง
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const num = (v: number | null): number | null => (v == null ? null : v);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("mode") === "monthly" ? "monthly" : "daily";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const projectId = "buriram";

  // period เป็น string yyyy-MM-dd (daily) หรือ yyyy-MM (monthly)
  // normalize แล้วจึงเทียบแบบ string ได้ตรง
  const rows = await prisma.energyStat.findMany({
    where: {
      projectId,
      type: mode,
      ...(from && to ? { period: { gte: from, lte: to } } : {}),
    },
    orderBy: { period: "asc" },
    take: 400,
  });

const THAI_DOW = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

  const label = (p: string): string => {
    if (mode === "monthly") {
      const m = Number(p.split("-")[1]);
      return Number.isFinite(m) && m >= 1 && m <= 12 ? THAI_MONTHS[m - 1] : p;
    }
    // daily → "จ. 15/07"
    const [yy, mm, dd] = p.split("-");
    if (!yy || !mm || !dd) return p;
    const dow = THAI_DOW[new Date(`${p}T00:00:00`).getDay()];
    return `${dow} ${dd}/${mm}`;
  };

  // ปีก่อนไม่มีข้อมูลจริง (โคมเดิมไม่มี sensor) → ประมาณการจากอัตราส่วนวัตต์
  // โคมเดิม HPS 250W ÷ โคมใหม่ LED ~150W (วัดจริงจาก actp) = 1.667
  const LEGACY_RATIO = 250 / 150;

  const points = rows.map((r) => {
    const cur = num(r.energyNow);
    const dbPrev = num(r.energyPrev);
    const prev =
      dbPrev && dbPrev > 0
        ? dbPrev
        : cur != null
          ? Number((cur * LEGACY_RATIO).toFixed(1))
          : null;
    return {
      label: label(r.period),
      period: r.period,
      current: cur,
      previous: prev,
      carbon:
        cur != null && prev != null
          ? Number(((prev - cur) * 0.5).toFixed(2))
          : null,
    };
  });

  const sum = (k: "current" | "previous") =>
    points.reduce((s, p) => s + (p[k] ?? 0), 0);
  const totalNow = points.length ? sum("current") : null;
  const totalPrev = points.length ? sum("previous") : null;
  const totalSave =
    totalNow != null && totalPrev != null
      ? Number((totalPrev - totalNow).toFixed(2))
      : null;

  return NextResponse.json({ points, totalNow, totalSave, mode, from, to });
}