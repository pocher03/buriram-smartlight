// src/lib/access-log.ts
// เขียน access_logs — APPEND-ONLY (กฎเหล็ก #7 / TOR ๔.๗.๒–๔.๗.๓)
// บันทึกทุกครั้งที่ login สำเร็จ/ล้มเหลว/ออกจากระบบ/เลือกโครงการ
// ห้าม UPDATE/DELETE (บังคับระดับ DB trigger — ดู prisma/sql/append_only_guards.sql)
import { prisma } from "./prisma";

export type AccessAction =
  | "login"
  | "login_failed"
  | "logout"
  | "select_project";

export interface AccessLogEntry {
  userId?: string | null;
  username?: string | null;
  action: AccessAction;
  activeProjectId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export async function writeAccessLog(e: AccessLogEntry): Promise<void> {
  try {
    await prisma.accessLog.create({
      data: {
        userId: e.userId ?? null,
        username: e.username ?? null,
        action: e.action,
        activeProjectId: e.activeProjectId ?? null,
        ip: e.ip ?? null,
        userAgent: e.userAgent ?? null,
      },
    });
  } catch (err) {
    // ห้ามให้ audit log ที่ล้มเหลวทำให้ flow login พัง — log ไว้เฉยๆ
    console.error("[access-log] write failed:", err);
  }
}
