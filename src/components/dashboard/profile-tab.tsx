"use client";

// แท็บ "โปรไฟล์" (mobile only) — แทน dropdown menu บน header ของ Desktop
// รวม: ข้อมูล session, สลับธีม สว่าง/มืด, ประวัติ Session ของฉัน,
//      บันทึกการเข้าใช้งานระบบ, และออกจากระบบ
// re-use logic เดิมทั้งหมด (AccessLogModal / logoutAction / next-themes)
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { DashboardUser } from "./dashboard";
import { logoutAction } from "@/app/(dashboard)/actions";
import { AccessLogModal } from "./access-log-modal";

export function ProfileTab({ user }: { user: DashboardUser }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [logModal, setLogModal] = useState<"me" | "all" | null>(null);

  useEffect(() => setMounted(true), []);

  const roleLabel =
    user.role === "super_admin"
      ? "ผู้ดูแลระบบส่วนกลาง (Super Admin)"
      : "ผู้ดูแลระบบเทศบาล (Admin)";
  const avatarChar = (user.name?.trim()?.[0] ?? "A").toUpperCase();
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-sf-2 dark:bg-dk-bg p-4">
      {/* การ์ดข้อมูลผู้ใช้ */}
      <div className="bg-sf dark:bg-dk-sf border border-bdr dark:border-dk-bdr rounded-2xl p-4 flex items-center gap-3.5 shadow-g1">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blu to-blu-dk flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-g2">
          {avatarChar}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-t1 dark:text-dk-t1 truncate">
            {user.name || "--"}
          </div>
          <div className="text-[11px] text-t3 mt-0.5">{roleLabel}</div>
          <div className="text-[11px] text-t3 truncate">{user.email || "--"}</div>
          {user.role === "super_admin" && (
            <div className="text-[11px] text-t3 truncate mt-0.5">
              โครงการที่ใช้งาน: {user.activeProjectId || "--"}
            </div>
          )}
        </div>
      </div>

      {/* สลับธีม สว่าง/มืด */}
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="w-full mt-3 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-sf dark:bg-dk-sf border border-bdr dark:border-dk-bdr text-left shadow-g1"
      >
        <span className="ms ms-f text-blu" style={{ fontSize: 20 }}>
          {isDark ? "light_mode" : "dark_mode"}
        </span>
        <span className="flex-1 text-[13px] font-semibold text-t1 dark:text-dk-t1">
          ธีมการแสดงผล
        </span>
        <span className="text-[12px] font-semibold text-t2 dark:text-dk-t2">
          {isDark ? "โหมดมืด" : "โหมดสว่าง"}
        </span>
      </button>

      {/* เมนูประวัติ/บันทึก */}
      <div className="mt-3 bg-sf dark:bg-dk-sf border border-bdr dark:border-dk-bdr rounded-2xl overflow-hidden shadow-g1">
        <MenuButton
          icon="history"
          label="ประวัติ Session ของฉัน"
          onClick={() => setLogModal("me")}
        />
        <div className="h-px bg-bdr dark:bg-dk-bdr mx-4" />
        <MenuButton
          icon="shield_person"
          label="บันทึกการเข้าใช้งานระบบ"
          onClick={() => setLogModal("all")}
        />
      </div>

      {/* ออกจากระบบ */}
      <form action={logoutAction} className="mt-3">
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-red/10 border border-red/20 text-red font-semibold text-[13px]"
        >
          <span className="ms ms-f" style={{ fontSize: 20 }}>
            logout
          </span>
          ออกจากระบบ
        </button>
      </form>

      {logModal && (
        <AccessLogModal variant={logModal} onClose={() => setLogModal(null)} />
      )}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-sf-3 dark:active:bg-dk-sf2 transition"
    >
      <span className="ms ms-f text-blu" style={{ fontSize: 20 }}>
        {icon}
      </span>
      <span className="flex-1 text-[13px] font-semibold text-t1 dark:text-dk-t1">
        {label}
      </span>
      <span className="ms text-t3" style={{ fontSize: 18 }}>
        chevron_right
      </span>
    </button>
  );
}
