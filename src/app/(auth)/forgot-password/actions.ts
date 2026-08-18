// src/app/(auth)/forgot-password/actions.ts
"use server";

import { requestPasswordReset } from "@/lib/password-reset";

export interface ForgotState {
  sent: boolean;
  error: string | null;
}

export async function forgotPasswordAction(
  _prev: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { sent: false, error: "กรุณากรอกอีเมลให้ถูกต้อง" };
  }

  try {
    await requestPasswordReset(email);
  } catch (e) {
    console.error("[forgot-password]", (e as Error).message);
    return {
      sent: false,
      error: "ไม่สามารถส่งอีเมลได้ในขณะนี้ กรุณาติดต่อผู้ดูแลระบบ",
    };
  }

  // ตอบเหมือนกันเสมอ ไม่ว่าอีเมลจะมีในระบบหรือไม่ (กัน account enumeration)
  return { sent: true, error: null };
}