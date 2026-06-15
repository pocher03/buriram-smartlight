// src/lib/adapters/mock.ts
// ⚠️ Demo Mode — คืนค่าจาก mock-data เท่านั้น (ต้องมี banner "ข้อมูลสาธิต" บน UI)

import { MOCK_PROJECTS, MOCK_ZONES } from "../mock-data";
import type { DataAdapter } from "./types";

const mockAdapter: DataAdapter = {
  source: "mock",
  async getProjects() {
    return MOCK_PROJECTS;
  },
  async getZones(projectId: string) {
    return MOCK_ZONES.filter((z) => z.projectId === projectId);
  },
};

export default mockAdapter;
