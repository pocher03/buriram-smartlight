// src/lib/device-profiles.ts
// "ชนิดอุปกรณ์" เป็นข้อมูล ไม่ใช่ค่า hardcode — UI/logic ปรับพฤติกรรมตามชนิด
// เฟสแรก: มีเฉพาะ controller (บุรีรัมย์ 26 ต้น) — สาขา solar พร้อมเมื่อมีอุปกรณ์จริง

export type DeviceType = "controller" | "solar";

export interface DeviceTypeProfile {
  hasBattery: boolean; // solar=true, controller=false
  expectAlwaysOnline: boolean; // solar=true, controller=false
  showSOC: boolean; // = hasBattery
}

export const DEVICE_PROFILES = {
  controller: {
    hasBattery: false,
    expectAlwaysOnline: false, // ออฟไลน์กลางวัน = ปกติ (ไม่ใช่ fault)
    showSOC: false,
  },
  solar: {
    hasBattery: true,
    expectAlwaysOnline: true, // ออฟไลน์ทุกเวลา = fault
    showSOC: true,
  },
} satisfies Record<DeviceType, DeviceTypeProfile>;
