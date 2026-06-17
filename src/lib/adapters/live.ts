// src/lib/adapters/live.ts
// อ่านจาก Local PostgreSQL ผ่าน Prisma เท่านั้น (กฎเหล็ก #4 — ห้ามยิง API ต้นทางตรง)
// ข้อมูลทั้งหมดถูกเติมโดย Worker (src/workers) ทุก 30 นาที — ที่นี่อ่านอย่างเดียว
// NULL-SAFE: ทุก field ที่ไม่มีค่าคืน null → UI แสดง "--"

import { prisma } from "../prisma";
import type { DeviceType } from "../device-profiles";
import type {
  AlarmLog,
  Device,
  EnergyPeriod,
  EnergyPoint,
  EnergySeries,
  FaultArea,
  Kpi,
  MaintenanceStatus,
  Telemetry,
  WeatherInfo,
} from "../types";
import type { Project, Zone } from "../mock-data";
import type { DashboardData, DataAdapter } from "./types";

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const num = (v: number | null | undefined): number | null => (v == null ? null : v);

/** อุปกรณ์ + telemetry ล่าสุด (take 1) → Device ของ UI */
type DeviceRow = {
  id: string;
  name: string;
  deviceType: DeviceType;
  zoneId: string | null;
  lat: number | null;
  lng: number | null;
  zone: { name: string } | null;
  telemetry: Array<{
    voltage: number | null;
    electricity: number | null;
    actp: number | null;
    acte: number | null;
    switchStatus: number | null;
    onlineStatus: number | null;
    brightness: number | null;
    soc: number | null;
    createdAt: Date;
  }>;
};

function toDevice(d: DeviceRow): Device {
  const t = d.telemetry[0];
  const telemetry: Telemetry = t
    ? {
        voltage: num(t.voltage),
        electricity: num(t.electricity),
        actp: num(t.actp),
        acte: num(t.acte),
        switchStatus: num(t.switchStatus),
        onlineStatus: num(t.onlineStatus),
        brightness: num(t.brightness),
        soc: num(t.soc),
        updatedAt: t.createdAt.toISOString(),
      }
    : {
        voltage: null, electricity: null, actp: null, acte: null,
        switchStatus: null, onlineStatus: null, brightness: null,
        soc: null, updatedAt: null,
      };
  return {
    deviceId: d.id,
    name: d.name,
    zoneId: d.zoneId ?? "",
    zoneName: d.zone?.name ?? "ไม่ระบุโซน",
    deviceType: d.deviceType,
    lat: num(d.lat),
    lng: num(d.lng),
    telemetry,
  };
}

