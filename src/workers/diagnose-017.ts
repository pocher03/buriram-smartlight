// src/workers/diagnose-017.ts
// ⚠️ READ-ONLY — ถาม RULR ว่าส่งอะไรมาสำหรับ BRU-NEMA-017/018 (ไม่เขียน DB)
// รันครั้งเดียวเพื่อวินิจฉัยเคสเปลี่ยนโหนด แล้วลบทิ้งได้
import { rulrPost } from "./lib/rulr-api";
import { getRulrConfig } from "./lib/config";

interface AttrItem { thingsObjectId: number | null; }
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

  console.log(`\n=== รวม ${all.length} object — จัดกลุ่มตามชื่อ BRU-NEMA ===\n`);

  // จับกลุ่มตามชื่อ ดูว่าแต่ละชื่อมีกี่ object และชนิดอะไรบ้าง
  const byName = new Map<string, ObjItem[]>();
  for (const o of all) {
    if (!o.name?.startsWith("BRU-NEMA-")) continue;
    const arr = byName.get(o.name) ?? [];
    arr.push(o);
    byName.set(o.name, arr);
  }

  const sorted = [...byName.keys()].sort();
  for (const name of sorted) {
    const items = byName.get(name)!;
    const parts = items.map(o =>
      `[${o.modelName} id=${o.id} ${o.onlineStatus === 1 ? "ON" : o.onlineStatus === 0 ? "OFF" : o.onlineStatus === 2 ? "--" : "?"}]`
    ).join("  ");
    const flag = items.length > 1 ? " ⚠️ซ้ำ" : "";
    console.log(`${name} (${items.length})${flag}: ${parts}`);
  }

  // สรุปชนิดทั้งหมด
  const modelCount = new Map<string, number>();
  for (const o of all) {
    const m = o.modelName ?? "(null)";
    modelCount.set(m, (modelCount.get(m) ?? 0) + 1);
  }
  console.log(`\n=== สรุปชนิด object ทั้งหมด ===`);
  for (const [m, c] of modelCount) console.log(`  ${m}: ${c}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });