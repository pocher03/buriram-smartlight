// src/lib/auth-verify.ts
// ตรรกะยืนยันตัวตนแบบเต็ม (lock 30 วิ หลังผิด 3 ครั้ง + IP throttle + เขียน access log)
// เรียกจาก Server Action (login) — เป็นแหล่งความจริงเดียวที่ "นับครั้งผิด/บันทึก log"
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { writeAccessLog } from "./access-log";

const MAX_ATTEMPTS = 3;
const LOCK_MS = 30_000; // ล็อกบัญชี 30 วินาที

// ── IP throttle (ด่านนอกสุด กัน brute-force แบบสุ่มหลายบัญชีจาก IP เดียว) ──
const IP_MAX_FAILURES = 10;        // เพดานความล้มเหลวต่อหนึ่ง IP ในกรอบเวลา
const IP_WINDOW_MS = 15 * 60_000;  // กรอบเวลานับย้อนหลัง 15 นาที

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
  | { ok: false; reason: "invalid" | "locked" | "throttled"; retryAfter?: number };

export interface VerifyContext {
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * จำกัดอัตราการพยายามเข้าสู่ระบบต่อหนึ่งหมายเลข IP
 * นับจาก access_logs (action=login_failed) ในกรอบ 15 นาที — ไม่ต้องมีตารางใหม่/ไม่ต้องมี cron
 * เมื่อถึงเพดาน คืนเวลาที่ควรลองใหม่ (วินาที) จากรายการที่เก่าที่สุดในกรอบเวลา
 */
async function checkIpThrottle(
  ip: string
): Promise<{ blocked: boolean; retryAfter?: number }> {
  const since = new Date(Date.now() - IP_WINDOW_MS);
  const failures = await prisma.accessLog.count({
    where: { ip, action: "login_failed", createdAt: { gte: since } },
  });
  if (failures < IP_MAX_FAILURES) return { blocked: false };

  const oldest = await prisma.accessLog.findFirst({
    where: { ip, action: "login_failed", createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const retryAfter = oldest
    ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + IP_WINDOW_MS - Date.now()) / 1000))
    : Math.ceil(IP_WINDOW_MS / 1000);
  return { blocked: true, retryAfter };
}

/**
 * ยืนยัน username/password พร้อมจัดการ IP throttle + ล็อกบัญชี + audit log
 * ลำดับด่าน: [1] IP throttle → [2] ล็อกบัญชี → [3] เทียบรหัสผ่าน
 */
export async function verifyCredentials(
  rawUsername: string,
  password: string,
  ctx: VerifyContext = {}
): Promise<VerifyResult> {
  const username = rawUsername.trim();
  if (!username || !password) return { ok: false, reason: "invalid" };

  // ── ด่าน 1: IP throttle (ตรวจก่อน lookup ผู้ใช้/เทียบรหัส เพื่อไม่ให้ผู้โจมตีกินทรัพยากรระบบ) ──
  if (ctx.ip) {
    const throttle = await checkIpThrottle(ctx.ip);
    if (throttle.blocked) {
      // ใช้ action แยก "login_blocked" — บันทึกไว้เป็นหลักฐาน แต่ไม่นับซ้ำเข้าตัวนับ (กัน feedback loop)
      await writeAccessLog({ username, action: "login_blocked", ...ctx });
      return { ok: false, reason: "throttled", retryAfter: throttle.retryAfter };
    }
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    await writeAccessLog({ username, action: "login_failed", ...ctx });
    return { ok: false, reason: "invalid" };
  }

  const now = Date.now();

  // ── ด่าน 2: บัญชีกำลังถูกล็อกอยู่ ──
  if (user.lockedUntil && user.lockedUntil.getTime() > now) {
    await writeAccessLog({ userId: user.id, username, action: "login_failed", ...ctx });
    return {
      ok: false,
      reason: "locked",
      retryAfter: Math.ceil((user.lockedUntil.getTime() - now) / 1000),
    };
  }

  // ── ด่าน 3: เทียบรหัสผ่าน ──
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    const attempts = user.failedAttempts + 1;
    const willLock = attempts >= MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
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