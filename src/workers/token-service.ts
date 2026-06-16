// src/workers/token-service.ts
// จัดการ accessToken/refreshToken ของ RULR (singleton ต่อ provider) เก็บใน token_store
// กฎ (CLAUDE.md):
//  - singleton: เก็บ token เดียวใน DB, cache ใน memory
//  - refresh เชิงรุกก่อนหมดอายุ (ไม่รอให้หมดจริง)
//  - ห้ามขอ /token ใหม่ก่อนหมดอายุ → ใช้ /refreshToken แทน (ขอซ้ำโดน 403)

import { prisma } from "../lib/prisma";
import { getRulrConfig } from "./lib/config";

const PROVIDER = "rulr";
// refresh เชิงรุกเมื่อเหลืออายุน้อยกว่าค่านี้ (1 ชม.) — กันใช้ token ที่กำลังจะหมด
const REFRESH_MARGIN_MS = 60 * 60 * 1000;
// refreshToken หมดอายุ 30 วัน
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface RulrTokenData {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // วินาที
}

interface RulrEnvelope<T> {
  errorCode: number;
  errorDesc: string;
  data: T;
}

let memo: { accessToken: string; expiresAt: number } | null = null;

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const cfg = getRulrConfig();
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`[token] ${path} HTTP ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as RulrEnvelope<T>;
  if (json.errorCode !== 0) {
    throw new Error(`[token] ${path} errorCode=${json.errorCode} ${json.errorDesc}`);
  }
  return json.data;
}

/** ขอ token ใหม่ด้วย clientId/clientSecret (ใช้เมื่อไม่มี token หรือ refresh หมดอายุ) */
async function requestNew(): Promise<RulrTokenData> {
  const cfg = getRulrConfig();
  console.log("[token] ขอ access token ใหม่ (/os/api/auth/token)");
  return postJson<RulrTokenData>("/os/api/auth/token", {
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
  });
}

/** ต่ออายุด้วย refreshToken */
async function refresh(refreshToken: string): Promise<RulrTokenData> {
  const cfg = getRulrConfig();
  console.log("[token] ต่ออายุ token (/os/api/auth/refreshToken)");
  return postJson<RulrTokenData>("/os/api/auth/refreshToken", {
    clientId: cfg.clientId,
    refreshToken,
  });
}

async function persist(data: RulrTokenData): Promise<{ accessToken: string; expiresAt: Date }> {
  const now = Date.now();
  const expiresAt = new Date(now + data.expiresIn * 1000);
  const refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_MS);
  await prisma.tokenStore.upsert({
    where: { provider: PROVIDER },
    create: {
      provider: PROVIDER,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenType: data.tokenType,
      expiresAt,
      refreshExpiresAt,
    },
    update: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenType: data.tokenType,
      expiresAt,
      refreshExpiresAt,
    },
  });
  memo = { accessToken: data.accessToken, expiresAt: expiresAt.getTime() };
  return { accessToken: data.accessToken, expiresAt };
}

/**
 * คืน accessToken ที่ใช้งานได้ — จัดการ refresh เชิงรุกให้อัตโนมัติ
 * @param force บังคับ refresh แม้ยังไม่ถึง margin (ใช้ตอนเจอ 401/403)
 */
export async function getAccessToken(force = false): Promise<string> {
  const now = Date.now();

  // 1) cache ใน memory ยังสดอยู่
  if (!force && memo && now < memo.expiresAt - REFRESH_MARGIN_MS) {
    return memo.accessToken;
  }

  // 2) โหลดจาก DB
  const stored = await prisma.tokenStore.findUnique({ where: { provider: PROVIDER } });

  // 2.1) ไม่มี token เลย → ขอใหม่
  if (!stored) {
    return (await persist(await requestNew())).accessToken;
  }

  const expMs = stored.expiresAt.getTime();
  const nearExpiry = now >= expMs - REFRESH_MARGIN_MS;

  // 2.2) ยังสด และไม่ได้บังคับ → ใช้เลย
  if (!force && !nearExpiry) {
    memo = { accessToken: stored.accessToken, expiresAt: expMs };
    return stored.accessToken;
  }

  // 2.3) ใกล้หมด/บังคับ → refresh ก่อน ถ้า refreshToken ยังไม่หมดอายุ
  const refreshAlive =
    stored.refreshToken &&
    (!stored.refreshExpiresAt || now < stored.refreshExpiresAt.getTime());

  if (refreshAlive && stored.refreshToken) {
    try {
      return (await persist(await refresh(stored.refreshToken))).accessToken;
    } catch (e) {
      console.warn(`[token] refresh ล้มเหลว → ขอใหม่: ${(e as Error).message}`);
    }
  }

  // 2.4) refresh ไม่ได้ → ขอใหม่
  return (await persist(await requestNew())).accessToken;
}

/** เรียกเชิงรุกจาก cron — refresh เมื่อใกล้หมดอายุเท่านั้น (ไม่ขอซ้ำโดยไม่จำเป็น) */
export async function ensureFreshToken(): Promise<void> {
  await getAccessToken(false);
}
