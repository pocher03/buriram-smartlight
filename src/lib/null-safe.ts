// src/lib/null-safe.ts
// กฎเหล็ก #3: ทุกค่าที่ไม่มีต้องแสดง "--" ห้าม crash / ห้าม undefined โผล่ UI
// Mandatory Patterns — อ้างอิงจาก master plan ข้อ 7

export type TelemetryAttr = { identify: string; realValue: string | null };

/** ดึง realValue ตาม identify จาก thingsAttributeList (null ถ้าไม่พบ) */
export const getVal = (
  list: TelemetryAttr[] | null | undefined,
  id: string
): string | null => list?.find((a) => a.identify === id)?.realValue ?? null;

/** แปลงเป็นตัวเลขแบบปลอดภัย — null ถ้าแปลงไม่ได้ (realValue เป็น String เสมอ) */
export const safeNum = (v: string | number | null | undefined): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** แสดงผล: ค่าว่าง → "--" */
export const display = (
  v: string | number | null | undefined,
  suffix = ""
): string => (v == null || v === "" ? "--" : `${v}${suffix}`);

/** คำนวณประหยัด — ใช้ Math.abs กับค่าพลังงานก่อนคูณ (ค่าพลังงานอาจติดลบ) */
export const calcSavings = (kWh: number | null | undefined) => {
  const k = safeNum(kWh ?? null);
  if (k == null) return { money: "--", co2: "--" };
  return {
    money: (Math.abs(k) * 4.5).toFixed(2), // บาท
    co2: (Math.abs(k) * 0.5).toFixed(2), // kg CO₂
  };
};

/** MoM % = (เดือนนี้ − เดือนที่แล้ว) / เดือนที่แล้ว × 100 */
export const calcMoM = (
  current: number | null,
  previous: number | null
): number | null => {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

/** Top 5 Fault — group by โซนจาก alarm log */
export const getTop5Faults = (
  logs: Array<{ divisionName?: string | null }>
): Array<{ name: string; count: number }> =>
  Object.entries(
    logs.reduce<Record<string, number>>((acc, l) => {
      const name = l.divisionName ?? "ไม่ระบุ";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  )
    .sort(([, x], [, y]) => y - x)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

/** Timezone: API คืน UTC ไม่มี suffix → เติม Z ตอน parse (เก็บ UTC, แสดง Asia/Bangkok ที่ UI) */
export const parseUTC = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const d = new Date(`${s.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};
