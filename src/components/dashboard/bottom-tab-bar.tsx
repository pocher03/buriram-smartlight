"use client";

// Bottom Tab Bar (mobile only) — 4 แท็บ สลับ state activeTab เท่านั้น ไม่มี logic คำนวณ
// อยู่ล่างสุดของจอ (flex-shrink-0 ในคอลัมน์เต็มจอ) + safe-area-inset สำหรับ iOS
export type MobileTab = "overview" | "map" | "history" | "profile";

const TABS: { key: MobileTab; label: string; icon: string }[] = [
  { key: "overview", label: "ภาพรวม", icon: "dashboard" },
  { key: "map", label: "แผนที่", icon: "map" },
  { key: "history", label: "ประวัติ", icon: "history" },
  { key: "profile", label: "โปรไฟล์", icon: "person" },
];

export function BottomTabBar({
  activeTab,
  onChange,
}: {
  activeTab: MobileTab;
  onChange: (t: MobileTab) => void;
}) {
  return (
    <nav
      className="flex-shrink-0 flex items-stretch bg-sf dark:bg-dk-sf border-t border-bdr dark:border-dk-bdr"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((t) => {
        const active = activeTab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-current={active ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition ${
              active ? "text-blu" : "text-t3"
            }`}
          >
            <span
              className={`ms ${active ? "ms-f" : ""}`}
              style={{ fontSize: 22 }}
            >
              {t.icon}
            </span>
            <span className="text-[10px] font-semibold leading-none">
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
