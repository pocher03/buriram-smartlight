"use client";

import { useState } from "react";
import type { AlarmLog } from "@/lib/types";
import { parseUTC } from "@/lib/null-safe";

type Tab = "hw" | "cmd" | "cfg";

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
  const d = parseUTC(iso);
  return d
    ? d.toLocaleString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
      })
    : "--";
};

export function LogsPanel({ alarms }: { alarms: AlarmLog[] }) {
  const [tab, setTab] = useState<Tab>("hw");

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
        <select className="w-full text-[11px] text-t1 dark:text-dk-t1 bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr rounded-lg px-3 py-1.5 focus:outline-none transition mb-2">
          <option>วันนี้</option>
          <option>3 วัน</option>
          <option>7 วัน</option>
          <option>30 วัน</option>
          <option>90 วัน</option>
          <option>กำหนดเอง</option>
        </select>
        <div className="flex gap-0.5 bg-sf-3 dark:bg-dk-sf2 rounded-xl p-1">
          <button className={tabClass("hw")} onClick={() => setTab("hw")}>
            ฮาร์ดแวร์
          </button>
          <button className={tabClass("cmd")} onClick={() => setTab("cmd")}>
            คำสั่งการ
          </button>
          <button className={tabClass("cfg")} onClick={() => setTab("cfg")}>
            ตั้งค่าระบบ
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2">
        {tab === "hw" ? (
          alarms.length === 0 ? (
            <EmptyFeed text="ไม่พบรายการแจ้งเตือน" />
          ) : (
            <div className="space-y-1.5">
              {alarms.map((a) => {
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
          )
        ) : (
          <EmptyFeed text="พร้อมใช้งานใน Phase 2 (ยังไม่ทดสอบ endpoint ต้นทาง)" />
        )}
      </div>
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
