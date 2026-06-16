// src/lib/auth-verify.ts
// ตรรกะยืนยันตัวตนแบบเต็ม (lock 30 วิ หลังผิด 3 ครั้ง + เขียน access log)
// เรียกจาก Server Action (login) — เป็นแหล่งความจริงเดียวที่ "นับครั้งผิด/บันทึก log"
// ส่วน authorize() ใน auth.ts ทำเฉพาะตรวจซ้ำเบาๆ เพื่อออก session เท่านั้น (ไม่นับ/ไม่ log)
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { writeAccessLog } from "./access-log";

const MAX_ATTEMPTS = 3;
const LOCK_MS = 30_000; // ล็อก 30 วินาที
// Phase 1: มีโครงการเดียว → super_admin redirect เข้าบุรีรัมย์ทันที
const PHASE1_PROJECT_ID = "buriram";

/** ชนิดผู้ใช้ที่ส่งเข้า session (ใช้ร่วมกันระหว่าง authorize และ verify) */
export interface SessionUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: User["role"];
  isCrossProject: boolean;
  projectId: string | null;
  activeProjectId: string | null;
}

/** กำหนด activeProjectId ตามสิทธิ์ — ยึด flag ไม่ hardcode ชื่อ role */
export function resolveActiveProject(user: Pick<User, "isCrossProject" | "projectId">): string | null {
  // super_admin (isCrossProject) — Phase 1 เลือกบุรีรัมย์อัตโนมัติ
  // admin — ผูก projectId ของตัวเองตายตัว
  return user.isCrossProject ? PHASE1_PROJECT_ID : user.projectId;
}

export function buildSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    isCrossProject: user.isCrossProject,
    projectId: user.projectId,
    activeProjectId: resolveActiveProject(user),
  };
}

export type VerifyResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "invalid" | "locked"; retryAfter?: number };

export interface VerifyContext {
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * ยืนยัน username/password พร้อมจัดการการล็อกบัญชีและ audit log
 * - ผิด 3 ครั้งติด → ล็อก 30 วินาที (ระหว่างล็อก คืน reason="locked")
 * - สำเร็จ → รีเซ็ตตัวนับ + เขียน login (+ select_project ถ้าเป็น super_admin)
 */
export async function verifyCredentials(
  rawUsername: string,
  password: string,
  ctx: VerifyContext = {}
): Promise<VerifyResult> {
  const username = rawUsername.trim();
  if (!username || !password) return { ok: false, reason: "invalid" };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    await writeAccessLog({ username, action: "login_failed", ...ctx });
    return { ok: false, reason: "invalid" };
  }

  const now = Date.now();

  // กำลังถูกล็อกอยู่
  if (user.lockedUntil && user.lockedUntil.getTime() > now) {
    await writeAccessLog({ userId: user.id, username, action: "login_failed", ...ctx });
    return {
      ok: false,
      reason: "locked",
      retryAfter: Math.ceil((user.lockedUntil.getTime() - now) / 1000),
    };
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    const attempts = user.failedAttempts + 1;
    const willLock = attempts >= MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      // เมื่อตั้งล็อก รีเซ็ตตัวนับเป็น 0 → หลังครบ 30 วิ ได้ลองใหม่ 3 ครั้งสด
      data: {
        failedAttempts: willLock ? 0 : attempts,
        lockedUntil: willLock ? new Date(now + LOCK_MS) : null,
      },
    });
    await writeAccessLog({ userId: user.id, username, action: "login_failed", ...ctx });
    if (willLock) return { ok: false, reason: "locked", retryAfter: LOCK_MS / 1000 };
    return { ok: false, reason: "invalid" };
  }

  // สำเร็จ — รีเซ็ตตัวนับ/ปลดล็อก
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  const sessionUser = buildSessionUser(user);
  await writeAccessLog({
    userId: user.id,
    username,
    action: "login",
    activeProjectId: sessionUser.activeProjectId,
    ...ctx,
  });
  // super_admin: บันทึกว่าเข้าโครงการไหน (Phase 1 = บุรีรัมย์อัตโนมัติ)
  if (user.isCrossProject) {
    await writeAccessLog({
      userId: user.id,
      username,
      action: "select_project",
      activeProjectId: sessionUser.activeProjectId,
      ...ctx,
    });
  }

  return { ok: true, user: sessionUser };
}
