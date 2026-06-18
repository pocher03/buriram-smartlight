"use client";

import dynamic from "next/dynamic";
import type { Device } from "@/lib/types";

// Leaflet ต้องโหลดฝั่ง client เท่านั้น (ใช้ window) → ssr:false
const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 top-10 flex items-center justify-center text-t3 text-xs">
      กำลังโหลดแผนที่…
    </div>
  ),
});

export function MapPanel({
  devices,
  active = true,
}: {
  devices: Device[];
  active?: boolean;
}) {
  return (
    <div className="relative overflow-hidden h-full">
      <div className="absolute top-0 left-0 right-0 h-10 bg-sf/95 dark:bg-dk-sf/95 backdrop-blur-sm border-b border-bdr dark:border-dk-bdr flex items-center px-3 gap-3 z-20">
        <span className="ms ms-f text-blu" style={{ fontSize: 17 }}>
          map
        </span>
        <span className="font-semibold text-t1 dark:text-dk-t1 text-xs">
          แผนที่โคมไฟอัจฉริยะ (Smart Map)
        </span>
        <div className="flex items-center gap-2.5 ml-auto text-[10px] text-t2 dark:text-dk-t2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-grn inline-block" />
            ออนไลน์
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red inline-block" />
            ออฟไลน์
          </span>
        </div>
        <div className="text-[9px] text-t3 bg-sf-3 dark:bg-dk-sf2 px-2 py-1 rounded-full border border-bdr dark:border-dk-bdr">
          คลิก Marker เพื่อดูข้อมูล
        </div>
      </div>
      <div className="absolute inset-0 top-10 z-[1]">
        <MapInner devices={devices} active={active} />
      </div>
    </div>
  );
}
