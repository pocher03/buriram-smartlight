"use server";
// Server Action สำหรับเข้าสู่ระบบ — ยืนยันตัวตน + จัดการล็อกบัญชี + IP throttle + เขียน access log
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { verifyCredentials } from "@/lib/auth-verify";

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const h = headers();
  // เชื่อ X-Real-IP ก่อน (Caddy ประทับให้ ปลอมไม่ได้) — X-Forwarded-For เป็น fallback สำหรับ dev ที่ไม่มี Caddy
  const ip =
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;
  const userAgent = h.get("user-agent");

  const result = await verifyCredentials(username, password, { ip, userAgent });

  if (!result.ok) {
    if (result.reason === "throttled") {
      const mins = Math.max(1, Math.ceil((result.retryAfter ?? 900) / 60));
      return {
        error: `ตรวจพบการพยายามเข้าสู่ระบบผิดพลาดจำนวนมากจากหมายเลขไอพีของท่าน ระบบได้ระงับการเข้าสู่ระบบชั่วคราวเพื่อความปลอดภัย กรุณาลองใหม่อีกครั้งในอีกประมาณ ${mins} นาที`,
      };
    }
    if (result.reason === "locked") {
      return {
        error: `บัญชีถูกระงับชั่วคราวเนื่องจากกรอกรหัสผ่านผิดเกินกำหนด กรุณาลองใหม่ในอีก ${
          result.retryAfter ?? 30
        } วินาที`,
      };
    }
    return { error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" };
  }

  await signIn("credentials", { username, password, redirect: false });
  redirect("/");
}