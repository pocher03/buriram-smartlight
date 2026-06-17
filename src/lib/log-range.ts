// แปลง range filter (today | 7d | 30d) → เวลาเริ่มต้น (UTC) สำหรับ query access_logs
// today = เที่ยงคืนตามเวลาไทย (Asia/Bangkok, UTC+7); null = ไม่กรอง (ล่าสุด 100 รายการ)
const BKK_OFFSET_MIN = 7 * 60;

export function rangeToGte(range: string | null): Date | null {
  const now = new Date();
  switch (range) {
    case "today": {
      const bkkNow = new Date(now.getTime() + BKK_OFFSET_MIN * 60000);
      const midnightUtc =
        Date.UTC(
          bkkNow.getUTCFullYear(),
          bkkNow.getUTCMonth(),
          bkkNow.getUTCDate(),
        ) -
        BKK_OFFSET_MIN * 60000;
      return new Date(midnightUtc);
    }
    case "7d":
      return new Date(now.getTime() - 7 * 86400000);
    case "30d":
      return new Date(now.getTime() - 30 * 86400000);
    default:
      return null;
  }
}
