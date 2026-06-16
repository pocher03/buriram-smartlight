// src/lib/mock-data.ts
// ⚠️ ข้อมูลสาธิต (Demo Mode) — โซนจริง + mapping อุปกรณ์ยังรอทีมยืนยัน (ดู open issues ใน CLAUDE.md)
// ใช้สำหรับ Sprint 0–1 และ Demo Mode เท่านั้น — ห้ามใช้ใน Production

import type { DeviceType } from "./device-profiles";
import type {
  AlarmLog,
  Device,
  EnergyPeriod,
  EnergySeries,
  FaultArea,
  Kpi,
  MaintenanceStatus,
  Telemetry,
  WeatherInfo,
} from "./types";

export interface Project {
  id: string;
  name: string;
  divisionId: number; // divisionId ต้นทาง (บุรีรัมย์ = 1889)
}

export interface Zone {
  id: string;
  projectId: string;
  name: string;
}

export interface SeedUser {
  username: string;
  name: string;
  email: string;
  role: "admin" | "super_admin";
  isCrossProject: boolean; // เช็คสิทธิ์ด้วย flag ไม่ hardcode ชื่อ role
  projectId: string | null; // super_admin ข้ามโครงการ → null
}

export const MOCK_PROJECTS: Project[] = [
  { id: "buriram", name: "เทศบาลเมืองบุรีรัมย์", divisionId: 1889 },
];

// โซนสมมุติภายในเขตเทศบาลเมืองบุรีรัมย์ (mock — รอ lock รายชื่อจริง)
export const MOCK_ZONES: Zone[] = [
  { id: "bru-z1", projectId: "buriram", name: "โซนศาลากลาง" },
  { id: "bru-z2", projectId: "buriram", name: "โซนตลาดสด" },
  { id: "bru-z3", projectId: "buriram", name: "โซนถนนหลักเมือง" },
  { id: "bru-z4", projectId: "buriram", name: "โซนสวนสาธารณะ" },
  { id: "bru-z5", projectId: "buriram", name: "โซนชุมชน" },
];

// บัญชีตัวอย่างสำหรับ seed (รหัสผ่านจริงจะ hash ด้วย bcrypt ใน Sprint 3)
export const SEED_USERS: SeedUser[] = [
  {
    username: "admin.buriram",
    name: "เจ้าหน้าที่เทศบาลเมืองบุรีรัมย์",
    email: "admin.buriram@example.go.th",
    role: "admin",
    isCrossProject: false,
    projectId: "buriram",
  },
  {
    username: "jumbo.super",
    name: "ผู้ดูแลระบบ บริษัท จัมโบ้ อิเล็คทรอนิคส์",
    email: "ops@jumboelec.co.th",
    role: "super_admin",
    isCrossProject: true,
    projectId: null,
  },
];

// ชนิดอุปกรณ์เริ่มต้นของโครงการบุรีรัมย์ (เฟสแรก controller ทั้งหมด 26 ต้น)
export const BURIRAM_DEFAULT_DEVICE_TYPE: DeviceType = "controller";

// ───────────────────────────────────────────────────────────────────────────
// Mock telemetry / devices / alarms / energy (Demo Mode เท่านั้น)
// พิกัดอ้างอิงเทศบาลเมืองบุรีรัมย์: lat 14.992892, lng 103.113694
// ───────────────────────────────────────────────────────────────────────────

const CENTER = { lat: 14.992892, lng: 103.113694 };
const ZONE_IDS = MOCK_ZONES.map((z) => z.id);
const ZONE_NAME = Object.fromEntries(MOCK_ZONES.map((z) => [z.id, z.name]));

/** pseudo-random แบบ deterministic (กัน hydration mismatch — ไม่ใช้ Math.random) */
const rng = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x); // 0..1
};

const round = (n: number, d = 2) => Number(n.toFixed(d));

function makeTelemetry(seed: number, type: DeviceType, online: boolean): Telemetry {
  if (!online) {
    // ออฟไลน์ = ไม่มีค่าวัด (null-safe → UI แสดง --)
    return {
      voltage: null,
      electricity: null,
      actp: null,
      acte: round(50 + rng(seed) * 200), // พลังงานสะสมยังคงค่าเดิม
      switchStatus: null,
      onlineStatus: 0,
      brightness: null,
      soc: type === "solar" ? round(10 + rng(seed + 7) * 30) : null,
      updatedAt: null,
    };
  }
  return {
    voltage: round(218 + rng(seed) * 12, 1),
    electricity: round(0.3 + rng(seed + 1) * 1.2, 2),
    actp: round(60 + rng(seed + 2) * 90, 1),
    acte: round(50 + rng(seed + 3) * 200),
    switchStatus: rng(seed + 4) > 0.35 ? 1 : 0,
    onlineStatus: 1,
    brightness: Math.round(60 + rng(seed + 5) * 40),
    soc: type === "solar" ? Math.round(60 + rng(seed + 6) * 40) : null,
    updatedAt: "2026-06-16 11:30:00",
  };
}

