// src/workers/index.ts
// Worker entrypoint — แยกจาก Next.js (รันใน container ของตัวเอง)
// Sprint 2 Session B: pipeline ครบ — ทุก 30 นาที ดึง 5 แหล่ง → DB
//   ลำดับ (master plan ข้อ 2): token → kpi → objects → alarms (+backfill พิกัด) → energy → weather
//   - Token: refresh เชิงรุกก่อนหมดอายุ (เช็คทุกชั่วโมง)
//   - แต่ละ job ห่อ try/catch แยก — job เดียวล้มไม่ล้มทั้งรอบ

import cron from "node-cron";
import { ensureFreshToken } from "./token-service";
import { syncKpi } from "./jobs/sync-kpi";
import { syncObjects } from "./jobs/sync-objects";
import { syncAlarms } from "./jobs/sync-alarms";
import { syncEnergy } from "./jobs/sync-energy";
import { syncWeather } from "./jobs/sync-weather";
import { SYNC_CRON, TOKEN_CRON } from "./lib/config";
import { prisma } from "../lib/prisma";
import { syncServiceControlLog } from "./jobs/sync-service-control-log";

// เพิ่มใน cron schedule เดิม เช่น
cron.schedule("*/30 * * * *", async () => {
  await syncServiceControlLog();
});

const TZ = "Asia/Bangkok";

// แต่ละ step ห่อแยก — ล้มทีละ job ไม่ล้มทั้งรอบ
async function step(name: string, fn: () => Promise<unknown>): Promise<void> {
  const t0 = Date.now();
  try {
    await fn();
    console.log(`[worker] ✓ ${name} (${Date.now() - t0}ms)`);
  } catch (e) {
    console.error(`[worker] ✗ ${name} ล้มเหลว: ${(e as Error).message}`);
  }
}

// กันงานซ้อน (ถ้ารอบก่อนยังไม่เสร็จ ข้ามรอบนี้)
let syncing = false;
async function runSync(reason: string) {
  if (syncing) {
    console.warn(`[worker] ข้าม sync (${reason}) — รอบก่อนยังทำงานอยู่`);
    return;
  }
  syncing = true;
  const t0 = Date.now();
  console.log(`[worker] เริ่มรอบ sync (${reason})`);
  try {
    // token ต้องสดก่อนยิงทุก endpoint
    await step("token", () => ensureFreshToken());
    await step("kpi", () => syncKpi());
    await step("objects", () => syncObjects());
    await step("alarms", () => syncAlarms()); // รวม backfill พิกัด → devices
    await step("energy", () => syncEnergy());
    await step("weather", () => syncWeather());
  } finally {
    syncing = false;
    console.log(`[worker] จบรอบ sync (${reason}) ใช้เวลา ${Date.now() - t0}ms`);
  }
}

async function main() {
  console.log("[worker] Buriram SmartLight worker เริ่มทำงาน");
  console.log(`[worker] schedule — token: "${TOKEN_CRON}" · sync: "${SYNC_CRON}" (TZ ${TZ})`);

  // รันรอบแรกตอน startup (เติมข้อมูลทันที ไม่ต้องรอ cron รอบแรก)
  await runSync("startup");

  // Token: refresh เชิงรุกก่อนหมดอายุ (เผื่อรอบ sync ห่างกว่า 1 ชม.)
  cron.schedule(
    TOKEN_CRON,
    () => {
      ensureFreshToken().catch((e) =>
        console.error("[worker] ensureFreshToken ล้มเหลว:", (e as Error).message)
      );
    },
    { timezone: TZ }
  );

  // Pipeline เต็มรูปแบบ ทุก 30 นาที
  cron.schedule(SYNC_CRON, () => void runSync("cron"), { timezone: TZ });

  const shutdown = async (signal: string) => {
    console.log(`[worker] ได้รับสัญญาณ ${signal} — กำลังปิดการทำงาน`);
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((e) => {
  console.error("[worker] fatal:", e);
  process.exit(1);
});
