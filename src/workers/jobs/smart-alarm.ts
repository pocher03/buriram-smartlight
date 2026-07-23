// src/workers/jobs/smart-alarm.ts
// วิเคราะห์ alarm เองจาก telemetry แทนการดึง alarm จาก RULR
//
// หลักการ: "ใครต่างจากพวกเกิน 3 รอบ = มีปัญหา"
//   - จัดกลุ่มตาม deviceType (AC / Solar) เพราะพฤติกรรมต่างกันสิ้นเชิง
//   - AC   : offline พร้อมกันทั้งกลุ่ม = ตัดไฟปกติ → ไม่ alarm
//   - Solar: มีแบตเตอรี่ ควร online ตลอด → offline เมื่อไหร่ก็ผิดปกติ
//   - ยืนยัน 3 รอบ (90 นาที) ก่อนสร้าง alarm จริง → กัน false alarm ช่วง transition
//
// หมายเหตุ: จัดกลุ่มด้วย deviceType อย่างเดียว (บุรีรัมย์มีโซนเดียว)
//           ถ้าอนาคตมีหลายโซนที่เปิด-ปิดคนละเวลา ให้เพิ่ม zoneId เข้า group key

import { prisma } from "../../lib/prisma";
import { DEVICE_PROFILES, type DeviceType } from "../../lib/device-profiles";

const REQUIRED_CHECKS = 3; // ต้องผิดปกติต่อเนื่อง 3 รอบ (~90 นาที) ถึงจะ alarm
const MIN_GROUP_SIZE = 2;  // กลุ่มที่มีต้นเดียว เทียบ peer ไม่ได้

interface DeviceState {
  id: string;
  name: string;
  deviceType: DeviceType;
  divisionName: string | null;
  lat: number | null;
  lng: number | null;
  isOnline: boolean;
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
    .filter((d) => d.telemetry.length > 0) // ไม่มี telemetry เลย = ยังไม่เคยติดต่อ ข้ามไป
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
 * ตัดสินว่าต้นไหน "ผิดปกติ" ในรอบนี้
 * คืน Map<deviceId, เหตุผล> — ต้นที่ไม่อยู่ใน Map ถือว่าปกติ
 */
function findAbnormal(devices: DeviceState[]): Map<string, string> {
  const abnormal = new Map<string, string>();

  // แยกกลุ่มตามชนิดอุปกรณ์
  const groups = new Map<DeviceType, DeviceState[]>();
  for (const d of devices) {
    const list = groups.get(d.deviceType) ?? [];
    list.push(d);
    groups.set(d.deviceType, list);
  }

  for (const [type, group] of groups) {
    const profile = DEVICE_PROFILES[type];
    const offline = group.filter((d) => !d.isOnline);

    // Solar/แบตเตอรี่: ควร online ตลอดเวลา → offline = ผิดปกติทันที ไม่ต้องเทียบกลุ่ม
    if (profile.expectAlwaysOnline) {
      for (const d of offline) {
        abnormal.set(d.id, "ออฟไลน์ผิดปกติ (อุปกรณ์ควรออนไลน์ตลอดเวลา)");
      }
      continue;
    }

    // AC: ใช้ Peer Comparison
    if (group.length < MIN_GROUP_SIZE) continue; // เทียบไม่ได้
    if (offline.length === 0) continue;          // ทุกต้นออนไลน์ = ปกติ
    if (offline.length === group.length) continue; // ทุกต้นออฟไลน์พร้อมกัน = ตัดไฟปกติ

    const offlineRatio = offline.length / group.length;
    const reason =
      offlineRatio >= 0.5
        ? `ออฟไลน์พร้อมกัน ${offline.length}/${group.length} ต้น (อาจเป็นปัญหาระดับระบบ)`
        : `ออฟไลน์ขณะที่อุปกรณ์อื่นทำงานปกติ (${offline.length}/${group.length} ต้น)`;

    for (const d of offline) abnormal.set(d.id, reason);
  }

  return abnormal;
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

  const abnormal = findAbnormal(devices);
  const byId = new Map(devices.map((d) => [d.id, d]));
  const existing = await prisma.pendingAlarm.findMany({ where: { alarmType: "offline" } });

  let raised = 0;
  let cleared = 0;
  const now = new Date();

  // 1) ต้นที่กลับมาปกติแล้ว → ลบ pending ทิ้ง
  for (const p of existing) {
    if (!abnormal.has(p.deviceId)) {
      await prisma.pendingAlarm.delete({ where: { id: p.id } });
      cleared++;
    }
  }

  // 2) ต้นที่ยังผิดปกติ → นับรอบ / สร้าง alarm เมื่อครบ
  for (const [deviceId, reason] of abnormal) {
    const device = byId.get(deviceId);
    if (!device) continue;

    const prev = existing.find((p) => p.deviceId === deviceId);

    // รอบแรก — เริ่มจับตา
    if (!prev) {
      await prisma.pendingAlarm.create({
        data: {
          deviceId,
          deviceName: device.name,
          alarmType: "offline",
          detectedAt: now,
          checkCount: 1,
        },
      });
      continue;
    }

    const count = prev.checkCount + 1;

    // ยังไม่ครบ 3 รอบ — นับต่อ
    if (count < REQUIRED_CHECKS) {
      await prisma.pendingAlarm.update({
        where: { id: prev.id },
        data: { checkCount: count },
      });
      continue;
    }

    // ครบ 3 รอบ → ยืนยันว่าเป็นปัญหาจริง
    await prisma.alarmLog.create({
      data: {
        source: "smart",
        alarmType: "offline",
        deviceName: device.name,
        name: "อุปกรณ์ออฟไลน์ผิดปกติ",
        alarmLevel: "crit",
        handleStatus: "pending",
        divisionName: device.divisionName,
        latitude: device.lat,
        longitude: device.lng,
        createdAt: prev.detectedAt, // เวลาที่ตรวจพบครั้งแรก ไม่ใช่เวลายืนยัน
      },
    });
    await prisma.pendingAlarm.delete({ where: { id: prev.id } });
    raised++;
    console.log(`[smart-alarm] 🔴 ${device.name} — ${reason}`);
  }

  const stillPending = await prisma.pendingAlarm.count();
  console.log(
    `[smart-alarm] ตรวจ ${devices.length} ต้น · ผิดปกติ ${abnormal.size} · ` +
      `รอยืนยัน ${stillPending} · แจ้งเตือนใหม่ ${raised} · ยกเลิก ${cleared}`
  );

  return { checked: devices.length, pending: stillPending, raised, cleared };
}