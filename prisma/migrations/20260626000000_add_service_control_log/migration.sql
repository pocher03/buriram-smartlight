-- CreateTable
CREATE TABLE IF NOT EXISTS "service_control_logs" (
    "id" BIGSERIAL NOT NULL,
    "domain" TEXT,
    "username" TEXT,
    "object_id" BIGINT,
    "object_name" TEXT,
    "operate_describe" TEXT,
    "act_type" INTEGER,
    "ip_addr" TEXT,
    "error_code" INTEGER,
    "error_details" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_control_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "service_control_logs_occurred_at_idx" ON "service_control_logs"("occurred_at");
CREATE INDEX IF NOT EXISTS "service_control_logs_object_id_idx" ON "service_control_logs"("object_id");
