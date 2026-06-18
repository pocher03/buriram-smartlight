"use client";

// MobileLayout (mobile only, <768px) — แค่ "จัดวาง" ไม่มี logic คำนวณใดๆ
// re-use component เดิมตรงๆ: KpiColumn / MapPanel / LogsPanel / ProfileTab
//
// สำคัญ: เก็บทั้ง 4 แท็บไว้ใน DOM ตลอด สลับด้วย CSS (hidden) เท่านั้น
//   - ห้าม unmount/remount → กัน Leaflet re-init ทุกครั้งที่สลับแท็บ
//   - แผนที่รับ active={activeTab==='map'} → เรียก invalidateSize() เมื่อแท็บแสดงผล
//     (กัน Leaflet คำนวณขนาด container เป็น 0x0 ตอนถูกซ่อนด้วย display:none)
import { useState } from "react";
import type {
  Device,
  AlarmLog,
  MaintenanceStatus,
  EnergyPeriod,
  EnergySeries,
  FaultArea,
} from "@/lib/types";
import type { DashboardUser } from "./dashboard";
import { KpiColumn } from "./kpi-column";
import { MapPanel } from "./map-panel";
import { LogsPanel } from "./logs-panel";
import { BottomRow } from "./bottom-row";
import { ProfileTab } from "./profile-tab";
import { BottomTabBar, type MobileTab } from "./bottom-tab-bar";

interface MobileLayoutProps {
  devices: Device[];
  alarms: AlarmLog[];
  maintenance: MaintenanceStatus;
  user: DashboardUser;
  energy: EnergySeries;
  period: EnergyPeriod;
  onPeriodChange: (p: EnergyPeriod) => void;
  faultAreas: FaultArea[];
}

/** ห่อแต่ละแท็บ: เต็มจอเสมอ ซ่อนด้วย CSS เมื่อไม่ active (ไม่ unmount) */
function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  // [&>*]:h-full → บังคับ component ลูก (KpiColumn/LogsPanel/MapPanel/ProfileTab)
  // ให้สูงเต็มแท็บ เพื่อให้ scroll ภายในของแต่ละ panel ทำงาน (เดิมพึ่งความสูงจาก grid)
  return (
    <div className={`h-full [&>*]:h-full ${active ? "block" : "hidden"}`}>
      {children}
    </div>
  );
}

export function MobileLayout({
  devices,
  alarms,
  maintenance,
  user,
  energy,
  period,
  onPeriodChange,
  faultAreas,
}: MobileLayoutProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("overview");

  return (
    <div className="md:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* พื้นที่เนื้อหา — ทุกแท็บอยู่ใน DOM ตลอด สลับด้วย CSS */}
      <div className="flex-1 min-h-0 relative">
        {/* แท็บภาพรวม: KpiColumn + BottomRow ต่อท้าย — scroll ภายในแท็บนี้ได้
            (ไม่ขัดกฎ single-screen เพราะ scroll อยู่ภายใน panel ไม่ใช่หน้าหลัก) */}
        <TabPanel active={activeTab === "overview"}>
          <div className="h-full overflow-y-auto overflow-x-hidden">
            <KpiColumn maintenance={maintenance} devices={devices} />
            <BottomRow
              energy={energy}
              period={period}
              onPeriodChange={onPeriodChange}
              faultAreas={faultAreas}
            />
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "map"}>
          <MapPanel devices={devices} active={activeTab === "map"} />
        </TabPanel>

        <TabPanel active={activeTab === "history"}>
          <LogsPanel alarms={alarms} />
        </TabPanel>

        <TabPanel active={activeTab === "profile"}>
          <ProfileTab user={user} />
        </TabPanel>
      </div>

      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
