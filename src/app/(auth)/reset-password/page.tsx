// src/app/(auth)/reset-password/page.tsx
import Link from "next/link";
import { verifyResetToken } from "@/lib/password-reset";
import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";
  const valid = await verifyResetToken(token);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-sf-3 dark:bg-dk-bg p-4">
      <div className="login-in w-full max-w-[380px] bg-sf dark:bg-dk-sf rounded-2xl shadow-g3 border border-bdr dark:border-dk-bdr overflow-hidden">
        <div className="px-6 pt-7 pb-5 text-center border-b border-bdr dark:border-dk-bdr">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
            valid ? "bg-blu-lt dark:bg-blu/15" : "bg-red-lt dark:bg-red/15"
          }`}>
            <span className={`ms ms-f ${valid ? "text-blu" : "text-red"}`} style={{ fontSize: 24 }}>
              {valid ? "password" : "link_off"}
            </span>
          </div>
          <h1 className="text-base font-bold text-t1 dark:text-dk-t1">
            {valid ? "ตั้งรหัสผ่านใหม่" : "ลิงก์ไม่ถูกต้อง"}
          </h1>
          {valid && (
            <p className="text-[11px] text-t3 mt-1">
              กรุณากำหนดรหัสผ่านใหม่สำหรับบัญชีของท่าน
            </p>
          )}
        </div>

        <div className="px-6 py-6">
          {valid ? (
            <ResetForm token={token} />
          ) : (
            <div className="text-center">
              <p className="text-[12px] text-t2 dark:text-dk-t2 leading-relaxed mb-5">
                ลิงก์นี้ไม่ถูกต้อง หมดอายุ หรือถูกใช้งานไปแล้ว
                <br />
                กรุณาขอลิงก์ใหม่อีกครั้ง
              </p>
              <Link
                href="/forgot-password"
                className="inline-block text-[12px] font-semibold text-blu hover:underline"
              >
                ขอลิงก์ตั้งรหัสผ่านใหม่
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}