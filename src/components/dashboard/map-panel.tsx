"use client";

import dynamic from "next/dynamic";
import type { Device } from "@/lib/types";
import type { Zone } from "@/lib/mock-data";

// ระดับขนาดคอลัมน์แผนที่บน desktop (ปรับ grid-template-columns ใน dashboard.tsx)
export type MapSize = "auto" | "sm" | "lg";

export const MAP_SIZE_OPTIONS: { key: MapSize; label: string }[] = [
  { key: "auto", label: "อัตโนมัติ" },
  { key: "sm", label: "เล็ก" },
  { key: "lg", label: "ใหญ่" },
];

// Leaflet ต้องโหลดฝั่ง client เท่านั้น (ใช้ window) → ssr:false
const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 top-10 flex items-center justify-center text-t3 text-xs">
      กำลังโหลดแผนที่…
    </div>
  ),
});

interface MapPanelProps {
  devices: Device[];
  /** mobile: true เมื่อแท็บแผนที่ active → trigger invalidateSize */
  active?: boolean;
  /** desktop: ค่าเปลี่ยนเมื่อปรับขนาดคอลัมน์ → trigger invalidateSize */
  sizeKey?: string | number;
  /** mobile: โซนที่เลือกบนแผนที่ → pan/zoom ไปจุดนั้น (undefined = desktop ไม่ auto-pan) */
  focusZone?: string;
  // ── ปุ่มปรับขนาดแผนที่ (desktop only) ──
  mapSize?: MapSize;
  onMapSizeChange?: (s: MapSize) => void;
  // ── dropdown เลือกโซน (mobile only) ──
  zones?: Zone[];
  mapZone?: string;
  onMapZoneChange?: (z: string) => void;
}

export function MapPanel({
  devices,
  active = true,
  sizeKey = "",
  focusZone,
  mapSize,
  onMapSizeChange,
  zones,
  mapZone = "all",
  onMapZoneChange,
}: MapPanelProps) {
  return (
    <div className="relative overflow-hidden h-full">
      <div className="absolute top-0 left-0 right-0 h-10 bg-sf/95 dark:bg-dk-sf/95 backdrop-blur-sm border-b border-bdr dark:border-dk-bdr flex items-center px-3 gap-2 z-20">
        <span className="ms ms-f text-blu flex-shrink-0" style={{ fontSize: 17 }}>
          map
        </span>
        <span className="font-semibold text-t1 dark:text-dk-t1 text-xs truncate min-w-0">
          แผนที่โคมไฟอัจฉริยะ (Smart Map)
        </span>

        <div className="ml-auto flex items-center gap-2.5">
          {/* ปุ่มปรับขนาดคอลัมน์แผนที่ — desktop เท่านั้น */}
          {onMapSizeChange && (
            <div className="hidden md:flex items-center bg-sf-3 dark:bg-dk-sf2 rounded-lg p-0.5 gap-0.5 border border-bdr dark:border-dk-bdr">
              {MAP_SIZE_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => onMapSizeChange(o.key)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                    mapSize === o.key
                      ? "bg-sf dark:bg-dk-sf text-blu shadow-g1"
                      : "text-t2 dark:text-dk-t2 hover:text-blu"
                  }`}
                  title={`ขนาดแผนที่: ${o.label}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2.5 text-[10px] text-t2 dark:text-dk-t2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-grn inline-block" />
              ออนไลน์
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red inline-block" />
              ออฟไลน์
            </span>
          </div>
          <div className="hidden md:block text-[9px] text-t3 bg-sf-3 dark:bg-dk-sf2 px-2 py-1 rounded-full border border-bdr dark:border-dk-bdr">
            คลิก Marker เพื่อดูข้อมูล
          </div>
        </div>
      </div>

      {/*
        dropdown เลือกโซน — mobile เท่านั้น
        ย้ายไปมุมบนขวาของแผนที่ (เดิมอยู่ซ้าย ชนกับปุ่ม zoom +/- ของ Leaflet ที่ default
        อยู่มุมบนซ้ายเสมอ) ไม่แก้ตำแหน่งปุ่ม zoom ของ Leaflet เอง — ย้ายแค่ dropdown นี้หนีไปแทน
      */}
      {zones && onMapZoneChange && (
        <div className="md:hidden absolute top-12 right-2 z-20">
          <select
            value={mapZone}
            onChange={(e) => onMapZoneChange(e.target.value)}
            aria-label="เลือกโซนบนแผนที่"
            className="min-h-[44px] text-xs font-medium text-t1 dark:text-dk-t1 bg-sf/95 dark:bg-dk-sf/95 backdrop-blur-sm border border-bdr dark:border-dk-bdr rounded-xl px-3 py-2 shadow-g2 focus:outline-none"
          >
            <option value="all">ทุกโซน</option>
            {zones.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="absolute inset-0 top-10 z-[1]">
        <MapInner
          devices={devices}
          active={active}
          sizeKey={sizeKey}
          focusZone={focusZone}
        />
      </div>
    </div>
  );
}
