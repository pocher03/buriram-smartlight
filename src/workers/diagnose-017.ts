// src/workers/diagnose-017.ts
// ⚠️ READ-ONLY — เทียบว่าค่าวัด (attribute) อยู่ที่ object ชนิด Lamp หรือ controller
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
  onlineStatus: number | null;
  thingsAttributeList?: AttrItem[];
}
interface ObjPage { pageTotal: number; pageData: ObjItem[]; }

async function main() {
  const cfg = getRulrConfig();
  const all: ObjItem[] = [];
  for (let page = 0; page < 20; page++) {
    const data = await rulrPost<ObjPage>("/mm/api/things/object/page", {
      divisionId: cfg.divisionId, page, size: 100,
      filterRequest: { fillThingsLocation: true, fillThingsAttribute: true },
    });
    const rows = data.pageData ?? [];
    all.push(...rows);
    if (rows.length < 100 || all.length >= (data.pageTotal ?? all.length)) break;
  }

  // เทียบ 2 ต้น: 001 (ปกติ) และ 017 (Lamp offline) — ค่าวัดอยู่ object ไหน
  for (const name of ["BRU-NEMA-001", "BRU-NEMA-017"]) {
    console.log(`\n═══════ ${name} ═══════`);
    for (const o of all.filter((x) => x.name === name)) {
      const attrs = o.thingsAttributeList ?? [];
      const filled = attrs.filter((a) => a.realValue != null && a.realValue !== "");
      console.log(`\n[${o.modelName}] id=${o.id} online=${o.onlineStatus} — attribute ที่มีค่า: ${filled.length}/${attrs.length}`);
      for (const key of ["switchStatus", "voltage", "actp", "onlineStatus"]) {
        const hit = attrs.find((a) => a.identify === key);
        console.log(`    ${key.padEnd(14)} = ${hit ? JSON.stringify(hit.realValue) : "(ไม่มี field นี้)"}`);
      }
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });