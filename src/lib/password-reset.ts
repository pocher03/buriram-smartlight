// src/lib/password-reset.ts
// ตรรกะรีเซ็ตรหัสผ่าน — แยกจาก route เพื่อให้ทดสอบและนำกลับมาใช้ซ้ำได้
//
// หลักความปลอดภัย:
//   - เก็บเฉพาะ hash ของ token ใน DB (ถ้า DB หลุด ก็ใช้ token ไม่ได้)
//   - หมดอายุ 30 นาที · ใช้ได้ครั้งเดียว (usedAt)
//   - ขอใหม่ = ยกเลิก token เก่าทั้งหมด
//   - ตอบกลับเหมือนกันเสมอไม่ว่าอีเมลจะมีจริงหรือไม่ (กัน account enumeration)

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { sendResetEmail } from "./mailer";

export const RESET_TOKEN_TTL_MIN = 30;
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

/** hash token ด้วย sha256 — เร็วพอสำหรับ token สุ่ม 32 ไบต์ (ไม่ใช่รหัสผ่านที่คนตั้งเอง) */
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * ขอลิงก์รีเซ็ตรหัสผ่าน
 * คืนค่าเหมือนกันเสมอ — ผู้เรียกไม่ควรเปิดเผยว่าอีเมลมีอยู่จริงหรือไม่
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });

  // ไม่พบผู้ใช้ → เงียบไว้ ไม่บอกผู้เรียก (กัน enumeration)
  if (!user) {
    console.log(`[password-reset] ไม่พบบัญชีสำหรับอีเมลที่ร้องขอ`);
    return;
  }

  // ยกเลิก token เก่าที่ยังไม่ถูกใช้ — ให้มีลิงก์ที่ใช้ได้ครั้งละ 1 ลิงก์เท่านั้น
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${rawToken}`;

  await sendResetEmail({
    to: user.email,
    name: user.name,
    link,
    minutes: RESET_TOKEN_TTL_MIN,
  });

  console.log(`[password-reset] ส่งลิงก์รีเซ็ตให้ผู้ใช้ ${user.username}`);
}

export type ResetResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "used" | "weak" };

/** ตรวจว่า token ยังใช้ได้ไหม (สำหรับหน้าตั้งรหัสใหม่ ก่อนแสดงฟอร์ม) */
export async function verifyResetToken(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!row || row.usedAt) return false;
  return row.expiresAt > new Date();
}

/** ตั้งรหัสผ่านใหม่ด้วย token */
export async function resetPassword(
  rawToken: string,
  newPassword: string
): Promise<ResetResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "weak" };
  }

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!row) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt <= new Date()) return { ok: false, reason: "expired" };

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // ตั้งรหัสใหม่ + ปลดล็อกบัญชี + ปิด token ในทรานแซกชันเดียว
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash, failedAttempts: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.accessLog.create({
      data: {
        userId: row.userId,
        action: "password_reset",
      },
    }),
  ]);

  return { ok: true };
}