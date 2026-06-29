"use client";

import { useEffect, useState, useRef } from "react"; // เพิ่ม useRef
import { useTheme } from "next-themes";
import type { Zone } from "@/lib/mock-data";
import type { WeatherInfo } from "@/lib/types";
import type { DashboardUser } from "./dashboard";
import { display } from "@/lib/null-safe";
import { logoutAction } from "@/app/(dashboard)/actions";
import { AccessLogModal } from "./access-log-modal";

interface HeaderProps {
  zones: Zone[];
  selectedZone: string;
  onZoneChange: (zone: string) => void;
  weather: WeatherInfo;
  user: DashboardUser;
}

/** นาฬิกา/วันที่ — แสดงเวลาไทย (Asia/Bangkok) อัปเดตทุกวินาที */
function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function Header({ zones, selectedZone, onZoneChange, weather, user }: HeaderProps) {
  const now = useClock();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logModal, setLogModal] = useState<"me" | "all" | null>(null);
  const [placeholder, setPlaceholder] = useState<string | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  const roleLabel =
    user.role === "super_admin"
      ? "ผู้ดูแลระบบส่วนกลาง (Super Admin)"
      : "ผู้ดูแลระบบเทศบาล (Admin)";
  const avatarChar = (user.name?.trim()?.[0] ?? "A").toUpperCase();

  const dateStr = now
    ? now.toLocaleDateString("th-TH", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Bangkok",
      })
    : "--";
  const timeStr = now
    ? now.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
      })
    : "--:--:--";

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <header className="flex-shrink-0 h-20 bg-sf dark:bg-dk-sf border-b border-bdr dark:border-dk-bdr flex items-center px-3 md:px-4 gap-2 md:gap-3 shadow-g1 z-50">
      <div className="flex items-center gap-2 md:gap-2.5 min-w-0 mr-1 md:mr-2">
        <img
          src="/logo.png"
          alt="ตราเทศบาลเมืองบุรีรัมย์"
          className="w-16 h-16 object-contain flex-shrink-0 drop-shadow-sm"
        />
        <div className="min-w-0">
          <div className="font-bold text-t1 dark:text-dk-t1 text-[13px] md:text-sm leading-tight truncate">
            ศูนย์บริหารจัดการโคมไฟถนนอัจฉริยะ
          </div>
          <div className="text-t2 dark:text-dk-t2 text-[10px] md:text-[11px] font-medium tracking-wide truncate">
            เทศบาลเมืองบุรีรัมย์
          </div>
        </div>
      </div>
      <div className="hidden md:block w-px h-7 bg-bdr dark:bg-dk-bdr mx-1 flex-shrink-0" />

      {/* Zone selector (desktop only — mobile เลือกโซนในแท็บแผนที่แทน) */}
      <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
        <span className="ms text-t3" style={{ fontSize: 15 }}>
          pin_drop
        </span>
        <select
          value={selectedZone}
          onChange={(e) => onZoneChange(e.target.value)}
          className="text-xs font-medium text-t1 dark:text-dk-t1 bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr rounded-lg px-3 py-1.5 focus:outline-none transition"
        >
          <option value="all">ทุกโซน</option>
          {zones.map((z) => (
            <option key={z.id} value={z.name}>
              {z.name}
            </option>
          ))}
        </select>
      </div>

      {/* Center: date / time (desktop only) + system status (ทุก breakpoint แต่ย่อบน mobile) */}
      <div className="flex-1 flex items-center justify-center gap-1.5 md:gap-2.5 min-w-0">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-sf-3 dark:bg-dk-sf2 rounded-xl border border-bdr dark:border-dk-bdr">
            <span className="ms text-t3" style={{ fontSize: 16 }}>
              calendar_today
            </span>
            <span className="text-sm font-bold text-t1 dark:text-dk-t1">{dateStr}</span>
          </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-sf-3 dark:bg-dk-sf2 rounded-xl border border-bdr dark:border-dk-bdr">
              <span className="ms text-t3" style={{ fontSize: 16 }}>
                schedule
              </span>
              <span className="text-2xl font-black text-blu tabular-nums tracking-tight">{timeStr}</span>
            </div>
        {/* สถานะระบบ: ทุก breakpoint — บน mobile ย่อเหลือคำว่า "ปกติ" สั้นๆ กันทับชื่อโครงการ/weather */}
        <div
          className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-grn-lt dark:bg-grn/15 rounded-xl border border-grn/20 flex-shrink-0"
          title="ระบบทำงานปกติ"
        >
          <div className="w-2 h-2 rounded-full bg-grn animate-pulse-dot flex-shrink-0" />
          <span className="hidden md:inline text-[11px] font-semibold text-grn whitespace-nowrap">
            ระบบทำงานปกติ
          </span>
          <span className="md:hidden text-[10px] font-semibold text-grn whitespace-nowrap">
            ปกติ
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-2.5 flex-shrink-0">
        {/* Weather (null-safe) — mobile: ย่อเหลือไอคอน+อุณหภูมิ */}
        <div className="flex items-center gap-2.5 px-2.5 md:px-3 py-1.5 bg-gradient-to-r from-blu-lt to-sf-3 dark:from-blu/10 dark:to-dk-sf2 rounded-xl border border-blu/15">
          <div className="flex items-center gap-1.5 md:pr-2.5 md:border-r border-bdr dark:border-dk-bdr">
            <span style={{ fontSize: 22 }}>⛅</span>
            <div>
              <div className="text-sm font-bold text-blu leading-none">
                {display(weather.temp, "°C")}
              </div>
              <div className="hidden md:block text-[8px] text-t3 leading-none mt-0.5">
                {display(weather.desc)}
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2.5">
            <div className="text-center" title="ความชื้นสัมพัทธ์">
              <div className="ms text-blu mx-auto" style={{ fontSize: 14 }}>
                water_drop
              </div>
              <div className="text-[10px] font-bold text-t1 dark:text-dk-t1 leading-none">
                {display(weather.humidity, "%")}
              </div>
              <div className="text-[7px] text-t3 leading-none mt-0.5">ความชื้น</div>
            </div>
            <div className="text-center" title="ฝุ่นละออง PM2.5">
              <div className="ms text-yel mx-auto" style={{ fontSize: 14 }}>
                blur_on
              </div>
              <div className="text-[10px] font-bold text-t1 dark:text-dk-t1 leading-none">
                {display(weather.pm25)}
              </div>
              <div className="text-[7px] text-t3 leading-none mt-0.5">PM2.5</div>
            </div>
          </div>
        </div>

        {/* Theme toggle (desktop only — mobile มีในแท็บโปรไฟล์) */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr text-t2 dark:text-dk-t2 hover:border-blu/40 transition text-xs font-medium"
        >
          <span className="ms" style={{ fontSize: 15 }}>
            {isDark ? "light_mode" : "dark_mode"}
          </span>
          <span>{isDark ? "สว่าง" : "มืด"}</span>
        </button>

        {/* Profile (desktop only — mobile ใช้แท็บโปรไฟล์แทน dropdown) */}
        <div className="relative hidden md:block" ref={profileRef}>
          <div
            className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-blu to-blu-dk flex items-center justify-center text-white text-[13px] font-bold cursor-pointer flex-shrink-0 shadow-g2"
            onClick={() => setProfileOpen((v) => !v)}
            title="โปรไฟล์"
          >
            {avatarChar}
          </div>
          {profileOpen && (
            <div className="dropdown-in absolute top-[calc(100%+8px)] right-0 bg-sf dark:bg-dk-sf border border-bdr dark:border-dk-bdr rounded-2xl shadow-g3 min-w-[240px] z-[1000] overflow-hidden">
              <div className="p-4 border-b border-bdr dark:border-dk-bdr">
                <div className="text-[13px] font-bold text-t1 dark:text-dk-t1 truncate">
                  {user.name}
                </div>
                <div className="text-[10px] text-t3 mt-0.5">{roleLabel}</div>
                <div className="text-[11px] text-t3 truncate">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  setLogModal("me");
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-sf-3 dark:hover:bg-dk-sf2 transition text-left border-b border-bdr dark:border-dk-bdr"
              >
                <span className="ms ms-f text-blu" style={{ fontSize: 18 }}>
                  history
                </span>
                <span className="text-[12px] font-semibold text-t1 dark:text-dk-t1">
                  ประวัติ Session ของฉัน
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  setLogModal("all");
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-sf-3 dark:hover:bg-dk-sf2 transition text-left border-b border-bdr dark:border-dk-bdr"
              >
                <span className="ms ms-f text-blu" style={{ fontSize: 18 }}>
                  shield_person
                </span>
                <span className="text-[12px] font-semibold text-t1 dark:text-dk-t1">
                  บันทึกการเข้าใช้งานระบบ
                </span>
              </button>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-sf-3 dark:hover:bg-dk-sf2 transition text-left"
                >
                  <span className="ms ms-f text-red" style={{ fontSize: 18 }}>
                    logout
                  </span>
                  <span className="text-[12px] font-semibold text-red">ออกจากระบบ</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      {logModal && (
        <AccessLogModal variant={logModal} onClose={() => setLogModal(null)} />
      )}

      {placeholder && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPlaceholder(null)}
        >
          <div
            className="dropdown-in w-full max-w-sm bg-sf dark:bg-dk-sf border border-bdr dark:border-dk-bdr rounded-2xl shadow-g3 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-bdr dark:border-dk-bdr">
              <span className="text-sm font-bold text-t1 dark:text-dk-t1">
                {placeholder}
              </span>
              <button
                onClick={() => setPlaceholder(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-t3 hover:bg-sf-3 dark:hover:bg-dk-sf2 transition"
                title="ปิด"
              >
                <span className="ms" style={{ fontSize: 20 }}>
                  close
                </span>
              </button>
            </div>
            <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
              <span className="ms text-t3" style={{ fontSize: 40 }}>
                hourglass_empty
              </span>
              <span className="text-[13px] text-t2 dark:text-dk-t2">
                ฟีเจอร์นี้ยังไม่พร้อมใช้งาน — รอเชื่อมต่อข้อมูลจากระบบต้นทาง
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
