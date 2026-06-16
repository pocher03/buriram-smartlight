// src/workers/jobs/sync-alarms.ts
// CRON: Delta Sync log ฮาร์ดแวร์ /mm/api/internal/alarm/history/pagelist
//       + backfill พิกัดจริงจาก alarm log → devices.lat/lng
//
// จุดพลาดบ่อย (CLAUDE.md):
//  - Alarm = Delta Sync: อย่า wipe & replace; fetch หน้า 0 → เจอ createdAt ≤ lastSync ให้ break
//    → insert เฉพาะใหม่ (กัน insert ซ้ำด้วย unique rulrAlarmId)
//  - createdAtStr เป็น UTC ไม่มี suffix → parseUTC เติม Z
//  - alarm_logs เป็น APPEND-ONLY: ใช้ createMany skipDuplicates เท่านั้น (ห้าม update/delete)
//  - พิกัดจริงอยู่ใน alarm log (longitude/latitude) ไม่ใช่ object/page → backfill ต้นที่ยังไม่มีพิกัด

import { prisma } from "../../lib/prisma";
import { rulrGet } from "../lib/rulr-api";
import { getRulrConfig, PROJECT_ID } from "../lib/config";
import { parseUTC, safeNum } from "../../lib/null-safe";

type AlarmLevel = "crit" | "warn" | "info" | "ok";
type HandleStatus = "pending" | "processing" | "done";

interface AlarmItem {
  id: number;
  deviceName: string | null;
  name: string | null;
  alarmLevel: number | null; // 0=info(Reminder) 1=warn 2=crit
  handleStatus: number | null; // 0=pending 1=processing 2=done
  createdAtStr: string | null;
  divisionName: string | null;
  longitude: number | null;
  latitude: number | null;
}
interface AlarmPage {
  pageTotal: number;
  startPage: number;
  pageSize: number;
  pageData: AlarmItem[];
}

const PAGE_SIZE = 100;
// บันทึก initial sync ไม่ดึงทั้ง 2,700 รายการ — จำกัดหน้าครั้งแรก (~ล่าสุด 1,000 รายการ)
const MAX_PAGES = 10;

const toLevel = (n: number | null): AlarmLevel =>
  n === 2 ? "crit" : n === 1 ? "warn" : "info";
const toHandle = (n: number | null): HandleStatus =>
  n === 2 ? "done" : n === 1 ? "processing" : "pending";

export async function syncAlarms(): Promise<{ inserted: number; backfilled: number }> {
  const cfg = getRulrConfig();

  // lastSync = createdAt ล่าสุดที่เก็บไว้ (delta sync)
  const latest = await prisma.alarmLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const lastSync = latest?.createdAt ?? null;

  const fresh: AlarmItem[] = [];
  let stop = false;

  for (let page = 0; page < MAX_PAGES && !stop; page++) {
    const data = await rulrGet<AlarmPage>(
      `/mm/api/internal/alarm/history/pagelist?DivisionId=${cfg.divisionId}&Page=${page}&Size=${PAGE_SIZE}`
    );
    const rows = data.pageData ?? [];
    if (rows.length === 0) break;

    for (const r of rows) {
      const created = parseUTC(r.createdAtStr);
      // เจอรายการเก่ากว่า/เท่ากับ lastSync → หยุด (รายการเรียงใหม่→เก่า)
      if (lastSync && created && created.getTime() <= lastSync.getTime()) {
        stop = true;
        break;
      }
      fresh.push(r);
    }

    if (rows.length < PAGE_SIZE) break;
    if (rows.length >= (data.pageTotal ?? rows.length)) break;
  }

  // insert เฉพาะใหม่ — unique rulrAlarmId กัน insert ซ้ำ (append-only)
  let inserted = 0;
  if (fresh.length > 0) {
    const res = await prisma.alarmLog.createMany({
      data: fresh
        .map((r) => {
          const created = parseUTC(r.createdAtStr);
          if (created == null) return null;
          return {
            rulrAlarmId: BigInt(r.id),
            deviceName: r.deviceName ?? "--",
            name: r.name ?? "--",
            alarmLevel: toLevel(r.alarmLevel),
            handleStatus: toHandle(r.handleStatus),
            divisionName: r.divisionName ?? null,
            longitude: safeNum(r.longitude),
            latitude: safeNum(r.latitude),
            createdAt: created,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
      skipDuplicates: true,
    });
    inserted = res.count;
  }

  // backfill พิกัดจริงเข้า devices (เฉพาะต้นที่ยังไม่มีพิกัด)
  // ใช้พิกัดล่าสุดต่อ deviceName จากชุดที่เพิ่งดึงมา
  const coordByName = new Map<string, { lat: number; lng: number }>();
  for (const r of fresh) {
    const lat = safeNum(r.latitude);
    const lng = safeNum(r.longitude);
    if (r.deviceName && lat != null && lng != null && lat !== 0 && lng !== 0) {
      if (!coordByName.has(r.deviceName)) coordByName.set(r.deviceName, { lat, lng });
    }
  }

  let backfilled = 0;
  for (const [name, { lat, lng }] of Array.from(coordByName.entries())) {
    const r = await prisma.device.updateMany({
      where: { name, projectId: PROJECT_ID, lat: null },
      data: { lat, lng, locationSource: "alarm" },
    });
    backfilled += r.count;
  }

  console.log(
    `[sync-alarms] new=${inserted} backfilled พิกัด=${backfilled} (lastSync=${lastSync?.toISOString() ?? "ครั้งแรก"})`
  );
  return { inserted, backfilled };
}
