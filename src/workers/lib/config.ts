// src/workers/lib/config.ts
// อ่าน/ตรวจ env ฝั่ง Worker (ค่าลับอยู่ที่นี่เท่านั้น — กฎเหล็ก #6)
// ⚠️ ไฟล์นี้รันเฉพาะใน Worker process ห้าม import จาก Frontend

export interface RulrConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  divisionId: number;
  domain: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[config] ขาด environment variable: ${name}`);
  return v;
}

export function getRulrConfig(): RulrConfig {
  return {
    baseUrl: (process.env.RULR_BASE_URL ?? "https://rulr-aiot.com").replace(/\/$/, ""),
    clientId: required("RULR_CLIENT_ID"),
    clientSecret: required("RULR_CLIENT_SECRET"),
    divisionId: Number(process.env.RULR_DIVISION_ID ?? "1889"),
    domain: process.env.RULR_DOMAIN ?? "IMPACT",
  };
}

export const PROJECT_ID = "buriram";
export const SYNC_CRON = process.env.SYNC_CRON ?? "*/30 * * * *"; // ทุก 30 นาที
export const TOKEN_CRON = process.env.TOKEN_CRON ?? "0 * * * *"; // เช็ค token ทุกชั่วโมง
