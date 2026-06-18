"use client";

// Shell แบบ responsive สำหรับ modal:
//  - Desktop (≥768px): center-modal เหมือนเดิมทุกอย่าง (md:items-center, rounded รอบ)
//  - Mobile (<768px): Bottom Sheet เลื่อนขึ้นจากด้านล่างจอ สูง ~88vh มี handle bar + ปุ่มปิด
// เนื้อหาภายใน (children) scroll ได้ตามปกติ — ไม่ขัดกฎเหล็ก #2 เพราะเป็น scroll ภายใน sheet
import type { ReactNode } from "react";

interface BottomSheetProps {
  title: string;
  /** ชื่อ Material Symbol ที่หัวเรื่อง */
  icon?: string;
  onClose: () => void;
  /** ความกว้างสูงสุดบน desktop (Tailwind class) */
  maxWidthClass?: string;
  children: ReactNode;
}

export function BottomSheet({
  title,
  icon,
  onClose,
  maxWidthClass = "md:max-w-3xl",
  children,
}: BottomSheetProps) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className={`sheet-in md:dropdown-in w-full ${maxWidthClass} h-[88vh] max-h-[88vh] md:h-auto md:max-h-[80vh] flex flex-col bg-sf dark:bg-dk-sf border border-bdr dark:border-dk-bdr rounded-t-2xl md:rounded-2xl shadow-g3 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar — แสดงเฉพาะ mobile */}
        <div className="md:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-bdr dark:bg-dk-bdr" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-bdr dark:border-dk-bdr flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="ms ms-f text-blu" style={{ fontSize: 20 }}>
                {icon}
              </span>
            )}
            <span className="text-sm font-bold text-t1 dark:text-dk-t1">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-t3 hover:bg-sf-3 dark:hover:bg-dk-sf2 transition"
            title="ปิด"
          >
            <span className="ms" style={{ fontSize: 20 }}>
              close
            </span>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
