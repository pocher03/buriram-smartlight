// src/lib/mock-data.ts
// ⚠️ ข้อมูลสาธิต (Demo Mode) — โซนจริง + mapping อุปกรณ์ยังรอทีมยืนยัน (ดู open issues ใน CLAUDE.md)
// ใช้สำหรับ Sprint 0–1 และ Demo Mode เท่านั้น — ห้ามใช้ใน Production

import type { DeviceType } from "./device-profiles";

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
  { id: "bru-z1", projectId: "buriram", name: "โซน 1 — รอบศาลากลาง" },
  { id: "bru-z2", projectId: "buriram", name: "โซน 2 — สถานีรถไฟบุรีรัมย์" },
  { id: "bru-z3", projectId: "buriram", name: "โซน 3 — ถนนจิระ" },
  { id: "bru-z4", projectId: "buriram", name: "โซน 4 — ตลาดเทศบาล" },
  { id: "bru-z5", projectId: "buriram", name: "โซน 5 — สวนสาธารณะ" },
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
