"use client";

import type { Device, Kpi, MaintenanceStatus } from "@/lib/types";

interface KpiColumnProps {
  kpi: Kpi;
  maintenance: MaintenanceStatus;
  devices: Device[];
}

function StatBlock({
  title,
  pct,
  rows,
}: {
  title: string;
  pct: number | null;
  rows: { label: string; value: number; color: string }[];
}) {
  return (
    <div className="bg-sf-2 dark:bg-dk-sf2 rounded-xl p-3 border border-bdr/60 dark:border-dk-bdr mb-2.5">
      <div className="text-center mb-2">
        <div className="text-3xl font-extrabold leading-none text-grn">
          {pct == null ? "--" : `${pct.toFixed(2)}%`}
        </div>
        <div className="text-[10px] text-t3 mt-1 font-medium">{title}</div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-1.5 py-2 px-2 rounded-lg bg-sf dark:bg-dk-sf border border-bdr/50 dark:border-dk-bdr"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.color}`} />
            <div className="min-w-0">
              <div className="text-[8px] text-t3 leading-none">{r.label}</div>
              <div className="text-sm font-bold tabular-nums leading-tight text-t1 dark:text-dk-t1">
                {r.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpiColumn({ maintenance, devices }: KpiColumnProps) {
  const total = devices.length;

  const onLights = devices.filter((d) => d.telemetry.switchStatus === 1).length;
  const offLights = devices.filter((d) => d.telemetry.switchStatus === 0).length;
  const lightingPct = total > 0 ? (onLights / total) * 100 : null;

  const online = devices.filter((d) => d.telemetry.onlineStatus === 1).length;
  const onlinePct = total > 0 ? (online / total) * 100 : null;

  return (
    <div className="flex flex-col overflow-hidden bg-sf dark:bg-dk-sf border-r border-bdr dark:border-dk-bdr">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="text-[9px] font-bold text-t3 uppercase tracking-widest mb-2 px-1">
          ภาพรวมอุปกรณ์
        </div>

        <StatBlock
          title="สถานะไฟ (Lighting %)"
          pct={lightingPct}
          rows={[
            { label: "ไฟเปิด", value: onLights, color: "bg-grn" },
            { label: "ไฟปิด", value: offLights, color: "bg-t3" },
          ]}
        />

        <StatBlock
          title="สถานะออนไลน์ (Online %)"
          pct={onlinePct}
          rows={[
            { label: "ออนไลน์", value: online, color: "bg-grn" },
            { label: "ทั้งหมด", value: total, color: "bg-blu" },
          ]}
        />

        <div className="text-[9px] font-bold text-t3 uppercase tracking-widest mb-2 px-1">
          สถานะงานซ่อมบำรุง
        </div>
        <div className="space-y-1.5 mb-4">
          <MaintRow color="bg-yel" badge="bg-yel-lt dark:bg-yel/15 text-yel" label="รอดำเนินการ" value={maintenance.pending} />
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