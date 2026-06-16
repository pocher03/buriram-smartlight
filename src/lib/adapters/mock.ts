// src/lib/adapters/mock.ts
// ⚠️ Demo Mode — คืนค่าจาก mock-data เท่านั้น (ต้องมี banner "ข้อมูลสาธิต" บน UI)

import {
  MOCK_PROJECTS,
  MOCK_ZONES,
  MOCK_DEVICES,
  MOCK_KPI,
  MOCK_ALARMS,
  MOCK_MAINTENANCE,
  MOCK_WEATHER,
  MOCK_FAULT_AREAS,
  buildEnergy,
} from "../mock-data";
import type { EnergyPeriod } from "../types";
import type { DataAdapter } from "./types";

const mockAdapter: DataAdapter = {
  source: "mock",
  async getProjects() {
    return MOCK_PROJECTS;
  },
  async getZones(projectId: string) {
    return MOCK_ZONES.filter((z) => z.projectId === projectId);
  },
  async getDashboard() {
    return {
      kpi: MOCK_KPI,
      devices: MOCK_DEVICES,
      alarms: MOCK_ALARMS,
      maintenance: MOCK_MAINTENANCE,
      weather: MOCK_WEATHER,
      faultAreas: MOCK_FAULT_AREAS,
    };
  },
  async getEnergy(_projectId: string, period: EnergyPeriod) {
    return buildEnergy(period);
  },
};

export default mockAdapter;
