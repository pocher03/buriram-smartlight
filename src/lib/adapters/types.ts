// src/lib/adapters/types.ts
// Contract กลางของ Data Adapter — mock (Sprint 0–1, Demo) | live (Sprint 2+, Local DB)
// ⚠️ Frontend อ่านผ่าน adapter เท่านั้น ห้ามยิง rulr-aiot.com ตรง (กฎเหล็ก #4)

import type { Project, Zone } from "../mock-data";
import type {
  AlarmLog,
  Device,
  EnergyPeriod,
  EnergySeries,
  FaultArea,
  Kpi,
  MaintenanceStatus,
  WeatherInfo,
} from "../types";

/** ข้อมูลทั้งหมดที่ Dashboard ต้องใช้ (ดึงครั้งเดียว) */
export interface DashboardData {
  kpi: Kpi;
  devices: Device[];
  alarms: AlarmLog[];
  maintenance: MaintenanceStatus;
  weather: WeatherInfo;
  faultAreas: FaultArea[];
  lastSync?: string; // เพิ่มบรรทัดนี้ (เช่น "11:00:00")
  uptime?: string;   // เพิ่มบรรทัดนี้ (เช่น "12h 30m")
}

export interface DataAdapter {
  /** แหล่งข้อมูล ('mock' | 'live') — ใช้แสดง Demo banner */
  readonly source: "mock" | "live";
  getProjects(): Promise<Project[]>;
  getZones(projectId: string): Promise<Zone[]>;
  getDashboard(projectId: string): Promise<DashboardData>;
  getEnergy(projectId: string, period: EnergyPeriod): Promise<EnergySeries>;
}
