// src/workers/jobs/smart-alarm.ts
// วิเคราะห์การแจ้งเตือนเองจาก telemetry แทนการดึง alarm จาก RULR
//
// ๔ ชั้นการตรวจจับ (แต่ละชั้นจับเคสที่ชั้นอื่นมองไม่เห็น):
//   [1] ไฟดับทั้งระบบผิดเวลา  — peer comparison ตาบอดเมื่อทุกต้นดับพร้อมกัน
//   [2] อุปกรณ์ออฟไลน์        — สายขาด / ถูกขโมย / ไฟดับเฉพาะจุด
//   [3] ออนไลน์แต่ไฟไม่ติด    — controller ทำงาน แต่โคมไม่กินไฟ
//   [4] กำลังไฟผิดปกติ        — โคมยังกินไฟ แต่น้อย/มากกว่าที่ควร (หลอดเสีย/driver เสื่อม)
//
// ทุกชั้นยืนยัน 3 รอบ (~90 นาที) ก่อนสร้าง alarm จริง — กัน false alarm จาก
// สัญญาณ NB-IoT ที่แกว่งเป็นปกติ และช่วง transition ที่ไฟทยอยติด/ดับ
//
// เมื่ออุปกรณ์กลับมาปกติ ระบบปิด alarm ให้อัตโนมัติ (แก้เฉพาะสถานะการจัดการ
// ไม่แตะข้อมูลเหตุการณ์ — append-only ยังคงอยู่)

import { prisma } from "../../lib/prisma";
import { DEVICE_PROFILES, type DeviceType } from "../../lib/device-profiles";

// ── ค่าคงที่ ────────────────────────────────────────────────
const REQUIRED_CHECKS = 3; // ต้องผิดปกติต่อเนื่องกี่รอบถึงจะแจ้งเตือน
const MIN_GROUP_SIZE = 2;  // กลุ่มที่มีต้นเดียว เทียบกับเพื่อนไม่ได้

// buffer รอบเวลาเปิด/ปิดไฟ — ข้อมูลจริงพบว่าไฟทยอยติด/ดับใช้เวลาราว 1 ชม.
const OPEN_BUFFER_MIN = 45;
const CLOSE_BUFFER_MIN = 15;

// ใช้เมื่อ RULR ไม่ส่งเวลาเปิด/ปิดมา
const FALLBACK_OPEN = "18:40:00";
const FALLBACK_CLOSE = "05:48:00";

// เกณฑ์ตัดสิน "ไฟติด" — ข้อมูลจริงพบว่าโคมที่ติดกินไฟต่ำสุด 44.4 W
// ตั้ง 20 W ไว้กว้าง กันค่า standby/noise ของ driver
const LAMP_ON_POWER_W = 20;

// กำลังไฟอ้างอิงที่ความสว่างเต็ม 100% (ข้อมูลจริง 3 วัน เฉลี่ย 148.6 W)
const RATED_POWER_W = 150;
// เบี่ยงเบนที่ยอมรับได้ — ข้อมูลจริงกระจายไม่เกิน 11% ตั้ง 35% จึงห่างพอ
const POWER_DEVIATION_LIMIT = 0.35;
// ความสว่างต่ำกว่านี้ ค่าที่คาดจะน้อยจนเทียบเปอร์เซ็นต์ไม่มีความหมาย
const MIN_BRIGHTNESS_FOR_CHECK = 20;

const SYSTEM_ALARM_TYPE = "system_blackout";
const DEVICE_ALARM_TYPE = "offline";
const LIGHT_ALARM_TYPE = "light_failure";
const POWER_ALARM_TYPE = "power_anomaly";

interface DeviceState {
  id: string;
  name: string;
  deviceType: DeviceType;
  divisionName: string | null;
  lat: number | null;
  lng: number | null;
  isOnline: boolean;
  actp: number | null;
  brightness: number | null;
}

