// src/lib/device-status.ts
// แปลงสถานะอุปกรณ์เป็นค่าที่ UI ใช้แสดงสี
//
//   lit     = ออนไลน์ + ไฟติด  (กำลังไฟ > 20 W)
//   online  = ออนไลน์ + ไฟดับ  (controller เชื่อมต่อได้ แต่ไม่จ่ายไฟให้โคม)
//   offline = ติดต่อไม่ได้
//
// ตัดสิน "ไฟติด" จากกำลังไฟจริง ไม่ใช้ switchStatus เพราะค่าจากต้นทางค้างที่ 0 เสมอ
// (ยืนยันแล้ว ก.ย. 2569: actp 150 W ขณะที่ switchStatus = 0)

import type { Device, DeviceStatus } from "./types";

/** เกณฑ์ไฟติด — ข้อมูลจริง โคมที่ติดกินไฟต่ำสุด 44.4 W · ใช้ค่าเดียวกันทั้งระบบ */
export const LAMP_ON_POWER_W = 20;

/** สถานะแสดงผลของอุปกรณ์ — null-safe (ไม่มีค่า → ถือว่าออฟไลน์/ไฟดับ) */
export const deviceStatus = (d: Device): DeviceStatus => {
  if (d.telemetry.onlineStatus !== 1) return "offline";
  return (d.telemetry.actp ?? 0) > LAMP_ON_POWER_W ? "lit" : "online";
};

export const STATUS_COLOR: Record<DeviceStatus, string> = {
  lit: "#ffd600",      // เหลือง — ไฟติด
  online: "#00e676",   // เขียว — ออนไลน์ ไฟดับ
  offline: "#ff1744",  // แดง — ออฟไลน์
  alarm: "#ff9100",    // ส้ม — สงวนไว้ใช้กับสถานะมีปัญหา (เดิมเป็นเหลือง ย้ายเพื่อไม่ชนกับไฟติด)
};

export const STATUS_LABEL: Record<DeviceStatus, string> = {
  lit: "ออนไลน์ · ไฟติด",
  online: "ออนไลน์ · ไฟดับ",
  offline: "ออฟไลน์",
  alarm: "มีปัญหา",
};