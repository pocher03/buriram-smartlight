-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'super_admin');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('controller', 'solar');

-- CreateEnum
CREATE TYPE "AlarmLevel" AS ENUM ('crit', 'warn', 'info', 'ok');

-- CreateEnum
CREATE TYPE "HandleStatus" AS ENUM ('pending', 'processing', 'done');

-- CreateEnum
CREATE TYPE "EnergyType" AS ENUM ('daily', 'monthly');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "division_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'admin',
    "is_cross_project" BOOLEAN NOT NULL DEFAULT false,
    "project_id" TEXT,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "rulr_object_id" BIGINT NOT NULL,
    "things_object_id" BIGINT,
    "things_object_addr" TEXT,
    "name" TEXT NOT NULL,
    "model_name" TEXT,
    "device_type" "DeviceType" NOT NULL DEFAULT 'controller',
    "project_id" TEXT NOT NULL,
    "zone_id" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "location_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "voltage" DOUBLE PRECISION,
    "electricity" DOUBLE PRECISION,
    "actp" DOUBLE PRECISION,
    "acte" DOUBLE PRECISION,
    "frequency" DOUBLE PRECISION,
    "switch_status" INTEGER,
    "online_status" INTEGER,
    "brightness" INTEGER,
    "illumination" INTEGER,
    "runtime" INTEGER,
    "snr" INTEGER,
    "soc" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarm_logs" (
    "id" BIGSERIAL NOT NULL,
    "rulr_alarm_id" BIGINT NOT NULL,
    "device_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alarm_level" "AlarmLevel" NOT NULL DEFAULT 'info',
    "handle_status" "HandleStatus" NOT NULL DEFAULT 'pending',
    "division_name" TEXT,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL,
    "inserted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alarm_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_stats" (
    "id" BIGSERIAL NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" "EnergyType" NOT NULL,
    "period" TEXT NOT NULL,
    "energy_now" DOUBLE PRECISION,
    "energy_prev" DOUBLE PRECISION,
    "save_energy" DOUBLE PRECISION,
    "reduction" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fault_aggregates" (
    "id" BIGSERIAL NOT NULL,
    "project_id" TEXT NOT NULL,
    "zone_name" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fault_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_cache" (
    "id" SERIAL NOT NULL,
    "project_id" TEXT NOT NULL,
    "temp" DOUBLE PRECISION,
    "description" TEXT,
    "humidity" INTEGER,
    "pm25" INTEGER,
    "co2" INTEGER,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "active_project_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_store" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'rulr',
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_type" TEXT NOT NULL DEFAULT 'bearer',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "refresh_expires_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_division_id_key" ON "projects"("division_id");

-- CreateIndex
CREATE INDEX "zones_project_id_idx" ON "zones"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_project_id_idx" ON "users"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_rulr_object_id_key" ON "devices"("rulr_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_name_key" ON "devices"("name");

-- CreateIndex
CREATE INDEX "devices_project_id_idx" ON "devices"("project_id");

-- CreateIndex
CREATE INDEX "devices_zone_id_idx" ON "devices"("zone_id");

-- CreateIndex
CREATE INDEX "telemetry_snapshots_device_id_created_at_idx" ON "telemetry_snapshots"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "telemetry_snapshots_created_at_idx" ON "telemetry_snapshots"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "alarm_logs_rulr_alarm_id_key" ON "alarm_logs"("rulr_alarm_id");

-- CreateIndex
CREATE INDEX "alarm_logs_created_at_idx" ON "alarm_logs"("created_at");

-- CreateIndex
CREATE INDEX "energy_stats_project_id_type_idx" ON "energy_stats"("project_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "energy_stats_project_id_type_period_key" ON "energy_stats"("project_id", "type", "period");

-- CreateIndex
CREATE INDEX "fault_aggregates_project_id_idx" ON "fault_aggregates"("project_id");

-- CreateIndex
CREATE INDEX "weather_cache_project_id_idx" ON "weather_cache"("project_id");

-- CreateIndex
CREATE INDEX "access_logs_created_at_idx" ON "access_logs"("created_at");

-- CreateIndex
CREATE INDEX "access_logs_user_id_idx" ON "access_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "token_store_provider_key" ON "token_store"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_snapshots" ADD CONSTRAINT "telemetry_snapshots_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- APPEND-ONLY GUARDS (กฎเหล็ก #7 / TOR ๔.๗.๒–๔.๗.๓)
-- alarm_logs และ access_logs ห้าม UPDATE/DELETE — บังคับด้วย trigger
-- (มีผลแม้เชื่อมต่อด้วย role เจ้าของตาราง)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ตาราง % เป็น APPEND-ONLY — ห้าม % (กฎเหล็ก #7)', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_alarm_logs BEFORE UPDATE ON "alarm_logs"
  FOR EACH ROW EXECUTE FUNCTION trg_append_only();
CREATE TRIGGER no_delete_alarm_logs BEFORE DELETE ON "alarm_logs"
  FOR EACH ROW EXECUTE FUNCTION trg_append_only();
CREATE TRIGGER no_update_access_logs BEFORE UPDATE ON "access_logs"
  FOR EACH ROW EXECUTE FUNCTION trg_append_only();
CREATE TRIGGER no_delete_access_logs BEFORE DELETE ON "access_logs"
  FOR EACH ROW EXECUTE FUNCTION trg_append_only();