// ── เวลา ────────────────────────────────────────────────────

/** "18:40:00" → นาทีนับจากเที่ยงคืน */
function toMinutes(hhmmss: string | null): number | null {
  if (!hhmmss) return null;
  const [h, m] = hhmmss.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** นาทีปัจจุบันตามเวลาไทย (server อาจตั้งเป็น UTC) */
function nowMinutesBangkok(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/**
 * ตอนนี้อยู่ในช่วงที่ "ไฟควรติดครบแล้ว" หรือไม่
 * window คร่อมเที่ยงคืน (18:40 → 05:48) จึงต้องเช็คแบบข้ามวัน
 */
async function isInsideStableWindow(): Promise<{ inside: boolean; label: string }> {
  const snap = await prisma.kpiSnapshot.findFirst({
    select: { openTime: true, closeTime: true },
  });

  const open = toMinutes(snap?.openTime ?? null) ?? toMinutes(FALLBACK_OPEN)!;
  const close = toMinutes(snap?.closeTime ?? null) ?? toMinutes(FALLBACK_CLOSE)!;

  // หดขอบเข้ามาเพื่อเลี่ยงช่วง transition ที่สถานะยังไม่นิ่ง
  const start = (open + OPEN_BUFFER_MIN) % 1440;
  const end = (close - CLOSE_BUFFER_MIN + 1440) % 1440;

  const now = nowMinutesBangkok();
  const inside = start > end ? now >= start || now <= end : now >= start && now <= end;

  const fmt = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  return { inside, label: `${fmt(start)}-${fmt(end)}` };
}

// ── ดึงข้อมูล ───────────────────────────────────────────────

/** สถานะล่าสุดของทุกอุปกรณ์ (telemetry แถวใหม่สุดของแต่ละต้น) */
async function loadDeviceStates(): Promise<DeviceState[]> {
  const rows = await prisma.device.findMany({
    select: {
      id: true,
      name: true,
      deviceType: true,
      lat: true,
      lng: true,
      zone: { select: { name: true } },
      telemetry: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { onlineStatus: true, actp: true, brightness: true },
      },
    },
  });

  return rows
    .filter((d) => d.telemetry.length > 0) // ยังไม่เคยติดต่อได้เลย → ข้าม
    .map((d) => ({
      id: d.id,
      name: d.name,
      deviceType: d.deviceType,
      divisionName: d.zone?.name ?? null,
      lat: d.lat,
      lng: d.lng,
      isOnline: d.telemetry[0].onlineStatus === 1,
      actp: d.telemetry[0].actp,
      brightness: d.telemetry[0].brightness,
    }));
}

// ── ตรรกะตรวจจับ ───────────────────────────────────────────

/**
 * [ชั้น 2] อุปกรณ์ที่ออฟไลน์ต่างจากเพื่อนในกลุ่ม
 * แยกกลุ่มตามชนิดอุปกรณ์ เพราะ AC กับ Solar มีพฤติกรรมต่างกันสิ้นเชิง
 */
function findOfflineAnomalies(devices: DeviceState[]): Map<string, string> {
  const abnormal = new Map<string, string>();

  const groups = new Map<DeviceType, DeviceState[]>();
  for (const d of devices) {
    const list = groups.get(d.deviceType) ?? [];
    list.push(d);
    groups.set(d.deviceType, list);
  }

  for (const [type, group] of Array.from(groups.entries())) {
    const profile = DEVICE_PROFILES[type];
    const offline = group.filter((d) => !d.isOnline);

    // Solar มีแบตเตอรี่ ควรออนไลน์ตลอด → ออฟไลน์เมื่อไหร่ก็ผิดปกติ
    if (profile.expectAlwaysOnline) {
      for (const d of offline) {
        abnormal.set(d.id, "ออฟไลน์ผิดปกติ (อุปกรณ์ควรออนไลน์ตลอดเวลา)");
      }
      continue;
    }

    // AC เทียบกับกลุ่ม
    if (group.length < MIN_GROUP_SIZE) continue;
    if (offline.length === 0) continue;            // ทุกต้นออนไลน์ → ปกติ
    if (offline.length === group.length) continue; // ทุกต้นออฟไลน์ → ชั้น 1 จัดการ

    const ratio = offline.length / group.length;
    const reason =
      ratio >= 0.5
        ? `ออฟไลน์พร้อมกัน ${offline.length}/${group.length} ต้น (อาจเป็นปัญหาระดับระบบ)`
        : `ออฟไลน์ขณะที่อุปกรณ์อื่นทำงานปกติ (${offline.length}/${group.length} ต้น)`;

    for (const d of offline) abnormal.set(d.id, reason);
  }

  return abnormal;
}

/**
 * [ชั้น 3] ออนไลน์แต่ไฟไม่ติด
 *
 * เทียบเฉพาะในกลุ่มที่ออนไลน์ด้วยกัน — ไม่ต้องรู้เวลาเปิด/ปิดไฟ
 *   กลางวัน  ทุกต้นไฟดับเหมือนกัน → ไม่มีใครต่าง → ไม่แจ้งเตือน
 *   กลางคืน  ทุกต้นไฟติด → ต้นที่ไม่ติดต่างจากพวกทันที
 *   ฝนตกกลางวัน (ไฟติดเอง) → ครอบคลุมด้วย เพราะไม่ผูกกับเวลา
 */
function findLightFailures(devices: DeviceState[]): Map<string, string> {
  const failures = new Map<string, string>();

  const groups = new Map<DeviceType, DeviceState[]>();
  for (const d of devices) {
    if (!d.isOnline) continue;    // ออฟไลน์ → ชั้น 2 รับผิดชอบ
    if (d.actp == null) continue; // ไม่มีค่าวัด → ตัดสินไม่ได้
    const list = groups.get(d.deviceType) ?? [];
    list.push(d);
    groups.set(d.deviceType, list);
  }

  for (const [, group] of Array.from(groups.entries())) {
    if (group.length < MIN_GROUP_SIZE) continue;

    const lit = group.filter((d) => (d.actp ?? 0) > LAMP_ON_POWER_W);
    const unlit = group.filter((d) => (d.actp ?? 0) <= LAMP_ON_POWER_W);

    if (unlit.length === 0) continue; // ทุกต้นไฟติด → ปกติ
    if (lit.length === 0) continue;   // ทุกต้นไฟดับ → ปกติ (นอกเวลาใช้งาน)

    for (const d of unlit) {
      failures.set(
        d.id,
        `ออนไลน์แต่ไฟไม่ติด (กำลังไฟ ${d.actp ?? 0} W) ` +
          `ขณะที่อีก ${lit.length}/${group.length} ต้นทำงานปกติ`
      );
    }
  }

  return failures;
}

/**
 * [ชั้น 4] ไฟติดแต่กำลังไฟผิดปกติ
 *
 * จับเคสที่ชั้น 3 มองไม่เห็น — หลอดเสียบางส่วน / driver เสื่อม
 * โคมยังกินไฟอยู่ (จึงนับว่า "ติด") แต่กินน้อย/มากกว่าที่ควรอย่างมีนัยสำคัญ
 *
 * ค่าที่คาด = 150 W × (ความสว่างที่สั่ง ÷ 100)
 * ข้อมูลจริง 3 วัน: ที่ความสว่างเดียวกัน โคม 24-26 ต้นกินไฟต่างกันไม่เกิน 11%
 */
function findPowerAnomalies(devices: DeviceState[]): Map<string, string> {
  const anomalies = new Map<string, string>();

  for (const d of devices) {
    if (!d.isOnline) continue;
    if (d.actp == null || d.brightness == null) continue;
    if (d.brightness < MIN_BRIGHTNESS_FOR_CHECK) continue; // หรี่ต่ำมาก เทียบไม่ได้
    if (d.actp <= LAMP_ON_POWER_W) continue;               // ไฟไม่ติด → ชั้น 3 รับผิดชอบ

    const expected = RATED_POWER_W * (d.brightness / 100);
    const deviation = Math.abs(d.actp - expected) / expected;

    if (deviation > POWER_DEVIATION_LIMIT) {
      const pct = Math.round(deviation * 100);
      const dir = d.actp < expected ? "ต่ำกว่า" : "สูงกว่า";
      anomalies.set(
        d.id,
        `กำลังไฟ${dir}ค่าที่คาด ${pct}% ` +
          `(วัดได้ ${d.actp} W · ที่ความสว่าง ${d.brightness}% ควรอยู่ราว ${expected.toFixed(0)} W)`
      );
    }
  }

  return anomalies;
}

// ── สร้าง alarm ─────────────────────────────────────────────

async function raiseAlarm(opts: {
  deviceName: string;
  name: string;
  alarmType: string;
  divisionName: string | null;
  lat: number | null;
  lng: number | null;
  occurredAt: Date;
}) {
  await prisma.alarmLog.create({
    data: {
      source: "smart",
      alarmType: opts.alarmType,
      deviceName: opts.deviceName,
      name: opts.name,
      alarmLevel: "crit",
      handleStatus: "pending",
      divisionName: opts.divisionName,
      latitude: opts.lat,
      longitude: opts.lng,
      createdAt: opts.occurredAt, // เวลาที่ตรวจพบครั้งแรก ไม่ใช่เวลาที่ยืนยัน
    },
  });
}

/**
 * นับรอบยืนยัน แล้วสร้าง alarm เมื่อครบ — ใช้ร่วมกันทุกชั้นที่ตรวจรายอุปกรณ์
 * คืนจำนวน alarm ที่สร้าง และจำนวน pending ที่ยกเลิก
 */
async function processDeviceAnomalies(opts: {
  found: Map<string, string>;
  byId: Map<string, DeviceState>;
  alarmType: string;
  alarmName: string;
  now: Date;
}): Promise<{ raised: number; cleared: number }> {
  const { found, byId, alarmType, alarmName, now } = opts;
  let raised = 0;
  let cleared = 0;

  const pendings = await prisma.pendingAlarm.findMany({ where: { alarmType } });

  // กลับมาปกติแล้ว → ยกเลิกการจับตา
  for (const p of pendings) {
    if (!found.has(p.deviceId)) {
      await prisma.pendingAlarm.delete({ where: { id: p.id } });
      cleared++;
    }
  }

  for (const [deviceId, reason] of Array.from(found.entries())) {
    const device = byId.get(deviceId);
    if (!device) continue;

    const prev = pendings.find((p) => p.deviceId === deviceId);

    // รอบแรก — เริ่มจับตา
    if (!prev) {
      await prisma.pendingAlarm.create({
        data: {
          deviceId,
          deviceName: device.name,
          alarmType,
          detectedAt: now,
          checkCount: 1,
        },
      });
      continue;
    }

    const count = prev.checkCount + 1;

    // ยังไม่ครบรอบ — นับต่อ
    if (count < REQUIRED_CHECKS) {
      await prisma.pendingAlarm.update({
        where: { id: prev.id },
        data: { checkCount: count },
      });
      continue;
    }

    // ครบรอบ → ยืนยันว่าเป็นปัญหาจริง
    await raiseAlarm({
      deviceName: device.name,
      name: alarmName,
      alarmType,
      divisionName: device.divisionName,
      lat: device.lat,
      lng: device.lng,
      occurredAt: prev.detectedAt,
    });
    await prisma.pendingAlarm.delete({ where: { id: prev.id } });
    raised++;
    console.log(`[smart-alarm] 🔴 ${device.name} — ${reason}`);
  }

  return { raised, cleared };
}

// ── main ────────────────────────────────────────────────────

export async function runSmartAlarm(): Promise<{
  checked: number;
  pending: number;
  raised: number;
  cleared: number;
}> {
  const devices = await loadDeviceStates();
  if (devices.length === 0) {
    console.log("[smart-alarm] ยังไม่มี telemetry — ข้ามรอบนี้");
    return { checked: 0, pending: 0, raised: 0, cleared: 0 };
  }

  const now = new Date();
  const byId = new Map(devices.map((d) => [d.id, d]));
  const { inside, label } = await isInsideStableWindow();
  const allOffline = devices.every((d) => !d.isOnline);

  let raised = 0;
  let cleared = 0;

  // ══════════════════════════════════════════════════════════
  // [ชั้น 1] ไฟดับทั้งระบบในช่วงที่ควรติด
  // ══════════════════════════════════════════════════════════
  const sysPending = await prisma.pendingAlarm.findFirst({
    where: { alarmType: SYSTEM_ALARM_TYPE },
  });

  if (inside && allOffline) {
    if (!sysPending) {
      await prisma.pendingAlarm.create({
        data: {
          deviceId: "__system__",
          deviceName: "ระบบทั้งหมด",
          alarmType: SYSTEM_ALARM_TYPE,
          detectedAt: now,
          checkCount: 1,
        },
      });
      console.log(`[smart-alarm] ⚠️  ทุกต้นออฟไลน์ในช่วง ${label} — เริ่มจับตา (1/${REQUIRED_CHECKS})`);
    } else {
      const count = sysPending.checkCount + 1;
      if (count < REQUIRED_CHECKS) {
        await prisma.pendingAlarm.update({
          where: { id: sysPending.id },
          data: { checkCount: count },
        });
        console.log(`[smart-alarm] ⚠️  ทุกต้นยังออฟไลน์ (${count}/${REQUIRED_CHECKS})`);
      } else {
        await raiseAlarm({
          deviceName: "ระบบทั้งหมด",
          name: "ไฟดับทั้งระบบผิดปกติ",
          alarmType: SYSTEM_ALARM_TYPE,
          divisionName: devices[0]?.divisionName ?? null,
          lat: null,
          lng: null,
          occurredAt: sysPending.detectedAt,
        });
        await prisma.pendingAlarm.delete({ where: { id: sysPending.id } });
        raised++;
        console.log(`[smart-alarm] 🔴 ไฟดับทั้งระบบ ${devices.length} ต้น ในช่วง ${label}`);
      }
    }
  } else if (sysPending) {
    // กลับมาปกติ หรือออกนอกช่วงเวลาแล้ว → ยกเลิก
    await prisma.pendingAlarm.delete({ where: { id: sysPending.id } });
    cleared++;
  }

  // ══════════════════════════════════════════════════════════
  // [ชั้น 2] อุปกรณ์ออฟไลน์ต่างจากเพื่อน
  // ══════════════════════════════════════════════════════════
  const offlineFound = findOfflineAnomalies(devices);
  const r2 = await processDeviceAnomalies({
    found: offlineFound,
    byId,
    alarmType: DEVICE_ALARM_TYPE,
    alarmName: "อุปกรณ์ออฟไลน์ผิดปกติ",
    now,
  });
  raised += r2.raised;
  cleared += r2.cleared;

  // ══════════════════════════════════════════════════════════
  // [ชั้น 3] ออนไลน์แต่ไฟไม่ติด
  // ══════════════════════════════════════════════════════════
  const lightFound = findLightFailures(devices);
  const r3 = await processDeviceAnomalies({
    found: lightFound,
    byId,
    alarmType: LIGHT_ALARM_TYPE,
    alarmName: "โคมไฟไม่ทำงานผิดปกติ",
    now,
  });
  raised += r3.raised;
  cleared += r3.cleared;

  // ══════════════════════════════════════════════════════════
  // [ชั้น 4] ไฟติดแต่กำลังไฟผิดปกติ
  // ══════════════════════════════════════════════════════════
  const powerFound = findPowerAnomalies(devices);
  const r4 = await processDeviceAnomalies({
    found: powerFound,
    byId,
    alarmType: POWER_ALARM_TYPE,
    alarmName: "กำลังไฟโคมผิดปกติ",
    now,
  });
  raised += r4.raised;
  cleared += r4.cleared;

  // ══════════════════════════════════════════════════════════
  // [ปิดอัตโนมัติ] อุปกรณ์กลับมาปกติ → เปลี่ยนสถานะเป็น "แล้วเสร็จ"
  // แก้เฉพาะสถานะการจัดการ ไม่แตะข้อมูลเหตุการณ์ (append-only ยังคงอยู่)
  // ══════════════════════════════════════════════════════════
  let resolved = 0;

  const closeAlarms = async (alarmType: string, deviceNames: string[]) => {
    if (deviceNames.length === 0) return;
    const r = await prisma.alarmLog.updateMany({
      where: {
        source: "smart",
        alarmType,
        handleStatus: "pending",
        deviceName: { in: deviceNames },
      },
      data: { handleStatus: "done" },
    });
    resolved += r.count;
  };

  // กลับมาออนไลน์
  await closeAlarms(
    DEVICE_ALARM_TYPE,
    devices.filter((d) => d.isOnline).map((d) => d.name)
  );

  // ไฟกลับมาติด
  await closeAlarms(
    LIGHT_ALARM_TYPE,
    devices.filter((d) => d.isOnline && (d.actp ?? 0) > LAMP_ON_POWER_W).map((d) => d.name)
  );

  // กำลังไฟกลับมาปกติ (ไฟติดอยู่ และไม่อยู่ในรายชื่อผิดปกติรอบนี้)
  await closeAlarms(
    POWER_ALARM_TYPE,
    devices
      .filter((d) => d.isOnline && (d.actp ?? 0) > LAMP_ON_POWER_W && !powerFound.has(d.id))
      .map((d) => d.name)
  );

  // ระดับระบบ: มีต้นใดกลับมาออนไลน์ = ไฟไม่ได้ดับทั้งระบบแล้ว
  if (!allOffline) {
    const r = await prisma.alarmLog.updateMany({
      where: {
        source: "smart",
        alarmType: SYSTEM_ALARM_TYPE,
        handleStatus: "pending",
      },
      data: { handleStatus: "done" },
    });
    resolved += r.count;
  }

  if (resolved > 0) {
    console.log(`[smart-alarm] ✅ ปิด alarm อัตโนมัติ ${resolved} รายการ (อุปกรณ์กลับมาปกติ)`);
  }

  // ── สรุปผลรอบนี้ ──
  const stillPending = await prisma.pendingAlarm.count();
  const onlineCount = devices.filter((d) => d.isOnline).length;
  const litCount = devices.filter((d) => d.isOnline && (d.actp ?? 0) > LAMP_ON_POWER_W).length;
  const totalFound = offlineFound.size + lightFound.size + powerFound.size;

  console.log(
    `[smart-alarm] ตรวจ ${devices.length} ต้น (ออนไลน์ ${onlineCount} · ไฟติด ${litCount}) · ` +
      `ช่วงตรวจระบบ ${label}${inside ? " ✓" : " ✗"} · ` +
      `ผิดปกติ ${totalFound} (ออฟไลน์ ${offlineFound.size} · ไฟไม่ติด ${lightFound.size} · กำลังไฟ ${powerFound.size}) · ` +
      `รอยืนยัน ${stillPending} · แจ้งเตือนใหม่ ${raised} · ยกเลิก ${cleared} · ปิดอัตโนมัติ ${resolved}`
  );

  return { checked: devices.length, pending: stillPending, raised, cleared };
}