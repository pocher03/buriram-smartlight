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

const POPUP_DAY_OPTIONS = DAY_OPTIONS;

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

/** เวลาของ alarm — ตัด Z ออกก่อน parse (DB เก็บเป็นเวลาไทยแล้ว) */
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

/** เวลาของ control log — DB เก็บ UTC จริง (มี Z) ต้องแปลงเป็นเวลาไทย */
const fmtCtrlTime = (iso: string | null) => {
  if (!iso) return "--";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "--"
    : d.toLocaleString("th-TH", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit",
        hour12: false, timeZone: "Asia/Bangkok",
      });
};

/** yyyy-MM-dd ตามเวลาเครื่อง (ไม่ใช้ toISOString เพราะจะเพี้ยน timezone) */
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ── ชนิดข้อมูล ───────────────────────────────────────────────
interface AlarmRow {
  id: string | number;
  deviceName: string;
  name: string;
  alarmLevel: AlarmLog["alarmLevel"];
  handleStatus: AlarmLog["handleStatus"];
  divisionName: string | null;
  createdAt: string;
}

interface ControlLog {
  username: string | null;
  object_name: string | null;
  operate_describe: string | null;
  act_type: number | null;
  error_code: number | null;
  error_details: string | null;
  occurred_at: string | null;
}

// ── แปลคำสั่งเป็นภาษาไทย ────────────────────────────────────
const OPERATE_TH: Record<string, string> = {
  "Query status": "ตรวจสอบสถานะ",
  "Read Status": "อ่านสถานะ",
  "Turn on the light": "เปิดไฟ",
  "Turn off the lights": "ปิดไฟ",
  "open light(or close circuit)": "เปิดไฟ (ต่อวงจร)",
  "close light(or break circuit)": "ปิดไฟ (ตัดวงจร)",
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

const toThai = (desc: string | null): string => {
  if (!desc) return "--";
  if (OPERATE_TH[desc]) return OPERATE_TH[desc];
  // ข้อความ dynamic — จับ pattern แทนการแปลตรงตัว
  if (desc.startsWith("name:") && desc.includes("model name:")) {
    const m = desc.match(/name:\s*([^,]+)/);
    const dev = m ? m[1].trim() : "";
    return `ลงทะเบียน/แก้ไขอุปกรณ์${dev ? ` (${dev})` : ""}`;
  }
  if (desc.startsWith("brightness:")) {
    const m = desc.match(/brightness:\s*(\d+)/);
    return `ปรับความสว่าง${m ? ` ${m[1]}%` : ""}`;
  }
  return desc;
};

// ── Hook: ดึง log คำสั่งการสำหรับ tab ───────────────────────
function useControlLogs(days: number, search: string) {
  const [logs, setLogs] = useState<ControlLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: "0",
      size: "100",
      days: String(days),
      ...(search ? { search } : {}),
    });
    fetch(`/api/logs/service-control?${params}`)
      .then((r) => r.json())
      .then((d) => setLogs(d.data ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [days, search]);
  return { logs, loading };
}

