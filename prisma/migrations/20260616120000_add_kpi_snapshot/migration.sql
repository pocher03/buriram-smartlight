-- CreateTable
CREATE TABLE "kpi_snapshots" (
    "project_id" TEXT NOT NULL,
    "light_total" INTEGER,
    "light_online_num" INTEGER,
    "light_switch_num" INTEGER,
    "alarm_num" INTEGER,
    "process_alarm_num" INTEGER,
    "deal_alarm_num" INTEGER,
    "alarm_total" INTEGER,
    "autual_energy" DOUBLE PRECISION,
    "open_time" TEXT,
    "close_time" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("project_id")
);
