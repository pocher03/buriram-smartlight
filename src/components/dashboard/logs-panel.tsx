"use client";

import type { AlarmLog } from "@/lib/types";
import { parseUTC } from "@/lib/null-safe";
import { useEffect, useState } from "react";

type Tab = "hw" | "cmd";

const DAY_OPTIONS = [
  { label: "วันนี้", value: 1 },
  { label: "3 วัน", value: 3 },
  { label: "7 วัน", value: 7 },
  { label: "30 วัน", value: 30 },
  { label: "90 วัน", value: 90 },
];

const SEV_STYLE: Record<AlarmLog["alarmLevel"], { badge: string; icon: string }> = {
  crit: { badge: "bg-red-lt text-red dark:bg-red/15", icon: "error" },
  warn: { badge: "bg-yel-lt text-yel dark:bg-yel/15", icon: "warning" },
  info: { badge: "bg-blu-lt text-blu dark:bg-blu/15", icon: "info" },
  ok: { badge: "bg-grn-lt text-grn dark:bg-grn/15", icon: "check_circle" },
};

const HANDLE_LABEL: Record<AlarmLog["handleStatus"], string> = {
  pending: "รอดำเนินการ",
  processing: "กำลังดำเนินการ",
  done: "แล้วเสร็จ",
};

const fmtTime = (iso: string) => {
  console.log("fmtTime input:", iso); // เพิ่มบรรทัดนี้
  const d = parseUTC(iso);
  return d
    ? d.toLocaleString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
      })
    : "--";
};

interface ControlLog {
  username: string | null;
  object_name: string | null;
  operate_describe: string | null;
  act_type: number | null;
  error_code: number | null;
  error_details: string | null;
  occurred_at: string | null;
}

function useControlLogs(days: number) {
  const [logs, setLogs] = useState<ControlLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/logs/service-control?page=0&size=50&days=${days}`)
      .then((r) => r.json())
      .then((d) => setLogs(d.data ?? []))
      .finally(() => setLoading(false));
  }, [days]);
  return { logs, loading };
}

export function LogsPanel({ alarms }: { alarms: AlarmLog[] }) {
  const [tab, setTab] = useState<Tab>("hw");
  const [days, setDays] = useState(7);

  const tabClass = (t: Tab) =>
    `tab-btn flex-1 text-[9px] font-medium py-1.5 px-1 rounded-lg text-center ${
      tab === t
        ? "bg-sf dark:bg-dk-sf text-blu shadow-g1"
        : "text-t2 dark:text-dk-t2"
    }`;

  return (
    <div className="flex flex-col overflow-hidden bg-sf dark:bg-dk-sf border-l border-bdr dark:border-dk-bdr">
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-bdr dark:border-dk-bdr">
        <div className="flex items-center gap-2 mb-2">
          <span className="ms ms-f text-blu" style={{ fontSize: 16 }}>
            history
          </span>
          <span className="font-semibold text-t1 dark:text-dk-t1 text-xs">
            ประวัติระบบและการแจ้งเตือน
          </span>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-full text-[11px] text-t1 dark:text-dk-t1 bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr rounded-lg px-3 py-1.5 focus:outline-none transition mb-2"
        >
          {DAY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex gap-0.5 bg-sf-3 dark:bg-dk-sf2 rounded-xl p-1">
          <button className={tabClass("hw")} onClick={() => setTab("hw")}>
            ฮาร์ดแวร์
          </button>
          <button className={tabClass("cmd")} onClick={() => setTab("cmd")}>
            คำสั่งการ
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2">
        {tab === "hw" ? (
          (() => {
            const filtered = alarms.filter((a) => {
              const d = parseUTC(a.createdAt);
              if (!d) return true;
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - days);
              return d >= cutoff;
            });
            return filtered.length === 0 ? (
              <EmptyFeed text="ไม่พบรายการแจ้งเตือน" />
            ) : (
              <div className="space-y-1.5">
                {filtered.map((a) => {
                  const sev = SEV_STYLE[a.alarmLevel];
                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-sf-2 dark:bg-dk-sf2 border border-bdr/50 dark:border-dk-bdr"
                    >
                      <span
                        className={`ms ms-f flex-shrink-0 mt-0.5 ${sev.badge} rounded-md p-1`}
                        style={{ fontSize: 14 }}
                      >
                        {sev.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-t1 dark:text-dk-t1 truncate">
                            {a.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-t2 dark:text-dk-t2 truncate">
                          {a.deviceName} · {a.zoneName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-t3 tabular-nums">
                            {fmtTime(a.createdAt)}
                          </span>
                          <span className="text-[9px] text-t3">·</span>
                          <span className="text-[9px] text-t3">
                            {HANDLE_LABEL[a.handleStatus]}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : tab === "cmd" ? (
          <CmdTab days={days} />
        ) : null}
      </div>
    </div>
  );
}


function CmdTab({ days }: { days: number }) {
  const { logs, loading } = useControlLogs(days);
  if (loading) return <EmptyFeed text="กำลังโหลด..." />;
  if (logs.length === 0) return (
    <EmptyFeed text="ยังไม่มีบันทึกคำสั่งการ" />
  );
  return (
    <div className="space-y-1.5">
      {logs.map((l, i) => (
        <div key={i} className="p-2 rounded-lg bg-sf-2 dark:bg-dk-sf2 border border-bdr/50 dark:border-dk-bdr">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-semibold text-t1 dark:text-dk-t1 truncate">
              {l.operate_describe ?? "--"}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              l.error_code === 0
                ? "bg-grn-lt text-grn dark:bg-grn/15"
                : "bg-red-lt text-red dark:bg-red/15"
            }`}>
              {l.error_code === 0 ? "สำเร็จ" : "ผิดพลาด"}
            </span>
          </div>
          <div className="text-[10px] text-t2 dark:text-dk-t2 truncate">
            {l.object_name ?? "--"} · {l.username ?? "--"}
          </div>
          <div className="text-[9px] text-t3 tabular-nums mt-0.5">
            {l.occurred_at ? new Date(l.occurred_at).toLocaleString("th-TH", {
              timeZone: "Asia/Bangkok",
              day: "2-digit", month: "2-digit",
              hour: "2-digit", minute: "2-digit",
            }) : "--"}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyFeed({ text }: { text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-t3 gap-2 py-10">
      <span className="ms" style={{ fontSize: 28 }}>
        inbox
      </span>
      <span className="text-[11px]">{text}</span>
    </div>
  );
}