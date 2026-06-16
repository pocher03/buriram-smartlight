// กฎเหล็ก #8: ข้อมูลจำลองต้องติดป้าย "ข้อมูลสาธิต" ทุกหน้าจอ
export function DemoBanner() {
  return (
    <div className="flex-shrink-0 flex items-center justify-center gap-2 h-7 bg-yel/15 border-b border-yel/30 text-yel text-[11px] font-semibold">
      <span className="ms ms-f" style={{ fontSize: 14 }}>
        warning
      </span>
      ⚠️ ข้อมูลสาธิต (Demo Mode) — ยังไม่ใช่ข้อมูลจริงจากระบบ
    </div>
  );
}
