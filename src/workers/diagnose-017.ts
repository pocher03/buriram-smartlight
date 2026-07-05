// src/workers/diagnose-017.ts
// ⚠️ READ-ONLY — วินิจฉัยโครงสร้าง Lamp vs controller (ไม่เขียน DB)
// หา field ที่แยกชนิดได้ทนทาน (categoryId/modelId) เพื่อกรอง controller โดยไม่ผูกชื่อรุ่น
import { rulrPost } from "./lib/rulr-api";
import { getRulrConfig } from "./lib/config";

interface AttrItem {
  identify: string;
  realValue: string | null;
  thingsObjectId: number | null;
}
interface ObjItem {
  id: number;
  name: string;
  modelName: string | null;
  categoryId: number | null;
  modelId: number | null;
  onlineStatus: number | null;
  thingsAttributeList?: AttrItem[];
}
interface ObjPage {
  pageTotal: number;
  pageData: ObjItem[];
}

async function fetchAll(divisionId: number): Promise<ObjItem[]> {
  const all: ObjItem[] = [];
  for (let page = 0; page < 20; page++) {
    const data = await rulrPost<ObjPage>("/mm/api/things/object/page", {
      divisionId,
      page,
      size: 100,
      filterRequest: { fillThingsLocation: true, fillThingsAttribute: true },
    });
    const rows = data.pageData ?? [];
    all.push(...rows);
    if (rows.length < 100 || all.length >= (data.pageTotal ?? all.length)) break;
  }
  return all;
}

async function main() {
  const cfg = getRulrConfig();
  const all = await fetchAll(cfg.divisionId);

  // ── ส่วนที่ 1: เทียบ categoryId/modelId ของ Lamp vs controller (2 ต้น) ──
  for (const name of ["BRU-NEMA-001", "BRU-NEMA-017"]) {
    console.log(`\n═══════ ${name} ═══════`);
    for (const o of all.filter((x) => x.name === name)) {
      const attrs = o.thingsAttributeList ?? [];
      console.log(
        `\n[${o.modelName}] id=${o.id} categoryId=${o.categoryId} modelId=${o.modelId} online=${o.onlineStatus}`
      );
      for (const key of ["switchStatus", "voltage", "actp"]) {
        const hit = attrs.find((a) => a.identify === key);
        console.log(`    ${key.padEnd(14)} = ${hit ? JSON.stringify(hit.realValue) : "(ไม่มี field นี้)"}`);
      }
    }
  }

  // ── ส่วนที่ 2: สรุป categoryId/modelId แยกตามชนิด (ยืนยันว่ากรองด้วยเลขได้ทั้ง 26 ต้น) ──
  console.log(`\n\n═══════ สรุปการแยกชนิดทั้งระบบ ═══════`);
  const byModel = new Map<string, { categoryIds: Set<number | null>; modelIds: Set<number | null>; count: number }>();
  for (const o of all) {
    if (!o.name?.startsWith("BRU-NEMA-")) continue;
    const key = o.modelName ?? "(null)";
    const e = byModel.get(key) ?? { categoryIds: new Set(), modelIds: new Set(), count: 0 };
    e.categoryIds.add(o.categoryId);
    e.modelIds.add(o.modelId);
    e.count++;
    byModel.set(key, e);
  }
  for (const [model, e] of byModel) {
    console.log(
      `\n[${model}] จำนวน=${e.count}` +
      `\n   categoryId ที่พบ: ${[...e.categoryIds].join(", ")}` +
      `\n   modelId ที่พบ:    ${[...e.modelIds].join(", ")}`
    );
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });