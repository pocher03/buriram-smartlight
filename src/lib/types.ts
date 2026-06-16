// src/lib/types.ts
// Domain types กลางที่ทั้ง mock/live adapter และ UI ใช้ร่วมกัน
// อ้างอิงโครงสร้างจาก master plan ข้อ 2–3 และ schema ข้อ 6

import type { DeviceType } from "./device-profiles";

/** ค่า telemetry ล่าสุดของอุปกรณ์ 1 ตัว (ทุกค่า null ได้ → null-safe) */
export interface Telemetry {
  voltage: number | null; // V
  electricity: number | null; // A (API ใช้ electricity แทน current)
  actp: number | null; // W กำลังไฟฟ้าแอกทีฟ
  acte: number | null; // kWh พลังงานสะสม
  switchStatus: number | null; // 0=ปิด 1=เปิด
  onlineStatus: number | null; // 0=ออฟไลน์ 1=ออนไลน์ (ยึดตรงๆ)
  brightness: number | null; // %
  soc: number | null; // % แบตเตอรี่ (solar เท่านั้น; controller = null)
  updatedAt: string | null; // ISO UTC
}

/** ทะเบียนอุปกรณ์ + telemetry ล่าสุด (join แล้วจาก adapter) */
export interface Device {
  deviceId: string;
  name: string; // เช่น BRU-NEMA-001
  zoneId: string;
  zoneName: string;
  deviceType: DeviceType;
  lat: number | null; // null = ไม่ปักหมุด (null-safe)
  lng: number | null;
  telemetry: Telemetry;
}

/** สถานะที่ UI ใช้แสดงสี — คำนวณจาก online + device profile */
export type DeviceStatus = "online" | "offline" | "alarm";

/** Log ฮาร์ดแวร์ (alarm) — APPEND-ONLY */
export interface AlarmLog {
  id: string;
  deviceName: string;
  name: string; // ชื่อ alarm เช่น "ออฟไลน์"
  alarmLevel: "crit" | "warn" | "info" | "ok";
  createdAt: string; // ISO UTC
  handleStatus: "pending" | "processing" | "done";
  zoneName: string;
  lat: number | null;
  lng: number | null;
}

/** KPI ภาพรวม (จาก /division/pandect/info) */
export interface Kpi {
  lightTotal: number | null;
  lightOnlineNum: number | null;
  lightOfflineNum: number | null;
  alarmNum: number | null; // โคมมีปัญหา
  openTime: string | null; // แผนเปิดไฟ
  closeTime: string | null;
}

/** สถานะงานซ่อมบำรุง (3 สถานะ) */
export interface MaintenanceStatus {
  pending: number;
  processing: number;
  done: number;
}

export type EnergyPeriod = "month" | "week" | "day";

/** จุดข้อมูลพลังงาน 1 ช่วงเวลา (เปรียบเทียบปีนี้/ปีก่อน) */
export interface EnergyPoint {
  label: string; // เช่น "ม.ค." / "จ." / "1"
  current: number | null; // ปีนี้ kWh
  previous: number | null; // ปีก่อน kWh
  carbon: number | null; // คาร์บอนเครดิต kg
}

export interface EnergySeries {
  points: EnergyPoint[];
  totalNow: number | null; // พลังงานปีนี้สะสม kWh
  totalSave: number | null; // ประหยัดได้ kWh
}

/** สภาพอากาศ (OpenWeather — Sprint 2 ของจริง) */
export interface WeatherInfo {
  temp: number | null; // °C
  desc: string | null;
  humidity: number | null; // %
  pm25: number | null;
  co2: number | null; // ppm
}

/** โซนปัญหาสูงสุด (Top 5) */
export interface FaultArea {
  name: string;
  count: number;
}
