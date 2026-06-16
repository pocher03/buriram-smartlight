// src/workers/lib/rulr-api.ts
// HTTP client ไปยัง rulr-aiot.com — แนบ Bearer token อัตโนมัติ
// retry หนึ่งครั้งเมื่อ 401/403 (token หมด/ถูกเพิกถอน) โดยบังคับ refresh
// ⚠️ Worker เท่านั้น (กฎเหล็ก #4 — Frontend ห้ามยิงต้นทางตรง)

import { getAccessToken } from "../token-service";
import { getRulrConfig } from "./config";

interface RulrEnvelope<T> {
  errorCode: number;
  errorDesc: string;
  data: T;
}

async function call<T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  token: string
): Promise<{ status: number; json: RulrEnvelope<T> | null }> {
  const cfg = getRulrConfig();
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      // gateway ตอบ 401 ถ้าไม่มี User-Agent (Node fetch ไม่ใส่ให้ default)
      "User-Agent": "buriram-smartlight-worker/1.0",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: RulrEnvelope<T> | null = null;
  try {
    json = (await res.json()) as RulrEnvelope<T>;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let token = await getAccessToken();
  let { status, json } = await call<T>(method, path, body, token);

  // token หมด/ถูกเพิกถอน → บังคับ refresh แล้วลองใหม่หนึ่งครั้ง
  if (status === 401 || status === 403) {
    console.warn(`[rulr] ${path} ${status} → บังคับ refresh token แล้วลองใหม่`);
    token = await getAccessToken(true);
    ({ status, json } = await call<T>(method, path, body, token));
  }

  if (status < 200 || status >= 300) {
    throw new Error(`[rulr] ${path} HTTP ${status}`);
  }
  if (!json) {
    throw new Error(`[rulr] ${path} ตอบกลับไม่ใช่ JSON`);
  }
  if (json.errorCode !== 0) {
    throw new Error(`[rulr] ${path} errorCode=${json.errorCode} ${json.errorDesc}`);
  }
  return json.data;
}

export const rulrPost = <T>(path: string, body: unknown) => request<T>("POST", path, body);
export const rulrGet = <T>(path: string) => request<T>("GET", path);
