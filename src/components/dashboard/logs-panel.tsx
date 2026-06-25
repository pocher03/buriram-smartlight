"use client";

import type { AlarmLog } from "@/lib/types";
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
  ok:   { badge: "bg-grn-lt text-grn dark:bg-grn/15", icon: "check_circle" },
};

const HANDLE_LABEL: Record<AlarmLog["handleStatus"], string> = {
  pending:    "รอดำเนินการ",
  processing: "กำลังดำเนินการ",
  done:       "แล้วเสร็จ",
};

const LEVEL_LABEL: Record<AlarmLog["alarmLevel"], string> = {
  crit: "วิกฤต",
  warn: "เตือน",
  info: "ข้อมูล",
  ok:   "ปกติ",
};

const fmtTime = (iso: string) => {
  if (!iso) return "--";
  const clean = iso.endsWith("Z") ? iso.slice(0, -1) : iso;
  const d = new Date(clean);
  return Number.isNaN(d.getTime()) ? "--" : d.toLocaleString("th-TH", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
    hour12: false,
  });
};

// ── Export CSV ──────────────────────────────────────────────
function exportCSV(rows: AlarmLog[], days: number) {
  const header = ["ชื่อการแจ้งเตือน", "ชื่ออุปกรณ์", "โซน", "ระดับ", "เวลาเกิด", "สถานะ"];
  const body = rows.map((a) => [
    a.name,
    a.deviceName,
    a.zoneName ?? "--",
    LEVEL_LABEL[a.alarmLevel],
    fmtTime(a.createdAt),
    HANDLE_LABEL[a.handleStatus],
  ]);
  const csv = [header, ...body].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM สำหรับ Excel ภาษาไทย
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alarm-log-${days}days-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Alarm All Popup ──────────────────────────────────────────
interface AlarmAllPopupProps {
  alarms: AlarmLog[];
  days: number;
  onClose: () => void;
}

function AlarmAllPopup({ alarms, days, onClose }: AlarmAllPopupProps) {
  const [search, setSearch] = useState("");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const filtered = alarms
    .filter((a) => {
      const d = new Date(a.createdAt);
      if (Number.isNaN(d.getTime()) || d < cutoff) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return a.deviceName.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="dropdown-in w-full max-w-4xl bg-sf dark:bg-dk-sf rounded-2xl shadow-g3 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-bdr dark:border-dk-bdr flex-shrink-0">
          <span className="ms ms-f text-blu" style={{ fontSize: 18 }}>history</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-t1 dark:text-dk-t1">
              บันทึกการแจ้งเตือนทั้งหมด
            </div>
            <div className="text-[10px] text-t3">
              ย้อนหลัง {days} วัน · {filtered.length} รายการ
            </div>
          </div>
          {/* Export CSV */}
          <button
            onClick={() => exportCSV(filtered, days)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-grn-lt dark:bg-grn/15 text-grn border border-grn/20 text-[11px] font-semibold hover:bg-grn/20 transition"
          >
            <span className="ms ms-f" style={{ fontSize: 15 }}>download</span>
            Export CSV
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-t3 hover:bg-sf-3 dark:hover:bg-dk-sf2 transition flex-shrink-0"
          >
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-2.5 border-b border-bdr dark:border-dk-bdr flex-shrink-0">
          <div className="flex items-center gap-2 bg-sf-3 dark:bg-dk-sf2 rounded-xl px-3 py-1.5 border border-bdr dark:border-dk-bdr">
            <span className="ms text-t3" style={{ fontSize: 16 }}>search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาอุปกรณ์หรือประเภทการแจ้งเตือน..."
              className="flex-1 bg-transparent text-[11px] text-t1 dark:text-dk-t1 outline-none placeholder:text-t3"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-t3 hover:text-t1 transition">
                <span className="ms" style={{ fontSize: 16 }}>close</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-t3">
              <span className="ms" style={{ fontSize: 32 }}>inbox</span>
              <span className="text-[11px]">ไม่พบรายการแจ้งเตือน</span>
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-sf-3 dark:bg-dk-sf2 z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 text-t2 dark:text-dk-t2 font-semibold whitespace-nowrap">ชื่อการแจ้งเตือน</th>
                  <th className="text-left px-4 py-2.5 text-t2 dark:text-dk-t2 font-semibold whitespace-nowrap">ชื่ออุปกรณ์</th>
                  <th className="text-left px-4 py-2.5 text-t2 dark:text-dk-t2 font-semibold whitespace-nowrap">โซน</th>
                  <th className="text-left px-4 py-2.5 text-t2 dark:text-dk-t2 font-semibold whitespace-nowrap">ระดับ</th>
                  <th className="text-left px-4 py-2.5 text-t2 dark:text-dk-t2 font-semibold whitespace-nowrap">เวลาเกิด</th>
                  <th className="text-left px-4 py-2.5 text-t2 dark:text-dk-t2 font-semibold whitespace-nowrap">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const sev = SEV_STYLE[a.alarmLevel];
                  return (
                    <tr
                      key={a.id}
                      className={`border-t border-bdr/50 dark:border-dk-bdr hover:bg-sf-2 dark:hover:bg-dk-sf2 transition ${
                        i % 2 === 0 ? "" : "bg-sf-2/50 dark:bg-dk-sf2/30"
                      }`}
                    >
                      <td className="px-4 py-2 font-semibold text-t1 dark:text-dk-t1 whitespace-nowrap">{a.name}</td>
                      <td className="px-4 py-2 text-t2 dark:text-dk-t2 whitespace-nowrap">{a.deviceName}</td>
                      <td className="px-4 py-2 text-t3 whitespace-nowrap">{a.zoneName ?? "--"}</td>
                      <td className="px-4 py-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sev.badge}`}>
                          {LEVEL_LABEL[a.alarmLevel]}
                        </span>
                      </td>
                      <td className="px-4 py-2 tabular-nums text-t2 dark:text-dk-t2 whitespace-nowrap">{fmtTime(a.createdAt)}</td>
                      <td className="px-4 py-2 text-t3 whitespace-nowrap">{HANDLE_LABEL[a.handleStatus]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-2 border-t border-bdr dark:border-dk-bdr bg-sf-3 dark:bg-dk-sf2 text-[10px] text-t3">
          แสดง {filtered.length} รายการ
        </div>
      </div>
    </div>
  );
}

// ── Control Log ──────────────────────────────────────────────
interface ControlLog {
  username: string | null;
  object_name: string | null;
  operate_describe: string | null;
  act_type: number | null;
  error_code: number | null;
  error_details: string | null;
  occurred_at: string | null;
}

const OPERATE_TH: Record<string, string> = {
  "Query status": "ตรวจสอบสถานะ",
  "Turn on the light": "เปิดไฟ",
  "Turn off the lights": "ปิดไฟ",
  "Dimming": "ปรับความสว่าง",
  "Query firmware version service": "ตรวจสอบเวอร์ชัน firmware",
  "Query power and running time": "ตรวจสอบพลังงานและเวลาทำงาน",
  "Query timing strategy": "ตรวจสอบตารางเวลา",
  "Query latitude and longitude (strategy)": "ตรวจสอบพิกัด GPS",
  "Read local time": "อ่านเวลาท้องถิ่น",
  "Clear electric energy statistics": "รีเซ็ตสถิติพลังงาน",
  "Set the timing strategy master switch": "ตั้งค่าสวิตช์หลักตารางเวลา",
  "Read light sensor switch status": "อ่านสถานะเซนเซอร์แสง",
};
const toThai = (desc: string | null) => !desc ? "--" : (OPERATE_TH[desc] ?? desc);

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

// ── Main Component ───────────────────────────────────────────
export function LogsPanel({ alarms }: { alarms: AlarmLog[] }) {
  const [tab, setTab] = useState<Tab>("hw");
  const [days, setDays] = useState(7);
  const [selected, setSelected] = useState<AlarmLog | null>(null);
  const [showAll, setShowAll] = useState(false);

  const tabClass = (t: Tab) =>
    `tab-btn flex-1 text-[9px] font-medium py-1.5 px-1 rounded-lg text-center ${
      tab === t ? "bg-sf dark:bg-dk-sf text-blu shadow-g1" : "text-t2 dark:text-dk-t2"
    }`;

  return (
    <>
      <div className="flex flex-col overflow-hidden bg-sf dark:bg-dk-sf border-l border-bdr dark:border-dk-bdr">
        {/* Header */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-bdr dark:border-dk-bdr">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="ms ms-f text-blu" style={{ fontSize: 16 }}>history</span>
              <span className="font-semibold text-t1 dark:text-dk-t1 text-xs">
                ประวัติระบบและการแจ้งเตือน
              </span>
            </div>
            {/* ปุ่มดูทั้งหมด */}
            <button
              onClick={() => setShowAll(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr text-t2 dark:text-dk-t2 hover:text-blu hover:border-blu/40 transition text-[10px] font-medium"
              title="ดูทั้งหมดแบบตาราง"
            >
              <span className="ms" style={{ fontSize: 13 }}>open_in_full</span>
              ดูทั้งหมด
            </button>
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
            <button className={tabClass("hw")} onClick={() => setTab("hw")}>ฮาร์ดแวร์</button>
            <button className={tabClass("cmd")} onClick={() => setTab("cmd")}>คำสั่งการ</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2">
          {tab === "hw" ? (
            (() => {
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - days);
              const inRange = alarms.filter((a) => {
                const d = new Date(a.createdAt);
                return !Number.isNaN(d.getTime()) && d >= cutoff;
              });
              const seen = new Map<string, typeof alarms[0]>();
              for (const a of inRange) {
                const key = `${a.deviceName}__${a.name}`;
                const existing = seen.get(key);
                if (!existing || new Date(a.createdAt) > new Date(existing.createdAt)) {
                  seen.set(key, a);
                }
              }
              const deduped = Array.from(seen.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              return deduped.length === 0 ? (
                <EmptyFeed text="ไม่พบรายการแจ้งเตือน" />
              ) : (
                <div className="space-y-1.5">
                  {deduped.map((a) => {
                    const sev = SEV_STYLE[a.alarmLevel];
                    const histCount = alarms.filter(
                      (x) => x.deviceName === a.deviceName && x.name === a.name
                    ).length;
                    return (
                      <div
                        key={a.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-sf-2 dark:bg-dk-sf2 border border-bdr/50 dark:border-dk-bdr cursor-pointer hover:border-blu/30 transition"
                        onClick={() => setSelected(a)}
                        title="กดเพื่อดูประวัติทั้งหมด"
                      >
                        <span className={`ms ms-f flex-shrink-0 mt-0.5 ${sev.badge} rounded-md p-1`} style={{ fontSize: 14 }}>
                          {sev.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-semibold text-t1 dark:text-dk-t1 truncate">{a.name}</span>
                            {histCount > 1 && (
                              <span className="text-[9px] bg-sf-3 dark:bg-dk-sf2 text-t3 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                {histCount} ครั้ง
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-t2 dark:text-dk-t2 truncate">{a.deviceName} · {a.zoneName}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-t3 tabular-nums">{fmtTime(a.createdAt)}</span>
                            <span className="text-[9px] text-t3">·</span>
                            <span className="text-[9px] text-t3">{HANDLE_LABEL[a.handleStatus]}</span>
                          </div>
                        </div>
                        <span className="ms text-t3 flex-shrink-0 self-center" style={{ fontSize: 14 }}>chevron_right</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <CmdTab days={days} />
          )}
        </div>
      </div>

      {/* Popup ดูทั้งหมด + Export */}
      {showAll && (
        <AlarmAllPopup alarms={alarms} days={days} onClose={() => setShowAll(false)} />
      )}

      {/* Bottom Sheet ประวัติ device */}
      {selected && (
        <div
          className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/50"
          onClick={() => setSelected(null)}
        >
          <div
            className="sheet-in w-full md:max-w-lg bg-sf dark:bg-dk-sf rounded-t-2xl md:rounded-2xl shadow-g3 overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-bdr dark:border-dk-bdr flex-shrink-0">
              <div className="min-w-0">
                <div className="text-sm font-bold text-t1 dark:text-dk-t1 truncate">{selected.deviceName}</div>
                <div className="text-[10px] text-t3">ประวัติการแจ้งเตือน ({selected.name}) ทั้งหมด</div>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-t3 hover:bg-sf-3 dark:hover:bg-dk-sf2 transition flex-shrink-0 ml-2">
                <span className="ms" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
              {alarms
                .filter((a) => a.deviceName === selected.deviceName && a.name === selected.name)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((a, i) => {
                  const sev = SEV_STYLE[a.alarmLevel];
                  return (
                    <div key={a.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-sf-2 dark:bg-dk-sf2 border border-bdr/50 dark:border-dk-bdr">
                      <span className={`ms ms-f flex-shrink-0 ${sev.badge} rounded-md p-1`} style={{ fontSize: 13 }}>{sev.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-semibold text-t1 dark:text-dk-t1">{fmtTime(a.createdAt)}</div>
                        <div className="text-[9px] text-t3">{HANDLE_LABEL[a.handleStatus]} · {a.zoneName}</div>
                      </div>
                      {i === 0 && <span className="text-[9px] bg-blu text-white px-1.5 py-0.5 rounded-full flex-shrink-0">ล่าสุด</span>}
                    </div>
                  );
                })}
            </div>
            <div className="flex-shrink-0 px-4 py-2.5 border-t border-bdr dark:border-dk-bdr bg-sf-3 dark:bg-dk-sf2">
              <span className="text-[10px] text-t3">
                พบทั้งหมด{" "}
                <strong className="text-t1 dark:text-dk-t1">
                  {alarms.filter((a) => a.deviceName === selected.deviceName && a.name === selected.name).length}
                </strong>{" "}
                รายการในระบบ
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CmdTab({ days }: { days: number }) {
  const { logs, loading } = useControlLogs(days);
  if (loading) return <EmptyFeed text="กำลังโหลด..." />;
  if (logs.length === 0) return <EmptyFeed text="ยังไม่มีบันทึกคำสั่งการ" />;
  return (
    <div className="space-y-1.5">
      {logs.map((l, i) => (
        <div key={i} className="p-2 rounded-lg bg-sf-2 dark:bg-dk-sf2 border border-bdr/50 dark:border-dk-bdr">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-semibold text-t1 dark:text-dk-t1 truncate">{toThai(l.operate_describe)}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${l.error_code === 0 ? "bg-grn-lt text-grn dark:bg-grn/15" : "bg-red-lt text-red dark:bg-red/15"}`}>
              {l.error_code === 0 ? "สำเร็จ" : "ผิดพลาด"}
            </span>
          </div>
          <div className="text-[10px] text-t2 dark:text-dk-t2 truncate">{l.object_name ?? "--"} · {l.username ?? "--"}</div>
          <div className="text-[9px] text-t3 tabular-nums mt-0.5">
            {l.occurred_at ? new Date(l.occurred_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "--"}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyFeed({ text }: { text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-t3 gap-2 py-10">
      <span className="ms" style={{ fontSize: 28 }}>inbox</span>
      <span className="text-[11px]">{text}</span>
    </div>
  );
}
