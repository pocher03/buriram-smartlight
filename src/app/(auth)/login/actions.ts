"use server";
// Server Action สำหรับเข้าสู่ระบบ — ยืนยันตัวตน + จัดการล็อกบัญชี + เขียน access log
// ทำ logic ทั้งหมดที่ verifyCredentials แล้วค่อย signIn เพื่อออก session (กัน double-count)
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
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const userAgent = h.get("user-agent");

  const result = await verifyCredentials(username, password, { ip, userAgent });

  if (!result.ok) {
    if (result.reason === "locked") {
      return {
        error: `บัญชีถูกระงับชั่วคราวเนื่องจากกรอกรหัสผ่านผิดเกินกำหนด กรุณาลองใหม่ในอีก ${
          result.retryAfter ?? 30
        } วินาที`,
      };
    }
    return { error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" };
  }

  // ตรวจผ่านแล้ว → ออก session (authorize ตรวจซ้ำเบาๆ ไม่นับครั้งผิด)
  await signIn("credentials", { username, password, redirect: false });
  redirect("/");
}