// ── Export CSV ──────────────────────────────────────────────
function toCsvBlob(header: string[], body: string[][]): Blob {
  const csv = [header, ...body].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  // BOM นำหน้า — Excel ถึงจะอ่านภาษาไทยถูก
  return new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAlarmCSV(rows: AlarmRow[], rangeLabel: string) {
  const blob = toCsvBlob(
    ["ชื่อการแจ้งเตือน", "ชื่ออุปกรณ์", "โซน", "ระดับ", "เวลาเกิด", "สถานะ"],
    rows.map((a) => [
      a.name,
      a.deviceName,
      a.divisionName ?? "--",
      LEVEL_LABEL[a.alarmLevel],
      fmtTime(a.createdAt),
      HANDLE_LABEL[a.handleStatus],
    ])
  );
  downloadBlob(blob, `alarm-log-${rangeLabel}-${ymd(new Date())}.csv`);
}

function exportControlCSV(rows: ControlLog[], rangeLabel: string) {
  const blob = toCsvBlob(
    ["คำสั่ง", "อุปกรณ์", "ผู้สั่งการ", "ประเภท", "เวลา", "ผลลัพธ์"],
    rows.map((l) => [
      toThai(l.operate_describe),
      l.object_name ?? "--",
      l.username ?? "--",
      l.act_type === 2 ? "อัตโนมัติ" : "สั่งด้วยมือ",
      fmtCtrlTime(l.occurred_at),
      l.error_code === 0 ? "สำเร็จ" : (l.error_details ?? "ผิดพลาด"),
    ])
  );
  downloadBlob(blob, `control-log-${rangeLabel}-${ymd(new Date())}.csv`);
}

// ── ตัวเลือกช่วงเวลา (ใช้ร่วมกันทั้ง 2 popup) ────────────────
interface RangePickerProps {
  days: number;
  onDaysChange: (d: number) => void;
  useRange: boolean;
  onUseRangeChange: (v: boolean) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

function RangePicker({
  days, onDaysChange, useRange, onUseRangeChange,
  from, to, onFromChange, onToChange,
}: RangePickerProps) {
  if (useRange) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onFromChange(e.target.value)}
          className="text-[11px] text-t1 dark:text-dk-t1 bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr rounded-lg px-2 py-1.5 focus:outline-none focus:border-blu/50"
        />
        <span className="text-[10px] text-t3">ถึง</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onToChange(e.target.value)}
          className="text-[11px] text-t1 dark:text-dk-t1 bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr rounded-lg px-2 py-1.5 focus:outline-none focus:border-blu/50"
        />
        <button
          onClick={() => { onUseRangeChange(false); onFromChange(""); onToChange(""); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-t3 hover:text-blu hover:bg-sf-3 dark:hover:bg-dk-sf2 transition"
          title="กลับไปเลือกแบบช่วงสำเร็จรูป"
        >
          <span className="ms" style={{ fontSize: 16 }}>close</span>
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={days}
        onChange={(e) => onDaysChange(Number(e.target.value))}
        className="text-[11px] text-t1 dark:text-dk-t1 bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr rounded-lg px-3 py-1.5 focus:outline-none transition"
      >
        {POPUP_DAY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button
        onClick={() => {
          const ago = new Date();
          ago.setDate(ago.getDate() - 7);
          onFromChange(ymd(ago));
          onToChange(ymd(new Date()));
          onUseRangeChange(true);
        }}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr text-t2 dark:text-dk-t2 hover:text-blu hover:border-blu/40 transition text-[10px] font-medium whitespace-nowrap"
        title="กำหนดช่วงวันที่เอง"
      >
        <span className="ms" style={{ fontSize: 14 }}>date_range</span>
        กำหนดเอง
      </button>
    </div>
  );
}

// ── แถบล่าง: จำนวน + เปลี่ยนหน้า (ใช้ร่วมกัน) ────────────────
function PaginationBar({
  startNo, endNo, total, page, totalPages, onPageChange,
}: {
  startNo: number; endNo: number; total: number;
  page: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex-shrink-0 px-5 py-2.5 border-t border-bdr dark:border-dk-bdr bg-sf-3 dark:bg-dk-sf2 flex items-center justify-between gap-3">
      <span className="text-[10px] text-t3">
        แสดง {startNo}-{endNo} จาก {total} รายการ
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(page - 1, 0))}
            disabled={page === 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-t2 dark:text-dk-t2 border border-bdr dark:border-dk-bdr hover:text-blu hover:border-blu/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="ms" style={{ fontSize: 16 }}>chevron_left</span>
          </button>
          <span className="text-[11px] font-semibold text-t1 dark:text-dk-t1 px-2 tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(page + 1, totalPages - 1))}
            disabled={page >= totalPages - 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-t2 dark:text-dk-t2 border border-bdr dark:border-dk-bdr hover:text-blu hover:border-blu/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="ms" style={{ fontSize: 16 }}>chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── ช่องค้นหา (ใช้ร่วมกัน) ───────────────────────────────────
function SearchBar({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="px-5 py-2.5 border-b border-bdr dark:border-dk-bdr flex-shrink-0">
      <div className="flex items-center gap-2 bg-sf-3 dark:bg-dk-sf2 rounded-xl px-3 py-1.5 border border-bdr dark:border-dk-bdr">
        <span className="ms text-t3" style={{ fontSize: 16 }}>search</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[11px] text-t1 dark:text-dk-t1 outline-none placeholder:text-t3"
        />
        {value && (
          <button onClick={() => onChange("")} className="text-t3 hover:text-t1 transition">
            <span className="ms" style={{ fontSize: 16 }}>close</span>
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-t3">
      <span className="ms animate-spin" style={{ fontSize: 28 }}>progress_activity</span>
      <span className="text-[11px]">กำลังโหลด...</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-t3">
      <span className="ms" style={{ fontSize: 32 }}>inbox</span>
      <span className="text-[11px]">{text}</span>
    </div>
  );
}

const TH = "text-left px-4 py-2.5 text-t2 dark:text-dk-t2 font-semibold whitespace-nowrap";
const rowClass = (i: number) =>
  `border-t border-bdr/50 dark:border-dk-bdr hover:bg-sf-2 dark:hover:bg-dk-sf2 transition ${
    i % 2 === 0 ? "" : "bg-sf-2/50 dark:bg-dk-sf2/30"
  }`;

// ── Popup: การแจ้งเตือนทั้งหมด ──────────────────────────────
function AlarmAllPopup({ onClose }: { onClose: () => void }) {
  const [days, setDays] = useState(7);
  const [useRange, setUseRange] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AlarmRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      ...(search ? { search } : {}),
      ...(useRange && from && to ? { from, to } : { days: String(days) }),
    });
    fetch(`/api/logs/alarms?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.data ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 0);
        setPageSize(d.pageSize ?? 50);
      })
      .catch(() => { setRows([]); setTotal(0); setTotalPages(0); })
      .finally(() => setLoading(false));
  }, [days, page, search, useRange, from, to]);

  // เปลี่ยนเงื่อนไขกรอง → กลับไปหน้าแรก
  useEffect(() => { setPage(0); }, [days, search, useRange, from, to]);

  const startNo = total === 0 ? 0 : page * pageSize + 1;
  const endNo = Math.min((page + 1) * pageSize, total);
  const rangeLabel = useRange && from && to ? `${from}_${to}` : `${days}days`;

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
            <div className="text-sm font-bold text-t1 dark:text-dk-t1">บันทึกการแจ้งเตือนทั้งหมด</div>
            <div className="text-[10px] text-t3">
              {useRange && from && to
                ? `${from} ถึง ${to} · ทั้งหมด ${total} รายการ`
                : `ย้อนหลัง ${days} วัน · ทั้งหมด ${total} รายการ`}
            </div>
          </div>

          <RangePicker
            days={days} onDaysChange={setDays}
            useRange={useRange} onUseRangeChange={setUseRange}
            from={from} to={to} onFromChange={setFrom} onToChange={setTo}
          />

          <button
            onClick={() => exportAlarmCSV(rows, rangeLabel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-grn-lt dark:bg-grn/15 text-grn border border-grn/20 text-[11px] font-semibold hover:bg-grn/20 transition"
            title="ส่งออกเฉพาะรายการในหน้านี้"
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

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาอุปกรณ์หรือประเภทการแจ้งเตือน..."
        />

        {/* Table */}
        <div className="overflow-auto flex-1">
          {loading ? <LoadingState />
            : rows.length === 0 ? <EmptyState text="ไม่พบรายการแจ้งเตือน" />
            : (
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-sf-3 dark:bg-dk-sf2 z-10">
                  <tr>
                    <th className={TH}>ชื่อการแจ้งเตือน</th>
                    <th className={TH}>ชื่ออุปกรณ์</th>
                    <th className={TH}>โซน</th>
                    <th className={TH}>ระดับ</th>
                    <th className={TH}>เวลาเกิด</th>
                    <th className={TH}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => (
                    <tr key={a.id} className={rowClass(i)}>
                      <td className="px-4 py-2 font-semibold text-t1 dark:text-dk-t1 whitespace-nowrap">{a.name}</td>
                      <td className="px-4 py-2 text-t2 dark:text-dk-t2 whitespace-nowrap">{a.deviceName}</td>
                      <td className="px-4 py-2 text-t3 whitespace-nowrap">{a.divisionName ?? "--"}</td>
                      <td className="px-4 py-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${SEV_STYLE[a.alarmLevel].badge}`}>
                          {LEVEL_LABEL[a.alarmLevel]}
                        </span>
                      </td>
                      <td className="px-4 py-2 tabular-nums text-t2 dark:text-dk-t2 whitespace-nowrap">{fmtTime(a.createdAt)}</td>
                      <td className="px-4 py-2 text-t3 whitespace-nowrap">{HANDLE_LABEL[a.handleStatus]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        <PaginationBar
          startNo={startNo} endNo={endNo} total={total}
          page={page} totalPages={totalPages} onPageChange={setPage}
        />
      </div>
    </div>
  );
}

// ── Popup: การสั่งการทั้งหมด ────────────────────────────────
function ControlLogAllPopup({ onClose }: { onClose: () => void }) {
  const PAGE_SIZE = 50;
  const [days, setDays] = useState(7);
  const [useRange, setUseRange] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ControlLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
      ...(search ? { search } : {}),
      ...(useRange && from && to ? { from, to } : { days: String(days) }),
    });
    fetch(`/api/logs/service-control?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.data ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 0);
      })
      .catch(() => { setRows([]); setTotal(0); setTotalPages(0); })
      .finally(() => setLoading(false));
  }, [days, page, search, useRange, from, to]);

  useEffect(() => { setPage(0); }, [days, search, useRange, from, to]);

  const startNo = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const endNo = Math.min((page + 1) * PAGE_SIZE, total);
  const rangeLabel = useRange && from && to ? `${from}_${to}` : `${days}days`;

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
          <span className="ms ms-f text-blu" style={{ fontSize: 18 }}>settings_remote</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-t1 dark:text-dk-t1">บันทึกการสั่งการทั้งหมด</div>
            <div className="text-[10px] text-t3">
              {useRange && from && to
                ? `${from} ถึง ${to} · ทั้งหมด ${total} รายการ`
                : `ย้อนหลัง ${days} วัน · ทั้งหมด ${total} รายการ`}
            </div>
          </div>

          <RangePicker
            days={days} onDaysChange={setDays}
            useRange={useRange} onUseRangeChange={setUseRange}
            from={from} to={to} onFromChange={setFrom} onToChange={setTo}
          />

          <button
            onClick={() => exportControlCSV(rows, rangeLabel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-grn-lt dark:bg-grn/15 text-grn border border-grn/20 text-[11px] font-semibold hover:bg-grn/20 transition"
            title="ส่งออกเฉพาะรายการในหน้านี้"
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

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาอุปกรณ์ / ผู้สั่งการ / คำสั่ง..."
        />

        {/* Table */}
        <div className="overflow-auto flex-1">
          {loading ? <LoadingState />
            : rows.length === 0 ? <EmptyState text="ไม่พบบันทึกการสั่งการ" />
            : (
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-sf-3 dark:bg-dk-sf2 z-10">
                  <tr>
                    <th className={TH}>คำสั่ง</th>
                    <th className={TH}>อุปกรณ์</th>
                    <th className={TH}>ผู้สั่งการ</th>
                    <th className={TH}>ประเภท</th>
                    <th className={TH}>เวลา</th>
                    <th className={TH}>ผลลัพธ์</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l, i) => (
                    <tr key={i} className={rowClass(i)}>
                      <td className="px-4 py-2 font-semibold text-t1 dark:text-dk-t1">{toThai(l.operate_describe)}</td>
                      <td className="px-4 py-2 text-t2 dark:text-dk-t2 whitespace-nowrap">{l.object_name ?? "--"}</td>
                      <td className="px-4 py-2 text-t3 whitespace-nowrap">{l.username ?? "--"}</td>
                      <td className="px-4 py-2 text-t3 whitespace-nowrap">
                        {l.act_type === 2 ? "อัตโนมัติ" : "สั่งด้วยมือ"}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-t2 dark:text-dk-t2 whitespace-nowrap">
                        {fmtCtrlTime(l.occurred_at)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          l.error_code === 0
                            ? "bg-grn-lt text-grn dark:bg-grn/15"
                            : "bg-red-lt text-red dark:bg-red/15"
                        }`}>
                          {l.error_code === 0 ? "สำเร็จ" : "ผิดพลาด"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        <PaginationBar
          startNo={startNo} endNo={endNo} total={total}
          page={page} totalPages={totalPages} onPageChange={setPage}
        />
      </div>
    </div>
  );
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

  // dedup: แสดงเฉพาะรายการล่าสุดของแต่ละ device+ประเภท (สไตล์ LINE/Gmail)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const seen = new Map<string, AlarmLog>();
  for (const a of alarms) {
    const d = new Date(a.createdAt);
    if (Number.isNaN(d.getTime()) || d < cutoff) continue;
    const key = `${a.deviceName}__${a.name}`;
    const existing = seen.get(key);
    if (!existing || d > new Date(existing.createdAt)) seen.set(key, a);
  }
  const deduped = Array.from(seen.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const historyOf = (dev: string, name: string) =>
    alarms.filter((a) => a.deviceName === dev && a.name === name);

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
            deduped.length === 0 ? (
              <EmptyFeed text="ไม่พบการแจ้งเตือน — ระบบทำงานปกติ" />
            ) : (
              <div className="space-y-1.5">
                {deduped.map((a) => {
                  const sev = SEV_STYLE[a.alarmLevel];
                  const histCount = historyOf(a.deviceName, a.name).length;
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
            )
          ) : (
            <CmdTab days={days} />
          )}
        </div>
      </div>

      {/* Popup ดูทั้งหมด — เปิดตาม tab ที่ใช้งานอยู่ */}
      {showAll && (tab === "hw"
        ? <AlarmAllPopup onClose={() => setShowAll(false)} />
        : <ControlLogAllPopup onClose={() => setShowAll(false)} />
      )}

      {/* Bottom Sheet — ประวัติทั้งหมดของอุปกรณ์ (TOR ๔.๗.๒) */}
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
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-t3 hover:bg-sf-3 dark:hover:bg-dk-sf2 transition flex-shrink-0 ml-2"
              >
                <span className="ms" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
              {historyOf(selected.deviceName, selected.name)
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
                  {historyOf(selected.deviceName, selected.name).length}
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

// ── Tab: คำสั่งการ ───────────────────────────────────────────
function CmdTab({ days }: { days: number }) {
  const [search, setSearch] = useState("");
  const { logs, loading } = useControlLogs(days, search);

  return (
    <div className="flex flex-col h-full">
      {/* ช่องค้นหา */}
      <div className="flex-shrink-0 mb-2">
        <div className="flex items-center gap-2 bg-sf-3 dark:bg-dk-sf2 rounded-lg px-2.5 py-1.5 border border-bdr dark:border-dk-bdr">
          <span className="ms text-t3" style={{ fontSize: 14 }}>search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาอุปกรณ์ / ผู้สั่ง / คำสั่ง..."
            className="flex-1 bg-transparent text-[10px] text-t1 dark:text-dk-t1 outline-none placeholder:text-t3"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-t3 hover:text-t1 transition">
              <span className="ms" style={{ fontSize: 14 }}>close</span>
            </button>
          )}
        </div>
      </div>

      {/* รายการ */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <EmptyFeed text="กำลังโหลด..." />
        ) : logs.length === 0 ? (
          <EmptyFeed text={search ? "ไม่พบผลการค้นหา" : "ยังไม่มีบันทึกคำสั่งการ"} />
        ) : (
          <div className="space-y-1.5">
            {logs.map((l, i) => (
              <div key={i} className="p-2 rounded-lg bg-sf-2 dark:bg-dk-sf2 border border-bdr/50 dark:border-dk-bdr">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-semibold text-t1 dark:text-dk-t1 truncate">
                    {toThai(l.operate_describe)}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
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
                  {fmtCtrlTime(l.occurred_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
