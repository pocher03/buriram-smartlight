// src/workers/jobs/smart-alarm.ts
// วิเคราะห์ alarm เองจาก telemetry แทนการดึง alarm จาก RULR
//
// ๒ ชั้นการตรวจจับ:
//   [1] Time Window  — จับ "ไฟดับทั้งระบบผิดเวลา" (peer comparison ตาบอดกรณีนี้)
//   [2] Peer Compare — จับ "ต้นที่ต่างจากพวก" (time window ตาบอดกรณีนี้)
//
// ทั้งสองชั้นต้องยืนยัน 3 รอบ (~90 นาที) ก่อนสร้าง alarm จริง — กัน false alarm
// ช่วง transition (ไฟทยอยเปิด/ปิด) ข้ามการตรวจชั้น [1] เพราะ online% ไม่นิ่ง

import { prisma } from "../../lib/prisma";
import { DEVICE_PROFILES, type DeviceType } from "../../lib/device-profiles";

const REQUIRED_CHECKS = 3;  // ต้องผิดปกติต่อเนื่อง 3 รอบถึงจะ alarm
const MIN_GROUP_SIZE = 2;   // กลุ่มที่มีต้นเดียว เทียบ peer ไม่ได้

// buffer รอบเวลาเปิด/ปิดไฟ — จากข้อมูลจริง ไฟทยอยติด/ดับใช้เวลา ~1 ชม.
const OPEN_BUFFER_MIN = 45;   // หลังเวลาเปิด รอ 45 นาทีค่อยเริ่มตรวจ
const CLOSE_BUFFER_MIN = 15;  // ก่อนเวลาปิด หยุดตรวจ 15 นาที

// fallback ถ้า RULR ไม่ส่งเวลาเปิด/ปิดมา
const FALLBACK_OPEN = "18:40:00";
const FALLBACK_CLOSE = "05:48:00";

const SYSTEM_ALARM_TYPE = "system_blackout";
const DEVICE_ALARM_TYPE = "offline";

interface DeviceState {
  id: string;
  name: string;
  deviceType: DeviceType;
  divisionName: string | null;
  lat: number | null;
  lng: number | null;
  isOnline: boolean;
}

/** "18:40:00" → นาทีนับจากเที่ยงคืน */
function toMinutes(hhmmss: string | null): number | null {
  if (!hhmmss) return null;
  const [h, m] = hhmmss.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** นาทีปัจจุบันตามเวลาไทย (server อาจเป็น UTC) */
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
 * window ข้ามเที่ยงคืน (18:40 → 05:48) จึงต้องเช็คแบบคร่อมวัน
 */
async function isInsideStableWindow(): Promise<{ inside: boolean; label: string }> {
  const snap = await prisma.kpiSnapshot.findFirst({
    select: { openTime: true, closeTime: true },
  });

  const open = toMinutes(snap?.openTime ?? null) ?? toMinutes(FALLBACK_OPEN)!;
  const close = toMinutes(snap?.closeTime ?? null) ?? toMinutes(FALLBACK_CLOSE)!;

  // หดขอบเข้ามาเพื่อเลี่ยงช่วง transition ที่ online% แกว่ง
  const start = (open + OPEN_BUFFER_MIN) % 1440;
  const end = (close - CLOSE_BUFFER_MIN + 1440) % 1440;

  const now = nowMinutesBangkok();
  // window คร่อมเที่ยงคืน → อยู่ในช่วงถ้า now >= start หรือ now <= end
  const inside = start > end ? now >= start || now <= end : now >= start && now <= end;

  const fmt = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  return { inside, label: `${fmt(start)}-${fmt(end)}` };
}

/** ดึงสถานะล่าสุดของทุกอุปกรณ์ (telemetry แถวใหม่สุดของแต่ละต้น) */
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
        select: { onlineStatus: true },
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
    }));
}

/**
 * [ชั้น 2] หาต้นที่ "ต่างจากพวก"
 * คืน Map<deviceId, เหตุผล> — ต้นที่ไม่อยู่ใน Map ถือว่าปกติ
 */
