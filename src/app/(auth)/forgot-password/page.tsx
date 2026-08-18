// src/app/(auth)/forgot-password/page.tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { forgotPasswordAction, type ForgotState } from "./actions";

const initial: ForgotState = { sent: false, error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="login-btn" disabled={pending}>
      {pending ? "กำลังดำเนินการ..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(forgotPasswordAction, initial);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-sf-3 dark:bg-dk-bg p-4">
      <div className="login-in w-full max-w-[380px] bg-sf dark:bg-dk-sf rounded-2xl shadow-g3 border border-bdr dark:border-dk-bdr overflow-hidden">
        {/* หัวเรื่อง */}
        <div className="px-6 pt-7 pb-5 text-center border-b border-bdr dark:border-dk-bdr">
          <div className="w-12 h-12 rounded-2xl bg-blu-lt dark:bg-blu/15 flex items-center justify-center mx-auto mb-3">
            <span className="ms ms-f text-blu" style={{ fontSize: 24 }}>lock_reset</span>
          </div>
          <h1 className="text-base font-bold text-t1 dark:text-dk-t1">ลืมรหัสผ่าน</h1>
          <p className="text-[11px] text-t3 mt-1 leading-relaxed">
            กรุณากรอกอีเมลที่ลงทะเบียนไว้กับระบบ<br />
            เพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
          </p>
        </div>

        <div className="px-6 py-6">
          {state.sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-grn-lt dark:bg-grn/15 flex items-center justify-center mx-auto mb-3">
                <span className="ms ms-f text-grn" style={{ fontSize: 26 }}>mark_email_read</span>
              </div>
              <p className="text-[13px] font-semibold text-t1 dark:text-dk-t1 mb-2">
                ดำเนินการเรียบร้อยแล้ว
              </p>
              <p className="text-[11px] text-t2 dark:text-dk-t2 leading-relaxed mb-5">
                หากอีเมลดังกล่าวมีอยู่ในระบบ ท่านจะได้รับลิงก์สำหรับตั้งรหัสผ่านใหม่ภายในไม่กี่นาที
                <br />
                <span className="text-t3">ลิงก์มีอายุการใช้งาน 30 นาที</span>
              </p>
              <Link
                href="/login"
                className="inline-block text-[12px] font-semibold text-blu hover:underline"
              >
                กลับสู่หน้าเข้าสู่ระบบ
              </Link>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[11px] font-medium text-t2 dark:text-dk-t2 mb-1.5">
                  อีเมล
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="กรอกอีเมลที่ลงทะเบียนไว้"
                  className="login-input"
                />
              </div>

              {state.error && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-lt dark:bg-red/10 border border-red/20">
                  <span className="ms ms-f text-red flex-shrink-0" style={{ fontSize: 15 }}>error</span>
                  <span className="text-[11px] text-red leading-relaxed">{state.error}</span>
                </div>
              )}

              <SubmitButton />

              <div className="text-center pt-1">
                <Link href="/login" className="text-[11px] text-t3 hover:text-blu transition">
                  กลับสู่หน้าเข้าสู่ระบบ
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}