// src/lib/device-status.ts
// แปลงสถานะอุปกรณ์เป็นค่าที่ UI ใช้แสดงสี
// ⚠️ Sprint 1: ยึด onlineStatus ตรงๆ เท่านั้น (online=เขียว, offline=แดง)
//    logic isFault() แบบ "ออฟไลน์ช่วงที่ควรติด = ผิดปกติ" รอทีมยืนยันพฤติกรรม controller
//    (ดู open issues ใน CLAUDE.md) → ยังไม่ implement ใน Sprint นี้

import type { Device, DeviceStatus } from "./types";

/** สถานะแสดงผลของอุปกรณ์ — null-safe (ไม่มีค่า online → ถือว่า offline) */
export const deviceStatus = (d: Device): DeviceStatus =>
  d.telemetry.onlineStatus === 1 ? "online" : "offline";

export const STATUS_COLOR: Record<DeviceStatus, string> = {
  online: "#00e676",   // เขียวนีออน
  offline: "#ff1744",  // แดงนีออน
  alarm: "#ffea00",    // เหลืองนีออน
};

export const STATUS_LABEL: Record<DeviceStatus, string> = {
  online: "ออนไลน์",
  offline: "ออฟไลน์",
  alarm: "มีปัญหา",
};
