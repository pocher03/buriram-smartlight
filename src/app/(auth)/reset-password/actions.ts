// src/app/(auth)/reset-password/actions.ts
"use server";

import { resetPassword } from "@/lib/password-reset";

export interface ResetState {
  done: boolean;
  error: string | null;
}

const REASON_TH: Record<string, string> = {
  invalid: "ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์ใหม่อีกครั้ง",
  expired: "ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง",
  used: "ลิงก์นี้ถูกใช้งานไปแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง",
  weak: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร",
};

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password !== confirm) {
    return { done: false, error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };
  }

  const result = await resetPassword(token, password);
  if (!result.ok) {
    return { done: false, error: REASON_TH[result.reason] ?? "เกิดข้อผิดพลาด" };
  }

  return { done: true, error: null };
}