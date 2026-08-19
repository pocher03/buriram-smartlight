// src/app/(auth)/contact/page.tsx
// หน้าติดต่อเจ้าหน้าที่ — เข้าได้โดยไม่ต้องเข้าสู่ระบบ (อยู่ใน PUBLIC_PATHS)
import Link from "next/link";
import { SUPPORT_INFO } from "@/lib/support-info";

export default function ContactPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-sf-3 dark:bg-dk-bg p-4">
      <div className="login-in w-full max-w-[420px] bg-sf dark:bg-dk-sf rounded-2xl shadow-g3 border border-bdr dark:border-dk-bdr overflow-hidden">
        {/* หัวเรื่อง */}
        <div className="px-6 pt-7 pb-5 text-center border-b border-bdr dark:border-dk-bdr">
          <div className="w-12 h-12 rounded-2xl bg-grn-lt dark:bg-grn/15 flex items-center justify-center mx-auto mb-3">
            <span className="ms ms-f text-grn" style={{ fontSize: 24 }}>support_agent</span>
          </div>
          <h1 className="text-base font-bold text-t1 dark:text-dk-t1">ติดต่อเจ้าหน้าที่</h1>
          <p className="text-[11px] text-t3 mt-1 leading-relaxed">
            หากพบปัญหาการใช้งานระบบ<br />
            กรุณาติดต่อเจ้าหน้าที่ตามช่องทางด้านล่าง
          </p>
        </div>

        <div className="px-6 py-6 space-y-3">
          {/* โทรศัพท์ */}
          <a
            href={`tel:${SUPPORT_INFO.phoneHref}`}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-grn-lt dark:bg-grn/10 border border-grn/20 hover:border-grn/40 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-grn/15 flex items-center justify-center flex-shrink-0">
              <span className="ms ms-f text-grn" style={{ fontSize: 20 }}>call</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-t3 mb-0.5">โทรศัพท์</div>
              <div className="text-[15px] font-bold text-grn tabular-nums tracking-wide">
                {SUPPORT_INFO.phone}
              </div>
            </div>
            <span className="ms text-t3 group-hover:text-grn transition" style={{ fontSize: 18 }}>
              chevron_right
            </span>
          </a>

          {/* เวลาทำการ */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-sf-2 dark:bg-dk-sf2 border border-bdr/60 dark:border-dk-bdr">
            <div className="w-10 h-10 rounded-xl bg-blu/10 flex items-center justify-center flex-shrink-0">
              <span className="ms ms-f text-blu" style={{ fontSize: 20 }}>schedule</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-t3 mb-0.5">เวลาทำการ</div>
              <div className="text-[12px] font-semibold text-t1 dark:text-dk-t1 leading-snug">
                {SUPPORT_INFO.officeHours}
              </div>
              <div className="text-[10px] text-t3 mt-1">
                {SUPPORT_INFO.officeHoursNote}
              </div>
            </div>
          </div>

          {/* ผู้ดูแลระบบ */}
          <div className="pt-2 text-center">
            <div className="text-[10px] text-t3 mb-1">ผู้พัฒนาและดูแลระบบ</div>
            <div className="text-[12px] font-semibold text-t2 dark:text-dk-t2">
              {SUPPORT_INFO.company}
            </div>
          </div>

          <div className="pt-3 text-center border-t border-bdr dark:border-dk-bdr">
            <Link
              href="/login"
              className="inline-block text-[12px] font-semibold text-blu hover:underline"
            >
              กลับสู่หน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
