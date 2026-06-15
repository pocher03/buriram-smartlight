// src/lib/adapters/live.ts
// อ่านจาก Local PostgreSQL ผ่าน Prisma เท่านั้น (กฎเหล็ก #4 — ห้ามยิง API ต้นทางตรง)
// 🚧 จะ implement จริงใน Sprint 2 (DB + Pipeline) — ตอนนี้เป็น stub

import type { DataAdapter } from "./types";

const NOT_READY = "live adapter จะพร้อมใช้งานใน Sprint 2 (DB + Pipeline)";

const liveAdapter: DataAdapter = {
  source: "live",
  async getProjects() {
    throw new Error(NOT_READY);
  },
  async getZones() {
    throw new Error(NOT_READY);
  },
};

export default liveAdapter;
