"use client";

// Modal แสดง access_logs — single-screen (ตารางมี scroll ภายในตามกฎเหล็ก #2)
// variant "me"  → ประวัติ session ของตัวเอง (/api/access-logs/me)
// variant "all" → บันทึกการเข้าใช้งานระบบ ภาพรวม (/api/access-logs)
import { useEffect, useState } from "react";

type Variant = "me" | "all";
type Range = "today" | "7d" | "30d" | "all";

interface LogItem {
  username?: string | null;
  action: string;
  activeProjectId?: string | null;
  ip?: string | null;
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  login: "เข้าสู่ระบบ",
  login_failed: "เข้าสู่ระบบล้มเหลว",
  logout: "ออกจากระบบ",
  select_project: "เลือกโครงการ",
};

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "วันนี้" },
  { key: "7d", label: "7 วัน" },
  { key: "30d", label: "30 วัน" },
  { key: "all", label: "ล่าสุด 100" },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--";
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
}

function isFail(action: string): boolean {
  return action === "login_failed";
}

/** หนีอักขระพิเศษสำหรับ CSV (ครอบด้วย "..." และ escape เครื่องหมายคำพูด) */
function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

/** สร้าง CSV จากรายการที่แสดงอยู่ แล้วสั่งดาวน์โหลด (BOM เพื่อให้ Excel อ่านไทยถูก) */
function exportCsv(variant: Variant, items: LogItem[]): void {
  const header =
    variant === "all"
      ? ["เวลา", "ผู้ใช้งาน", "การกระทำ", "โครงการ", "IP", "ผลลัพธ์"]
      : ["เวลา", "การกระทำ", "โครงการ", "IP", "ผลลัพธ์"];
  const lines = items.map((it) => {
    const result = isFail(it.action) ? "ล้มเหลว" : "สำเร็จ";
    const action = ACTION_LABEL[it.action] || it.action;
    const cols =
      variant === "all"
        ? [
            fmtTime(it.createdAt),
            it.username || "--",
            action,
            it.activeProjectId || "--",
            it.ip || "--",
            result,
          ]
        : [
            fmtTime(it.createdAt),
            action,
            it.activeProjectId || "--",
            it.ip || "--",
            result,
          ];
    return cols.map(csvCell).join(",");
  });
  const csv = "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `access-logs-${variant}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AccessLogModal({
  variant,
  onClose,
}: {
  variant: Variant;
  onClose: () => void;
}) {
  const [range, setRange] = useState<Range>("all");
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const title =
    variant === "me" ? "ประวัติ Session ของฉัน" : "บันทึกการเข้าใช้งานระบบ";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const base = variant === "me" ? "/api/access-logs/me" : "/api/access-logs";
    const url = range === "all" ? base : `${base}?range=${range}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        setItems(Array.isArray(d.items) ? d.items : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [variant, range]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="dropdown-in w-full max-w-3xl max-h-[80vh] flex flex-col bg-sf dark:bg-dk-sf border border-bdr dark:border-dk-bdr rounded-2xl shadow-g3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-bdr dark:border-dk-bdr flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="ms ms-f text-blu" style={{ fontSize: 20 }}>
              {variant === "me" ? "history" : "shield_person"}
            </span>
            <span className="text-sm font-bold text-t1 dark:text-dk-t1">
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-t3 hover:bg-sf-3 dark:hover:bg-dk-sf2 transition"
            title="ปิด"
          >
            <span className="ms" style={{ fontSize: 20 }}>
              close
            </span>
          </button>
        </div>

        {/* Range filter + export */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-bdr dark:border-dk-bdr flex-shrink-0">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition border ${
                range === r.key
                  ? "bg-blu text-white border-blu"
                  : "bg-sf-3 dark:bg-dk-sf2 text-t2 dark:text-dk-t2 border-bdr dark:border-dk-bdr hover:border-blu/40"
              }`}
            >
              {r.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => exportCsv(variant, items)}
            disabled={loading || items.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition border bg-grn-lt dark:bg-grn/15 text-grn border-grn/20 hover:border-grn/50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="ดาวน์โหลด CSV"
          >
            <span className="ms" style={{ fontSize: 15 }}>
              download
            </span>
            <span>Export CSV</span>
          </button>
        </div>

        {/* Table (scroll ภายใน) */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-sf-3 dark:bg-dk-sf2 z-10">
              <tr className="text-[10px] uppercase tracking-wide text-t3">
                <th className="px-4 py-2 font-semibold">เวลา</th>
                {variant === "all" && (
                  <th className="px-4 py-2 font-semibold">ผู้ใช้งาน</th>
                )}
                <th className="px-4 py-2 font-semibold">การกระทำ</th>
                {variant === "all" && (
                  <th className="px-4 py-2 font-semibold">โครงการ</th>
                )}
                <th className="px-4 py-2 font-semibold">IP</th>
                <th className="px-4 py-2 font-semibold">ผลลัพธ์</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-t3"
                  >
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-red"
                  >
                    ไม่สามารถโหลดข้อมูลได้
                  </td>
                </tr>
              )}
              {!loading && !error && items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-t3"
                  >
                    ไม่พบรายการ
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                items.map((it, i) => {
                  const fail = isFail(it.action);
                  return (
                    <tr
                      key={i}
                      className="border-t border-bdr dark:border-dk-bdr hover:bg-sf-3 dark:hover:bg-dk-sf2 transition"
                    >
                      <td className="px-4 py-2 text-[11px] text-t2 dark:text-dk-t2 tabular-nums whitespace-nowrap">
                        {fmtTime(it.createdAt)}
                      </td>
                      {variant === "all" && (
                        <td className="px-4 py-2 text-[11px] font-medium text-t1 dark:text-dk-t1">
                          {it.username || "--"}
                        </td>
                      )}
                      <td className="px-4 py-2 text-[11px] text-t1 dark:text-dk-t1">
                        {ACTION_LABEL[it.action] || it.action}
                      </td>
                      {variant === "all" && (
                        <td className="px-4 py-2 text-[11px] text-t2 dark:text-dk-t2">
                          {it.activeProjectId || "--"}
                        </td>
                      )}
                      <td className="px-4 py-2 text-[11px] text-t2 dark:text-dk-t2 tabular-nums">
                        {it.ip || "--"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            fail
                              ? "bg-red/10 text-red"
                              : "bg-grn-lt dark:bg-grn/15 text-grn"
                          }`}
                        >
                          {fail ? "ล้มเหลว" : "สำเร็จ"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="px-5 py-2 border-t border-bdr dark:border-dk-bdr flex-shrink-0">
        </div>
      </div>
    </div>
  );
}