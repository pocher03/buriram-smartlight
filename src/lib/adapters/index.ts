// src/lib/adapters/index.ts
// สลับแหล่งข้อมูลด้วย env DATA_SOURCE: 'mock' (ดีฟอลต์) | 'live'
// DATA_SOURCE ไม่ใช่ค่าลับ จึงอ่านฝั่ง server ได้ (ห้ามใช้ NEXT_PUBLIC_ กับค่าลับ)

import type { DataAdapter } from "./types";

let cached: DataAdapter | null = null;

export async function getAdapter(): Promise<DataAdapter> {
  if (cached) return cached;
  const mod =
    process.env.DATA_SOURCE === "live"
      ? await import("./live")
      : await import("./mock");
  cached = mod.default;
  return cached;
}

export type { DataAdapter } from "./types";