function buildDevices(): Device[] {
  const devices: Device[] = [];
  // 26 controller (BRU-NEMA-001..026)
  for (let i = 1; i <= 26; i++) {
    const seed = i;
    const online = rng(seed + 100) > 0.18; // ~5 ตัวออฟไลน์
    const zoneId = ZONE_IDS[i % ZONE_IDS.length];
    // กระจายพิกัดรอบศูนย์กลาง ~รัศมี 2 กม.
    const lat = CENTER.lat + (rng(seed + 11) - 0.5) * 0.03;
    const lng = CENTER.lng + (rng(seed + 12) - 0.5) * 0.03;
    devices.push({
      deviceId: `bru-nema-${String(i).padStart(3, "0")}`,
      name: `BRU-NEMA-${String(i).padStart(3, "0")}`,
      zoneId,
      zoneName: ZONE_NAME[zoneId],
      deviceType: "controller",
      lat: round(lat, 6),
      lng: round(lng, 6),
      telemetry: makeTelemetry(seed, "controller", online),
    });
  }
  // 3 solar (BRU-SOLAR-001..003) — ทดสอบ branching DEVICE_PROFILES (SOC + สถานะ)
  for (let i = 1; i <= 3; i++) {
    const seed = 200 + i;
    const online = i !== 2; // ต้นที่ 2 ออฟไลน์ (solar offline = ผิดปกติ)
    const zoneId = ZONE_IDS[i % ZONE_IDS.length];
    const lat = CENTER.lat + (rng(seed + 11) - 0.5) * 0.03;
    const lng = CENTER.lng + (rng(seed + 12) - 0.5) * 0.03;
    devices.push({
      deviceId: `bru-solar-${String(i).padStart(3, "0")}`,
      name: `BRU-SOLAR-${String(i).padStart(3, "0")}`,
      zoneId,
      zoneName: ZONE_NAME[zoneId],
      deviceType: "solar",
      lat: round(lat, 6),
      lng: round(lng, 6),
      telemetry: makeTelemetry(seed, "solar", online),
    });
  }
  return devices;
}

export const MOCK_DEVICES: Device[] = buildDevices();

export const MOCK_KPI: Kpi = (() => {
  const total = MOCK_DEVICES.length;
  const online = MOCK_DEVICES.filter((d) => d.telemetry.onlineStatus === 1).length;
  return {
    lightTotal: total,
    lightOnlineNum: online,
    lightOfflineNum: total - online,
    alarmNum: MOCK_DEVICES.filter((d) => d.telemetry.onlineStatus !== 1).length,
    openTime: "18:00",
    closeTime: "06:00",
  };
})();

export const MOCK_MAINTENANCE: MaintenanceStatus = {
  pending: 2,
  processing: 1,
  done: 8,
};

export const MOCK_WEATHER: WeatherInfo = {
  temp: 30,
  desc: "มีเมฆบางส่วน",
  humidity: 65,
  pm25: 38,
  co2: 412,
};

// Alarm logs (mock) — APPEND-ONLY ใน production
const ALARM_NAMES: Array<{ name: string; level: AlarmLog["alarmLevel"] }> = [
  { name: "อุปกรณ์ออฟไลน์", level: "crit" },
  { name: "แรงดันไฟฟ้าผิดปกติ", level: "warn" },
  { name: "กระแสไฟฟ้าเกินพิกัด", level: "warn" },
  { name: "กลับมาออนไลน์", level: "ok" },
  { name: "สัญญาณอ่อน", level: "info" },
];

export const MOCK_ALARMS: AlarmLog[] = Array.from({ length: 24 }).map((_, i) => {
  const dev = MOCK_DEVICES[i % MOCK_DEVICES.length];
  const a = ALARM_NAMES[i % ALARM_NAMES.length];
  const hour = String(11 - Math.floor(i / 2)).padStart(2, "0");
  const min = String((i * 7) % 60).padStart(2, "0");
  const handle: AlarmLog["handleStatus"] =
    i % 3 === 0 ? "done" : i % 3 === 1 ? "processing" : "pending";
  return {
    id: `alm-${String(i + 1).padStart(3, "0")}`,
    deviceName: dev.name,
    name: a.name,
    alarmLevel: a.level,
    createdAt: `2026-06-16 ${hour}:${min}:00`,
    handleStatus: handle,
    zoneName: dev.zoneName,
    lat: dev.lat,
    lng: dev.lng,
  };
});

// Top 5 โซนปัญหา (pre-aggregated จาก alarm logs)
export const MOCK_FAULT_AREAS: FaultArea[] = (() => {
  const counts = MOCK_ALARMS.filter((a) => a.alarmLevel !== "ok").reduce<
    Record<string, number>
  >((acc, a) => {
    acc[a.zoneName] = (acc[a.zoneName] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort(([, x], [, y]) => y - x)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
})();

const MONTH_LABELS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const WEEK_LABELS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const DAY_LABELS = Array.from({ length: 12 }).map((_, i) => `${i * 2}:00`);

export function buildEnergy(period: EnergyPeriod): EnergySeries {
  const labels =
    period === "month" ? MONTH_LABELS : period === "week" ? WEEK_LABELS : DAY_LABELS;
  const base = period === "month" ? 4200 : period === "week" ? 620 : 95;
  const points = labels.map((label, i) => {
    const current = round(base * (0.8 + rng(i + 1) * 0.4), 0);
    const previous = round(current * (1.08 + rng(i + 50) * 0.12), 0);
    return {
      label,
      current,
      previous,
      carbon: round((previous - current) * 0.5, 0),
    };
  });
  const totalNow = points.reduce((s, p) => s + (p.current ?? 0), 0);
  const totalPrev = points.reduce((s, p) => s + (p.previous ?? 0), 0);
  return { points, totalNow, totalSave: round(totalPrev - totalNow, 0) };
}
