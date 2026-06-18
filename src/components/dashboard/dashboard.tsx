"use client";

import { useMemo, useState } from "react";
import type { Zone } from "@/lib/mock-data";
import type { DashboardData } from "@/lib/adapters/types";
import type { EnergyPeriod, EnergySeries } from "@/lib/types";
import { DemoBanner } from "@/components/shared/demo-banner";
import { Header } from "./header";
import { KpiColumn } from "./kpi-column";
import { MapPanel } from "./map-panel";
import { LogsPanel } from "./logs-panel";
import { BottomRow } from "./bottom-row";
import { MobileLayout } from "./mobile-layout";

export interface DashboardUser {
  name: string;
  email: string;
  role: "admin" | "super_admin";
  isCrossProject: boolean;
  activeProjectId: string;
}

interface DashboardProps {
  source: "mock" | "live";
  user: DashboardUser;
  zones: Zone[];
  data: DashboardData;
  energy: Record<EnergyPeriod, EnergySeries>;
}

export function Dashboard({ source, user, zones, data, energy }: DashboardProps) {
  const [selectedZone, setSelectedZone] = useState("all");
  const [period, setPeriod] = useState<EnergyPeriod>("month");

  const devices = useMemo(
    () =>
      selectedZone === "all"
        ? data.devices
        : data.devices.filter((d) => d.zoneName === selectedZone),
    [data.devices, selectedZone]
  );

  const alarms = useMemo(
    () =>
      selectedZone === "all"
        ? data.alarms
        : data.alarms.filter((a) => a.zoneName === selectedZone),
    [data.alarms, selectedZone]
  );

  const faultAreas = useMemo(
    () =>
      selectedZone === "all"
        ? data.faultAreas
        : data.faultAreas.filter((f) => f.name === selectedZone),
    [data.faultAreas, selectedZone]
  );

return (
    <div className="flex flex-col h-screen overflow-hidden">
      {source === "mock" && <DemoBanner />}

      <Header
        zones={zones}
        selectedZone={selectedZone}
        onZoneChange={setSelectedZone}
        weather={data.weather}
        user={user}
      />

      {/* ───── Desktop layout (≥768px) — 3-column grid + bottom row (ไม่เปลี่ยนของเดิม) ───── */}
      <div className="hidden md:flex flex-1 min-h-0 flex-col overflow-hidden">
        <div
          className="flex-1 min-h-0 grid overflow-hidden"
          style={{ gridTemplateColumns: "1fr 55% 1fr" }}
        >
          <KpiColumn maintenance={data.maintenance} devices={devices} />
          <MapPanel devices={devices} />
          <LogsPanel alarms={alarms} />
        </div>

        <BottomRow
          energy={energy[period]}
          period={period}
          onPeriodChange={setPeriod}
          faultAreas={faultAreas}
        />
      </div>

      {/* ───── Mobile layout (<768px) — Bottom Tab Bar 4 แท็บ เต็มจอทีละแท็บ ───── */}
      <MobileLayout
        devices={devices}
        alarms={alarms}
        maintenance={data.maintenance}
        user={user}
        energy={energy[period]}
        period={period}
        onPeriodChange={setPeriod}
        faultAreas={faultAreas}
      />

      {/* Footer (desktop only — แถบข้อมูลแนวนอนล้นจอบน mobile) */}
      <div className="hidden md:flex flex-shrink-0 h-6 bg-sf-3 dark:bg-dk-sf border-t border-bdr dark:border-dk-bdr items-center px-4 gap-3 text-[10px] text-t3">
        
        {/* กลุ่มข้อมูลด้านซ้าย (โหมด + Sync + Uptime) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span>โหมดข้อมูล:</span>
            <strong className={source === "mock" ? "text-yel" : "text-grn"}>
              {source === "mock" ? "สาธิต (Mock)" : "ใช้งานจริง (Live)"}
            </strong>
          </div>

          <div className="w-px h-3 bg-bdr dark:bg-dk-bdr" />

          <div className="flex items-center gap-1" title="เวลาที่ดึงข้อมูลล่าสุดจากระบบต้นทาง">
            <span className="ms text-blu" style={{ fontSize: 12 }}>sync</span>
            <span>Last Sync: <strong className="text-t2 dark:text-dk-t2 tracking-wider">{data.lastSync || "--:--:--"}</strong></span>
          </div>

          <div className="w-px h-3 bg-bdr dark:bg-dk-bdr" />

          <div className="flex items-center gap-1" title="ระยะเวลาที่ระบบทำงานต่อเนื่อง">
            <span className="ms text-grn" style={{ fontSize: 12 }}>memory</span>
            <span>UPTIME: <strong className="text-t2 dark:text-dk-t2 tracking-wider">{data.uptime || "--"}</strong></span>
          </div>
        </div>

        {/* ตัวดันเนื้อหาเครดิตให้ไปอยู่ขวาสุด (Spacer) */}
        <div className="flex-1" />

        {/* เครดิตด้านขวา (ใช้ ml-auto เพื่อดันกล่องนี้ไปชิดขวาสุดเสมอ) */}
        <div className="ml-auto flex items-center gap-1">
          พัฒนาโดย
          <strong className="text-t2 dark:text-dk-t2">บริษัท จัมโบ้ อิเล็คทรอนิคส์ จำกัด</strong>
          <span className="mx-1">|</span>v1.0.0
        </div>
        
      </div>
    </div>
  );
}