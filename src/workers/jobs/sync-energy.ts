// src/workers/jobs/sync-energy.ts
// CRON: สถิติพลังงาน /mm/api/division/pandect/save/energy (type 0 รายวัน, type 1 รายเดือน)
//
// จุดพลาดบ่อย (CLAUDE.md / master plan ข้อ 2.4):
//  - Response ซ้อน 2 ชั้น: เข้าถึงผ่าน response.data.data (rulrPost คืน data ชั้นแรกให้แล้ว → อ่าน .data อีกชั้น)
//  - ทุกค่าเป็น String → parseFloat เสมอ
//  - ค่าติดลบ: เก็บค่าดิบลง DB (แสดงผลค่อย Math.abs ที่ฝั่งอ่าน)
//  - type 0 รายวัน: time = String วันที่ ("2026-06-01")
//  - type 1 รายเดือน: time = Integer เดือน (ไม่มีปี) → ประกอบ `${year}-${pad(month)}`
//
// คอลัมน์: firColumn = ปีก่อน (energyPrev), secColumn = ปีนี้ (energyNow), value = reduction (ดิบ)

import { prisma } from "../../lib/prisma";
import { rulrPost } from "../lib/rulr-api";
import { getRulrConfig, PROJECT_ID } from "../lib/config";
import { safeNum } from "../../lib/null-safe";

interface ReductionItem {
  time: string | number;
  firColumn: string | null;
  secColumn: string | null;
  value: string | null;
}
// ⚠️ ซ้อน 2 ชั้น — rulrPost คืนชั้นแรก (data) แล้ว เหลืออ่าน .data ชั้นในเอง
interface EnergyInner {
  errorCode: number;
  errorDesc: string;
  data: {
    totalReduction: string | null;
    totalSaveEnergy: string | null;
    reductionList: ReductionItem[];
  };
}

async function syncOne(type: 0 | 1, year: number): Promise<number> {
  const cfg = getRulrConfig();
  const outer = await rulrPost<EnergyInner>("/mm/api/division/pandect/save/energy", {
    divisionId: cfg.divisionId,
    type,
    year,
  });

  const inner = outer?.data;
  const list = inner?.reductionList ?? [];
  const energyType = type === 0 ? "daily" : "monthly";

  let n = 0;
  for (const row of list) {
    const period =
      type === 0
        ? String(row.time) // "2026-06-01"
        : `${year}-${String(row.time).padStart(2, "0")}`; // "2026-06"

    const energyPrev = safeNum(row.firColumn); // ปีก่อน
    const energyNow = safeNum(row.secColumn); // ปีนี้
    const reduction = safeNum(row.value); // ดิบ (อาจติดลบ)

    const data = { energyNow, energyPrev, reduction, saveEnergy: null as number | null };
    await prisma.energyStat.upsert({
      where: {
        projectId_type_period: { projectId: PROJECT_ID, type: energyType, period },
      },
      create: { projectId: PROJECT_ID, type: energyType, period, ...data },
      update: data,
    });
    n++;
  }
  return n;
}

export async function syncEnergy(): Promise<{ daily: number; monthly: number }> {
  const year = new Date().getFullYear();
  const daily = await syncOne(0, year);
  const monthly = await syncOne(1, year);
  console.log(`[sync-energy] daily=${daily} monthly=${monthly} (ปี ${year})`);
  return { daily, monthly };
}
