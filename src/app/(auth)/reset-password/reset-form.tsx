// src/app/(auth)/reset-password/reset-form.tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { resetPasswordAction, type ResetState } from "./actions";

const initial: ResetState = { done: false, error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="login-btn" disabled={pending}>
      {pending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
    </button>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useFormState(resetPasswordAction, initial);

  if (state.done) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-grn-lt dark:bg-grn/15 flex items-center justify-center mx-auto mb-3">
          <span className="ms ms-f text-grn" style={{ fontSize: 26 }}>check_circle</span>
        </div>
        <p className="text-[13px] font-semibold text-t1 dark:text-dk-t1 mb-2">
          ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว
        </p>
        <p className="text-[11px] text-t2 dark:text-dk-t2 leading-relaxed mb-5">
          ท่านสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
        </p>
        <Link href="/login" className="inline-block text-[12px] font-semibold text-blu hover:underline">
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="password" className="block text-[11px] font-medium text-t2 dark:text-dk-t2 mb-1.5">
          รหัสผ่านใหม่
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="อย่างน้อย 8 ตัวอักษร"
          className="login-input"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-[11px] font-medium text-t2 dark:text-dk-t2 mb-1.5">
          ยืนยันรหัสผ่านใหม่
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="กรอกรหัสผ่านอีกครั้ง"
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
    </form>
  );
}