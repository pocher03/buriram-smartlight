// src/workers/index.ts
// Worker entrypoint — แยกจาก Next.js (รันใน container ของตัวเอง)
// Sprint 2 Session A: Token Service + CRON object/page (ทุก 30 นาที)
//   - Token: refresh เชิงรุกก่อนหมดอายุ (เช็คทุกชั่วโมง)
//   - Sync: ดึง object/page → DB
// (alarm log / energy / weather จะเพิ่มใน Session B)

import cron from "node-cron";
import { ensureFreshToken } from "./token-service";
import { syncObjects } from "./jobs/sync-objects";
import { SYNC_CRON, TOKEN_CRON } from "./lib/config";
import { prisma } from "../lib/prisma";

const TZ = "Asia/Bangkok";

// กันงานซ้อน (ถ้ารอบก่อนยังไม่เสร็จ ข้ามรอบนี้)
let syncing = false;
async function runSync(reason: string) {
  if (syncing) {
    console.warn(`[worker] ข้าม sync (${reason}) — รอบก่อนยังทำงานอยู่`);
    return;
  }
  syncing = true;
  const t0 = Date.now();
  try {
    const r = await syncObjects();
    console.log(
      `[worker] sync เสร็จ (${reason}) — scanned=${r.scanned} lamps=${r.lamps} snapshots=${r.snapshots} ใช้เวลา ${Date.now() - t0}ms`
    );
  } catch (e) {
    console.error(`[worker] sync ล้มเหลว (${reason}):`, (e as Error).message);
  } finally {
    syncing = false;
  }
}

async function main() {
  console.log("[worker] Buriram SmartLight worker เริ่มทำงาน");
  console.log(`[worker] schedule — token: "${TOKEN_CRON}" · sync: "${SYNC_CRON}" (TZ ${TZ})`);

  // รันรอบแรกตอน startup (เติมข้อมูลทันที ไม่ต้องรอ cron รอบแรก)
  try {
    await ensureFreshToken();
  } catch (e) {
    console.error("[worker] เตรียม token ครั้งแรกล้มเหลว:", (e as Error).message);
  }
  await runSync("startup");

  // Token: refresh เชิงรุกก่อนหมดอายุ
  cron.schedule(
    TOKEN_CRON,
    () => {
      ensureFreshToken().catch((e) =>
        console.error("[worker] ensureFreshToken ล้มเหลว:", (e as Error).message)
      );
    },
    { timezone: TZ }
  );

  // Sync object/page ทุก 30 นาที
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
