// src/components/dashboard/support-modal.tsx
// กล่องข้อมูลติดต่อเจ้าหน้าที่ — เรียกจากเมนูโปรไฟล์ใน dashboard
"use client";

import { SUPPORT_INFO } from "@/lib/support-info";

export function SupportModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="dropdown-in w-full max-w-sm bg-sf dark:bg-dk-sf border border-bdr dark:border-dk-bdr rounded-2xl shadow-g3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-bdr dark:border-dk-bdr">
          <div className="flex items-center gap-2">
            <span className="ms ms-f text-grn" style={{ fontSize: 18 }}>support_agent</span>
            <span className="text-sm font-bold text-t1 dark:text-dk-t1">ติดต่อเจ้าหน้าที่</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-t3 hover:bg-sf-3 dark:hover:bg-dk-sf2 transition"
            title="ปิด"
          >
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="px-5 py-5 space-y-3">
          <p className="text-[11px] text-t2 dark:text-dk-t2 leading-relaxed">
            หากพบปัญหาการใช้งานระบบ กรุณาติดต่อเจ้าหน้าที่ตามช่องทางด้านล่าง
          </p>

          {/* โทรศัพท์ */}
          <a
            href={`tel:${SUPPORT_INFO.phoneHref}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-grn-lt dark:bg-grn/10 border border-grn/20 hover:border-grn/40 transition group"
          >
            <div className="w-9 h-9 rounded-lg bg-grn/15 flex items-center justify-center flex-shrink-0">
              <span className="ms ms-f text-grn" style={{ fontSize: 18 }}>call</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] text-t3">โทรศัพท์</div>
              <div className="text-[14px] font-bold text-grn tabular-nums tracking-wide">
                {SUPPORT_INFO.phone}
              </div>
            </div>
            <span className="ms text-t3 group-hover:text-grn transition" style={{ fontSize: 16 }}>
              chevron_right
            </span>
          </a>

          {/* เวลาทำการ */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-sf-2 dark:bg-dk-sf2 border border-bdr/60 dark:border-dk-bdr">
            <div className="w-9 h-9 rounded-lg bg-blu/10 flex items-center justify-center flex-shrink-0">
              <span className="ms ms-f text-blu" style={{ fontSize: 18 }}>schedule</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] text-t3">เวลาทำการ</div>
              <div className="text-[11px] font-semibold text-t1 dark:text-dk-t1 leading-snug">
                {SUPPORT_INFO.officeHours}
              </div>
              <div className="text-[9px] text-t3 mt-0.5">{SUPPORT_INFO.officeHoursNote}</div>
            </div>
          </div>

          <div className="pt-1 text-center">
            <div className="text-[9px] text-t3">ผู้พัฒนาและดูแลระบบ</div>
            <div className="text-[11px] font-semibold text-t2 dark:text-dk-t2 mt-0.5">
              {SUPPORT_INFO.company}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}