const liveAdapter: DataAdapter = {
  source: "live",

  async getProjects(): Promise<Project[]> {
    const rows = await prisma.project.findMany({ orderBy: { name: "asc" } });
    return rows.map((p: any) => ({ id: p.id, name: p.name, divisionId: p.divisionId }));
  },

  async getZones(projectId: string): Promise<Zone[]> {
    const rows = await prisma.zone.findMany({ where: { projectId }, orderBy: { name: "asc" } });
    return rows.map((z: any) => ({ id: z.id, projectId: z.projectId, name: z.name }));
  },

  async getDashboard(projectId: string): Promise<DashboardData> {
    const [deviceRows, snap, alarmRows, handleGroups, weatherRow, faultGroups] =
      await Promise.all([
        prisma.device.findMany({
          where: { projectId },
          orderBy: { name: "asc" },
          include: {
            zone: { select: { name: true } },
            telemetry: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        }),
        prisma.kpiSnapshot.findUnique({ where: { projectId } }),
        prisma.alarmLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.alarmLog.groupBy({ by: ["handleStatus"], _count: { _all: true } }),
        prisma.weatherCache.findFirst({
          where: { projectId },
          orderBy: { fetchedAt: "desc" },
        }),
        prisma.alarmLog.groupBy({
          by: ["divisionName"],
          where: { alarmLevel: { not: "ok" } },
          _count: { _all: true },
        }),
      ]);

    const devices = (deviceRows as DeviceRow[]).map(toDevice);

    // KPI — derive online/offline จาก telemetry (DB truth); แผนเปิด/ปิดไฟจาก snapshot
    const total = devices.length || null;
    const online = devices.filter((d) => d.telemetry.onlineStatus === 1).length;
    const offline = devices.length - online;
    const kpi: Kpi = {
      lightTotal: total ?? snap?.lightTotal ?? null,
      lightOnlineNum: total != null ? online : (snap?.lightOnlineNum ?? null),
      lightOfflineNum: total != null ? offline : null,
      alarmNum: total != null ? offline : (snap?.alarmNum ?? null),
      openTime: snap?.openTime ?? null,
      closeTime: snap?.closeTime ?? null,
    };

    // งานซ่อมบำรุง — นับจาก handleStatus ของ alarm_logs
    const countOf = (s: string) =>
      handleGroups.find((g: any) => g.handleStatus === s)?._count._all ?? 0;
    const maintenance: MaintenanceStatus = {
      pending: countOf("pending"),
      processing: countOf("processing"),
      done: countOf("done"),
    };

    const alarms: AlarmLog[] = alarmRows.map((a: any) => ({
      id: a.id.toString(),
      deviceName: a.deviceName,
      name: a.name,
      alarmLevel: a.alarmLevel,
      createdAt: a.createdAt.toISOString(),
      handleStatus: a.handleStatus,
      zoneName: a.divisionName ?? "ไม่ระบุโซน",
      lat: num(a.latitude),
      lng: num(a.longitude),
    }));

    const weather: WeatherInfo = weatherRow
      ? {
          temp: num(weatherRow.temp),
          desc: weatherRow.description ?? null,
          humidity: num(weatherRow.humidity),
          pm25: num(weatherRow.pm25),
          co2: num(weatherRow.co2),
        }
      : { temp: null, desc: null, humidity: null, pm25: null, co2: null };

    const faultAreas: FaultArea[] = faultGroups
      .map((g: any) => ({ name: g.divisionName ?? "ไม่ระบุ", count: g._count._all }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    return { kpi, devices, alarms, maintenance, weather, faultAreas };
  },

  async getEnergy(projectId: string, period: EnergyPeriod): Promise<EnergySeries> {
    // month → energy_stats รายเดือน; week/day → รายวัน (7 / 12 รายการล่าสุด)
    const isMonth = period === "month";
    const take = period === "month" ? 12 : period === "week" ? 7 : 12;

    const rows = await prisma.energyStat.findMany({
      where: { projectId, type: isMonth ? "monthly" : "daily" },
      orderBy: { period: "desc" },
      take,
    });
    rows.reverse(); // เรียงเก่า → ใหม่ สำหรับกราฟ

    const label = (p: string): string => {
      if (isMonth) {
        const m = Number(p.split("-")[1]); // "YYYY-MM"
        return Number.isFinite(m) && m >= 1 && m <= 12 ? THAI_MONTHS[m - 1] : p;
      }
      return p.slice(5); // "MM-DD"
    };

    const points: EnergyPoint[] = rows.map((r: any) => ({
      label: label(r.period),
      current: num(r.energyNow),
      previous: num(r.energyPrev),
      carbon: r.reduction != null ? Number((Math.abs(r.reduction) * 0.5).toFixed(2)) : null,
    }));

    const sum = (key: "current" | "previous") =>
      points.reduce((s, p) => s + (p[key] ?? 0), 0);
    const totalNow = points.length ? sum("current") : null;
    const totalPrev = points.length ? sum("previous") : null;
    const totalSave =
      totalNow != null && totalPrev != null ? Number((totalPrev - totalNow).toFixed(2)) : null;

    return { points, totalNow, totalSave };
  },
};

export default liveAdapter;
