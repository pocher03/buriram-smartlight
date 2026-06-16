"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import type { Zone } from "@/lib/mock-data";
import type { WeatherInfo } from "@/lib/types";
import { display } from "@/lib/null-safe";

interface HeaderProps {
  zones: Zone[];
  selectedZone: string;
  onZoneChange: (zone: string) => void;
  weather: WeatherInfo;
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

export function Header({ zones, selectedZone, onZoneChange, weather }: HeaderProps) {
  const now = useClock();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  useEffect(() => setMounted(true), []);

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
    <header className="flex-shrink-0 h-14 bg-sf dark:bg-dk-sf border-b border-bdr dark:border-dk-bdr flex items-center px-4 gap-3 shadow-g1 z-50">
      <div className="flex items-center gap-2.5 min-w-0 mr-2">
        <div className="w-8 h-8 rounded-xl bg-blu flex items-center justify-center flex-shrink-0 shadow-g2">
          <span className="ms ms-f text-white" style={{ fontSize: 18 }}>
            location_city
          </span>
        </div>
        <div className="min-w-0">
          <div className="font-bold text-t1 dark:text-dk-t1 text-xs leading-tight truncate">
            ศูนย์บริหารจัดการโคมไฟถนนอัจฉริยะ
          </div>
          <div className="text-t3 text-[9px] tracking-wide">เทศบาลเมืองบุรีรัมย์</div>
        </div>
      </div>
      <div className="w-px h-7 bg-bdr dark:bg-dk-bdr mx-1 flex-shrink-0" />

      {/* Zone selector */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
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

      {/* Center: date / time / status */}
      <div className="flex-1 flex items-center justify-center gap-2.5">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sf-3 dark:bg-dk-sf2 rounded-xl border border-bdr dark:border-dk-bdr">
          <span className="ms text-t3" style={{ fontSize: 14 }}>
            calendar_today
          </span>
          <span className="text-xs font-medium text-t1 dark:text-dk-t1">{dateStr}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sf-3 dark:bg-dk-sf2 rounded-xl border border-bdr dark:border-dk-bdr">
          <span className="ms text-t3" style={{ fontSize: 14 }}>
            schedule
          </span>
          <span className="text-sm font-bold text-blu tabular-nums">{timeStr}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-grn-lt dark:bg-grn/15 rounded-xl border border-grn/20">
          <div className="w-2 h-2 rounded-full bg-grn animate-pulse-dot flex-shrink-0" />
          <span className="text-[11px] font-semibold text-grn">ระบบทำงานปกติ</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Weather (null-safe) */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-r from-blu-lt to-sf-3 dark:from-blu/10 dark:to-dk-sf2 rounded-xl border border-blu/15">
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-bdr dark:border-dk-bdr">
            <span style={{ fontSize: 22 }}>⛅</span>
            <div>
              <div className="text-sm font-bold text-blu leading-none">
                {display(weather.temp, "°C")}
              </div>
              <div className="text-[8px] text-t3 leading-none mt-0.5">
                {display(weather.desc)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
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
            <div className="text-center" title="คาร์บอนไดออกไซด์">
              <div className="ms text-grn mx-auto" style={{ fontSize: 14 }}>
                co2
              </div>
              <div className="text-[10px] font-bold text-t1 dark:text-dk-t1 leading-none">
                {display(weather.co2)}
              </div>
              <div className="text-[7px] text-t3 leading-none mt-0.5">CO₂ ppm</div>
            </div>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr text-t2 dark:text-dk-t2 hover:border-blu/40 transition text-xs font-medium"
        >
          <span className="ms" style={{ fontSize: 15 }}>
            {isDark ? "light_mode" : "dark_mode"}
          </span>
          <span>{isDark ? "สว่าง" : "มืด"}</span>
        </button>

        {/* Profile */}
        <div className="relative">
          <div
            className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-blu to-blu-dk flex items-center justify-center text-white text-[13px] font-bold cursor-pointer flex-shrink-0 shadow-g2"
            onClick={() => setProfileOpen((v) => !v)}
            title="โปรไฟล์"
          >
            A
          </div>
          {profileOpen && (
            <div className="dropdown-in absolute top-[calc(100%+8px)] right-0 bg-sf dark:bg-dk-sf border border-bdr dark:border-dk-bdr rounded-2xl shadow-g3 min-w-[240px] z-[1000] overflow-hidden">
              <div className="p-4 border-b border-bdr dark:border-dk-bdr">
                <div className="text-[13px] font-bold text-t1 dark:text-dk-t1">
                  ผู้ดูแลระบบ (Admin)
                </div>
                <div className="text-[11px] text-t3">admin@buriram.go.th</div>
              </div>
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-sf-3 dark:hover:bg-dk-sf2 transition"
                onClick={() => router.push("/login")}
              >
                <span className="ms ms-f text-red" style={{ fontSize: 18 }}>
                  logout
                </span>
                <span className="text-[12px] font-semibold text-red">ออกจากระบบ</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
