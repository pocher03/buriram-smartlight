// src/workers/jobs/sync-service-control-log.ts
// CRON: ดึง log การสั่งการอุปกรณ์จาก /mm/api/sys/operate/log/rulr → service_control_logs
// endpoint นี้ไม่มีในเอกสาร RULR — ได้รับจากทีมจีนโดยตรง
// format วันที่: yyyy-MM-dd (ไม่ใช่ yyyy-MM-dd HH:mm:ss)

import { prisma } from "../../lib/prisma";
import { rulrPost } from "../lib/rulr-api";
import { getRulrConfig } from "../lib/config";

interface ControlLogItem {
  domain: string | null;
  username: string | null;
  objectId: number | null;
  objectName: string | null;
  operateDescribe: string | null;
  actType: number | null;
  ipAddr: string | null;
  errorCode: number | null;
  errorDetails: string | null;
  createdAt: string | null;
}

interface ControlLogPage {
  pageTotal: number;
  startPage: number;
  pageSize: number;
  pageData: ControlLogItem[];
}

function toDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T") + "+07:00");
  return isNaN(d.getTime()) ? null : d;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10); // yyyy-MM-dd
}

export async function syncServiceControlLog(): Promise<{ inserted: number }> {
  const cfg = getRulrConfig();

  // Delta sync: ดึงตั้งแต่ log ล่าสุดที่มีใน DB ถึงวันนี้
  const latest = await prisma.serviceControlLog.findFirst({
    orderBy: { occurredAt: "desc" },
    select: { occurredAt: true },
  });

  const now = new Date();
  const startDate = latest
    ? latest.occurredAt
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // ย้อนหลัง 30 วัน ถ้าไม่มีข้อมูลเลย

  const start = dateStr(startDate);
  const end = dateStr(now);

  console.log(`[sync-control-log] ดึง log ${start} → ${end}`);

  let inserted = 0;
  let page = 0;

  while (true) {
    const data = await rulrPost<ControlLogPage>("/mm/api/sys/operate/log/rulr", {
      divisionId: cfg.divisionId,
      startTime: start,
      endTime: end,
      page,
      size: 50,
    });

    const rows = data.pageData ?? [];
    if (rows.length === 0) break;

    for (const r of rows) {
      const occurredAt = toDate(r.createdAt);
      if (!occurredAt) continue;

      // กัน insert ซ้ำด้วย occurred_at + objectId + username
      const exists = await prisma.serviceControlLog.findFirst({
        where: {
          occurredAt,
          objectId: r.objectId ?? null,
          username: r.username ?? null,
        },
        select: { id: true },
      });
      if (exists) continue;

      await prisma.serviceControlLog.create({
        data: {
          domain: r.domain ?? null,
          username: r.username ?? null,
          objectId: r.objectId ?? null,
          objectName: r.objectName ?? null,
          operateDescribe: r.operateDescribe ?? null,
          actType: r.actType ?? null,
          ipAddr: r.ipAddr ?? null,
          errorCode: r.errorCode ?? null,
          errorDetails: r.errorDetails ?? null,
          occurredAt,
        },
      });
      inserted++;
    }

    const totalPages = Math.ceil((data.pageTotal ?? 0) / 50);
    if (page + 1 >= totalPages) break;
    page++;
  }

  console.log(`[sync-control-log] insert ${inserted} รายการใหม่`);
  return { inserted };
}