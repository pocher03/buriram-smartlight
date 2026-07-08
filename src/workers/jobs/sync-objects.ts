// src/workers/jobs/sync-objects.ts
// CRON: ดึงอุปกรณ์ + telemetry จาก /mm/api/things/object/page → เขียนลง DB
//
// จุดพลาดบ่อย (CLAUDE.md):
//  - object/page คืน 52 แต่โคมจริง 26 → กรอง modelName==="Lamp" && name.startsWith("BRU-NEMA-")
//  - ค่าวัดอยู่ใน thingsAttributeList (ผูกด้วย thingsObjectId ไม่ใช่ id ของอุปกรณ์)
//  - realValue เป็น String เสมอ → parseFloat
//  - onlineStatus (ติดต่อได้ไหม) ยึดตรงๆ 0/1 — คนละเรื่องกับ switchStatus (ไฟเปิดไหม)

import { prisma } from "../../lib/prisma";
import { rulrPost } from "../lib/rulr-api";
import { getRulrConfig, PROJECT_ID } from "../lib/config";
import { getVal, safeNum } from "../../lib/null-safe";

interface AttrItem {
  identify: string;
  realValue: string | null;
  thingsObjectId: number | null;
}
interface AssocItem {
  objectId: number | null;
}
interface ObjectItem {
  id: number;
  name: string;
  modelName: string | null;
  categoryId: number | null;   // ← เพิ่ม
  onlineStatus: number | null;
  thingsObjectAddr: string | null;
  thingsAttributeList?: AttrItem[];
  objectAssociateObjectList?: AssocItem[];
}
interface ObjectPage {
  pageTotal: number;
  startPage: number;
  pageSize: number;
  pageData: ObjectItem[];
}

const isValidController = (d: ObjectItem) =>
  d.categoryId === 63 && typeof d.name === "string" && d.name.startsWith("BRU-NEMA-");

const toInt = (v: string | null): number | null => {
  const n = safeNum(v);
  return n == null ? null : Math.round(n);
};

async function fetchAllObjects(divisionId: number): Promise<ObjectItem[]> {
  const size = 100;
  const all: ObjectItem[] = [];
  for (let page = 0; page < 20; page++) {
    const data = await rulrPost<ObjectPage>("/mm/api/things/object/page", {
      divisionId,
      page,
      size,
      filterRequest: { fillThingsLocation: true, fillThingsAttribute: true },
    });
    const rows = data.pageData ?? [];
    all.push(...rows);
    if (rows.length < size || all.length >= (data.pageTotal ?? all.length)) break;
  }
  return all;
}

export async function syncObjects(): Promise<{ scanned: number; lamps: number; snapshots: number }> {
  const cfg = getRulrConfig();
  console.log("[sync-objects] เริ่มดึง object/page");

  // โครงการต้องมีอยู่ก่อน (devices.projectId FK)
  await prisma.project.upsert({
    where: { id: PROJECT_ID },
    create: { id: PROJECT_ID, name: "เทศบาลเมืองบุรีรัมย์", divisionId: cfg.divisionId },
    update: {},
  });

  const objects = await fetchAllObjects(cfg.divisionId);
  const controllers = objects.filter(isValidController);
  console.log(`[sync-objects] ต้นทางคืน ${objects.length} รายการ → controller ${controllers.length} ต้น`);

  let snapshots = 0;
  for (const d of controllers) {
    const attrs = d.thingsAttributeList ?? [];

        // ===== DEBUG ชั่วคราว: ดู SOC/solar attribute (ลบออกหลังทดสอบ) =====
    if (snapshots === 0) {
      console.log(`[DEBUG] ${d.name} categoryId=${d.categoryId}`);
      console.log(`[DEBUG] attributes ทั้งหมด:`, attrs.map(a => a.identify).join(", "));
      for (const key of ["batpt", "batvolt", "solarbdp", "slp", "batsta", "gnrtenergy"]) {
        const found = attrs.find(a => a.identify === key);
        console.log(`[DEBUG]   ${key} = ${found ? found.realValue : "(ไม่มี)"}`);
      }
    }
    // ===== จบ DEBUG =====
    
    // thingsObjectId: ใช้จาก attribute (ที่ค่าวัดอยู่จริง) ก่อน แล้วค่อย fallback ไป assoc
    const thingsObjectId =
      attrs.find((a) => a.thingsObjectId != null)?.thingsObjectId ??
      d.objectAssociateObjectList?.find((a) => a.objectId != null)?.objectId ??
      null;

    // match ด้วย name (คงที่เมื่อเปลี่ยนโหนด) → อัปเดตแถวเดิม history ต่อเนื่อง
    const device = await prisma.device.upsert({
      where: { name: d.name },
      create: {
        rulrObjectId: BigInt(d.id),
        thingsObjectId: thingsObjectId != null ? BigInt(thingsObjectId) : null,
        thingsObjectAddr: d.thingsObjectAddr ?? null,
        name: d.name,
        modelName: d.modelName ?? null,
        deviceType: "controller",
        projectId: PROJECT_ID,
      },
      update: {
        rulrObjectId: BigInt(d.id), // อัปเดต id เป็น controller (พลิกจาก Lamp เดิม)
        thingsObjectId: thingsObjectId != null ? BigInt(thingsObjectId) : null,
        thingsObjectAddr: d.thingsObjectAddr ?? null,
        modelName: d.modelName ?? null,
      },
    });

    await prisma.telemetrySnapshot.create({
      data: {
        deviceId: device.id,
        voltage: safeNum(getVal(attrs, "voltage")),
        electricity: safeNum(getVal(attrs, "electricity")),
        actp: safeNum(getVal(attrs, "actp")),
        acte: safeNum(getVal(attrs, "acte")),
        frequency: safeNum(getVal(attrs, "frequency")),
        switchStatus: toInt(getVal(attrs, "switchStatus")),
        onlineStatus: d.onlineStatus ?? null, // ยึดตรงๆ จาก top-level ของ controller
        brightness: toInt(getVal(attrs, "brightness")),
        illumination: toInt(getVal(attrs, "illumination")),
        runtime: toInt(getVal(attrs, "runtime")),
        snr: toInt(getVal(attrs, "snr")),
        soc: null, // controller ไม่มีแบตเตอรี่ (solar รอ MQTT Bridge)
      },
    });
    snapshots++;
  }

  console.log(`[sync-objects] เขียน telemetry ${snapshots} snapshot`);
  return { scanned: objects.length, lamps: controllers.length, snapshots };
}
