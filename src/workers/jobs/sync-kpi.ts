// src/workers/jobs/sync-kpi.ts
// CRON: ดึงภาพรวม KPI จาก /mm/api/division/pandect/info → kpi_snapshots (singleton)
// เก็บเฉพาะค่าที่ derive จาก telemetry ไม่ได้ (แผนเปิด/ปิดไฟ + ยอดรวมต้นทาง)
//
// จุดพลาดบ่อย (CLAUDE.md):
//  - autualEnergy เป็น String → parseFloat
//  - openTime/closeTime อยู่ใน openLightPlanDTO

import { prisma } from "../../lib/prisma";
import { rulrPost } from "../lib/rulr-api";
import { getRulrConfig, PROJECT_ID } from "../lib/config";
import { safeNum } from "../../lib/null-safe";

interface OpenLightPlan {
  openTime: string | null;
  closeTime: string | null;
}
interface PandectInfo {
  lightTotal: number | null;
  lightOnlineNum: number | null;
  lightSwitchNum: number | null;
  alarmNum: number | null;
  processAlarmNum: number | null;
  dealAlarmNum: number | null;
  alarmTotal: number | null;
  autualEnergy: string | null;
  openLightPlanDTO: OpenLightPlan | null;
}

export async function syncKpi(): Promise<void> {
  const cfg = getRulrConfig();
  const info = await rulrPost<PandectInfo>("/mm/api/division/pandect/info", {
    divisionId: cfg.divisionId,
  });

  const data = {
    lightTotal: info.lightTotal ?? null,
    lightOnlineNum: info.lightOnlineNum ?? null,
    lightSwitchNum: info.lightSwitchNum ?? null,
    alarmNum: info.alarmNum ?? null,
    processAlarmNum: info.processAlarmNum ?? null,
    dealAlarmNum: info.dealAlarmNum ?? null,
    alarmTotal: info.alarmTotal ?? null,
    autualEnergy: safeNum(info.autualEnergy ?? null),
    openTime: info.openLightPlanDTO?.openTime ?? null,
    closeTime: info.openLightPlanDTO?.closeTime ?? null,
  };

  await prisma.kpiSnapshot.upsert({
    where: { projectId: PROJECT_ID },
    create: { projectId: PROJECT_ID, ...data },
    update: data,
  });

  console.log(
    `[sync-kpi] total=${data.lightTotal} online=${data.lightOnlineNum} alarm=${data.alarmNum} energy=${data.autualEnergy}`
  );
}
