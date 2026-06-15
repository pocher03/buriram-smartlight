// src/lib/adapters/types.ts
// Contract กลางของ Data Adapter — mock (Sprint 0–1, Demo) | live (Sprint 2+, Local DB)
// ⚠️ Frontend อ่านผ่าน adapter เท่านั้น ห้ามยิง rulr-aiot.com ตรง (กฎเหล็ก #4)

import type { Project, Zone } from "../mock-data";

export interface DataAdapter {
  /** แหล่งข้อมูล ('mock' | 'live') — ใช้แสดง Demo banner */
  readonly source: "mock" | "live";
  getProjects(): Promise<Project[]>;
  getZones(projectId: string): Promise<Zone[]>;
}
