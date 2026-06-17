"use client";

import type { Kpi, MaintenanceStatus } from "@/lib/types";
import { display } from "@/lib/null-safe";
import { AvailabilityGauge } from "./availability-gauge";

interface KpiColumnProps {
  kpi: Kpi;
  maintenance: MaintenanceStatus;
}

const pctOf = (n: number | null, total: number | null) =>
  n != null && total && total > 0 ? `${((n / total) * 100).toFixed(2)}%` : "--";

export function KpiColumn({ kpi, maintenance }: KpiColumnProps) {
  const total = kpi.lightTotal ?? 0;
  const online = kpi.lightOnlineNum ?? 0;
  const offline = kpi.lightOfflineNum ?? 0;
  const alarm = kpi.alarmNum ?? 0;

  return (
    <div className="flex flex-col overflow-hidden bg-sf dark:bg-dk-sf border-r border-bdr dark:border-dk-bdr">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="text-[9px] font-bold text-t3 uppercase tracking-widest mb-2 px-1">
          ภาพรวมอุปกรณ์
        </div>

        <AvailabilityGauge
          online={online}
          alarm={alarm}
          offline={offline}
          total={total}
        />

        <div className="stagger space-y-2 mb-4">
          {/* ทั้งหมด */}
          <div className="kpi-card flex items-center gap-2.5 p-2.5 rounded-xl bg-sf-2 dark:bg-dk-sf2 border border-bdr/60 dark:border-dk-bdr">
            <div className="w-9 h-9 rounded-xl bg-blu-lt dark:bg-blu/15 flex items-center justify-center flex-shrink-0">
              <span className="ms ms-f text-blu" style={{ fontSize: 19 }}>
                streetview
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-t2 dark:text-dk-t2">โคมไฟทั้งหมด</div>
              <div className="text-xl font-bold text-t1 dark:text-dk-t1 leading-tight">
                {display(kpi.lightTotal)}
              </div>
            </div>
            <div className="text-[9px] text-t3 font-medium">ต้น</div>
          </div>

          {/* ออนไลน์ */}
          <div className="kpi-card flex items-center gap-2.5 p-2.5 rounded-xl bg-sf-2 dark:bg-dk-sf2 border border-bdr/60 dark:border-dk-bdr">
            <div className="w-9 h-9 rounded-xl bg-grn-lt dark:bg-grn/15 flex items-center justify-center flex-shrink-0">
              <span className="ms ms-f text-grn" style={{ fontSize: 19 }}>
                check_circle
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-t2 dark:text-dk-t2">ออนไลน์</div>
              <div className="text-xl font-bold text-grn leading-tight">
                {display(kpi.lightOnlineNum)}
              </div>
              <div className="text-[9px] text-t3 mt-0.5">{pctOf(kpi.lightOnlineNum, total)}</div>
            </div>
          </div>

          {/* ออฟไลน์ */}
          <div className="kpi-card flex items-center gap-2.5 p-2.5 rounded-xl bg-sf-2 dark:bg-dk-sf2 border border-bdr/60 dark:border-dk-bdr">
            <div className="w-9 h-9 rounded-xl bg-red-lt dark:bg-red/15 flex items-center justify-center flex-shrink-0">
              <span className="ms ms-f text-red" style={{ fontSize: 19 }}>
                cancel
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-t2 dark:text-dk-t2">ออฟไลน์</div>
              <div className="text-xl font-bold text-red leading-tight">
                {display(kpi.lightOfflineNum)}
              </div>
              <div className="text-[9px] text-t3 mt-0.5">{pctOf(kpi.lightOfflineNum, total)}</div>
            </div>
          </div>
        </div>

        {/* งานซ่อมบำรุง */}
        <div className="text-[9px] font-bold text-t3 uppercase tracking-widest mb-2 px-1">
          สถานะงานซ่อมบำรุง
        </div>
        <div className="space-y-1.5 mb-4">
          <MaintRow color="bg-yel" badge="bg-yel-lt dark:bg-yel/15 text-yel" label="รอดำเนินการ" value={maintenance.pending} />
          <MaintRow color="bg-blu" badge="bg-blu-lt dark:bg-blu/15 text-blu" label="กำลังดำเนินการ" value={maintenance.processing} />
          <MaintRow color="bg-grn" badge="bg-grn-lt dark:bg-grn/15 text-grn" label="แล้วเสร็จ" value={maintenance.done} />
        </div>
      </div>
    </div>
  );
}

function MaintRow({
  color,
  badge,
  label,
  value,
}: {
  color: string;
  badge: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-sf-2 dark:bg-dk-sf2 border border-bdr/50 dark:border-dk-bdr transition">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
      <div className="flex-1 text-[11px] text-t1 dark:text-dk-t1 truncate">{label}</div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{value}</span>
    </div>
  );
}