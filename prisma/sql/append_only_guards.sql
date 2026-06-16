-- ============================================================
-- append_only_guards.sql — กฎเหล็ก #7 / TOR ๔.๗.๒–๔.๗.๓
-- บังคับ alarm_logs และ access_logs เป็น APPEND-ONLY (ห้าม UPDATE/DELETE)
--
-- รันหลัง `prisma migrate deploy` ทุกครั้งที่ migration สร้าง/รีเซ็ตตารางนี้:
--   psql "$DATABASE_URL" -f prisma/sql/append_only_guards.sql
--
-- ใช้ trigger (ไม่ใช่ REVOKE) เพื่อให้ผลแม้เชื่อมต่อด้วย role เจ้าของตาราง
-- ============================================================

CREATE OR REPLACE FUNCTION trg_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ตาราง % เป็น APPEND-ONLY — ห้าม % (กฎเหล็ก #7 / พ.ร.บ.คอมพิวเตอร์ฯ)',
    TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

-- alarm_logs
DROP TRIGGER IF EXISTS no_update_alarm_logs ON "alarm_logs";
DROP TRIGGER IF EXISTS no_delete_alarm_logs ON "alarm_logs";
CREATE TRIGGER no_update_alarm_logs BEFORE UPDATE ON "alarm_logs"
  FOR EACH ROW EXECUTE FUNCTION trg_append_only();
CREATE TRIGGER no_delete_alarm_logs BEFORE DELETE ON "alarm_logs"
  FOR EACH ROW EXECUTE FUNCTION trg_append_only();

-- access_logs
DROP TRIGGER IF EXISTS no_update_access_logs ON "access_logs";
DROP TRIGGER IF EXISTS no_delete_access_logs ON "access_logs";
CREATE TRIGGER no_update_access_logs BEFORE UPDATE ON "access_logs"
  FOR EACH ROW EXECUTE FUNCTION trg_append_only();
CREATE TRIGGER no_delete_access_logs BEFORE DELETE ON "access_logs"
  FOR EACH ROW EXECUTE FUNCTION trg_append_only();
