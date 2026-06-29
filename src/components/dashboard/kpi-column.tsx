"use client";

import type { Device, MaintenanceStatus } from "@/lib/types";

interface KpiColumnProps {
  maintenance: MaintenanceStatus;
  devices: Device[];
}

function StatBlock({
  title,
  pct,
  pctColorClass,
  rows,
}: {
  title: string;
  pct: number | null;
    pctColorClass: string;
  rows: { label: string; value: number; color: string }[];
}) {
  return (
    <div className="bg-sf-2 dark:bg-dk-sf2 rounded-xl p-2.5 border border-bdr/60 dark:border-dk-bdr mb-2.5">
      <div className="flex items-center gap-3">
        {/* ซ้าย: % ใหญ่ */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 pr-3 border-r border-bdr/60 dark:border-dk-bdr min-w-[72px]">
          <div className={`text-2xl font-extrabold leading-none ${pctColorClass}`}>
            {pct == null ? "--" : `${pct.toFixed(0)}%`}
          </div>
          <div className="text-[9px] text-t3 mt-1 font-medium text-center">{title}</div>
        </div>
        {/* ขวา: ตัวเลขย่อยแถวเดียว */}
        <div className="flex-1 flex items-center justify-around gap-1">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.color}`} />
                <span className="text-[9px] text-t3 leading-none">{r.label}</span>
              </div>
              <div className="text-base font-bold tabular-nums leading-none text-t1 dark:text-dk-t1">
                {r.value}
              </div>
            </div>
          ))}
        </div>
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
  const offline = total - online;
  const onlinePct = total > 0 ? (online / total) * 100 : null;

  return (
    <div className="flex flex-col overflow-hidden bg-sf dark:bg-dk-sf border-r border-bdr dark:border-dk-bdr">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="text-[9px] font-bold text-t3 uppercase tracking-widest mb-2 px-1">
          ภาพรวมอุปกรณ์
        </div>

        <StatBlock
          title="สถานะไฟ"
          pct={lightingPct}
          pctColorClass="text-yel"
          rows={[
            { label: "ไฟเปิด", value: onLights, color: "bg-grn" },
            { label: "ไฟปิด", value: offLights, color: "bg-t3" },
          ]}
        />

        <StatBlock
          title="สถานะออนไลน์"
          pct={onlinePct}
          pctColorClass="text-grn"
          rows={[
            { label: "ออนไลน์", value: online, color: "bg-grn" },
            { label: "ออฟไลน์", value: offline, color: "bg-red" },
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