function findAbnormalDevices(devices: DeviceState[]): Map<string, string> {
  const abnormal = new Map<string, string>();

  // แยกกลุ่มตามชนิดอุปกรณ์ — AC กับ Solar พฤติกรรมต่างกันสิ้นเชิง
  const groups = new Map<DeviceType, DeviceState[]>();
  for (const d of devices) {
    const list = groups.get(d.deviceType) ?? [];
    list.push(d);
    groups.set(d.deviceType, list);
  }

  for (const [type, group] of Array.from(groups.entries())) {
    const profile = DEVICE_PROFILES[type];
    const offline = group.filter((d) => !d.isOnline);

    // Solar: มีแบตเตอรี่ ควร online ตลอด → offline = ผิดปกติทันที
    if (profile.expectAlwaysOnline) {
      for (const d of offline) {
        abnormal.set(d.id, "ออฟไลน์ผิดปกติ (อุปกรณ์ควรออนไลน์ตลอดเวลา)");
      }
      continue;
    }

    // AC: เทียบกับกลุ่ม
    if (group.length < MIN_GROUP_SIZE) continue;
    if (offline.length === 0) continue;                // ทุกต้นออนไลน์ = ปกติ
    if (offline.length === group.length) continue;     // ทุกต้นออฟไลน์ = ชั้น 1 จัดการ

    const ratio = offline.length / group.length;
    const reason =
      ratio >= 0.5
        ? `ออฟไลน์พร้อมกัน ${offline.length}/${group.length} ต้น (อาจเป็นปัญหาระดับระบบ)`
        : `ออฟไลน์ขณะที่อุปกรณ์อื่นทำงานปกติ (${offline.length}/${group.length} ต้น)`;

    for (const d of offline) abnormal.set(d.id, reason);
  }

  return abnormal;
}

/** สร้าง alarm ลง DB */
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
      createdAt: opts.occurredAt, // เวลาที่ตรวจพบครั้งแรก ไม่ใช่เวลายืนยัน
    },
  });
}

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
  const { inside, label } = await isInsideStableWindow();
  const allOffline = devices.every((d) => !d.isOnline);

  let raised = 0;
  let cleared = 0;

  // ══════════════════════════════════════════════════════════
  // [ชั้น 1] ไฟดับทั้งระบบในช่วงที่ควรติด → ปัญหาระดับระบบ
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
  // [ชั้น 2] ต้นที่ต่างจากพวก
  // ══════════════════════════════════════════════════════════
  const abnormal = findAbnormalDevices(devices);
  const byId = new Map(devices.map((d) => [d.id, d]));
  const existing = await prisma.pendingAlarm.findMany({
    where: { alarmType: DEVICE_ALARM_TYPE },
  });

  // ต้นที่กลับมาปกติแล้ว → ลบ pending
  for (const p of existing) {
    if (!abnormal.has(p.deviceId)) {
      await prisma.pendingAlarm.delete({ where: { id: p.id } });
      cleared++;
    }
  }

  // ต้นที่ยังผิดปกติ → นับรอบ / สร้าง alarm เมื่อครบ
  for (const [deviceId, reason] of Array.from(abnormal.entries())) {
    const device = byId.get(deviceId);
    if (!device) continue;

    const prev = existing.find((p) => p.deviceId === deviceId);

    if (!prev) {
      await prisma.pendingAlarm.create({
        data: {
          deviceId,
          deviceName: device.name,
          alarmType: DEVICE_ALARM_TYPE,
          detectedAt: now,
          checkCount: 1,
        },
      });
      continue;
    }

    const count = prev.checkCount + 1;
    if (count < REQUIRED_CHECKS) {
      await prisma.pendingAlarm.update({
        where: { id: prev.id },
        data: { checkCount: count },
      });
      continue;
    }

    await raiseAlarm({
      deviceName: device.name,
      name: "อุปกรณ์ออฟไลน์ผิดปกติ",
      alarmType: DEVICE_ALARM_TYPE,
      divisionName: device.divisionName,
      lat: device.lat,
      lng: device.lng,
      occurredAt: prev.detectedAt,
    });
await prisma.pendingAlarm.delete({ where: { id: prev.id } });
    raised++;
    console.log(`[smart-alarm] 🔴 ${device.name} — ${reason}`);
  }

  // ══════════════════════════════════════════════════════════
  // [ชั้น 3] ปิด alarm อัตโนมัติเมื่ออุปกรณ์กลับมาปกติ
  // (append-only ยังคงอยู่ — แก้แค่สถานะการจัดการ ไม่แตะข้อมูลเหตุการณ์)
  // ══════════════════════════════════════════════════════════
  let resolved = 0;

  // รายต้น: กลับมาออนไลน์แล้ว
  const onlineNames = devices.filter((d) => d.isOnline).map((d) => d.name);
  if (onlineNames.length > 0) {
    const r = await prisma.alarmLog.updateMany({
      where: {
        source: "smart",
        alarmType: DEVICE_ALARM_TYPE,
        handleStatus: "pending",
        deviceName: { in: onlineNames },
      },
      data: { handleStatus: "done" },
    });
    resolved += r.count;
  }

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

  const stillPending = await prisma.pendingAlarm.count();
  const onlineCount = devices.filter((d) => d.isOnline).length;
  console.log(
    `[smart-alarm] ตรวจ ${devices.length} ต้น (ออนไลน์ ${onlineCount}) · ` +
      `ช่วงตรวจระบบ ${label}${inside ? " ✓" : " ✗"} · ` +
      `ผิดปกติ ${abnormal.size} · รอยืนยัน ${stillPending} · ` +
      `แจ้งเตือนใหม่ ${raised} · ยกเลิก ${cleared}`
  );

  return { checked: devices.length, pending: stillPending, raised, cleared };
}