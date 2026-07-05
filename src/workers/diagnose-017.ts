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
  const targets = ["BRU-NEMA-017", "BRU-NEMA-018"];
  const all: ObjItem[] = [];

  // ดึงทุกหน้าเหมือน sync จริง
  for (let page = 0; page < 20; page++) {
    const data = await rulrPost<ObjPage>("/mm/api/things/object/page", {
      divisionId: cfg.divisionId,
      page,
      size: 100,
      filterRequest: { fillThingsLocation: true, fillThingsAttribute: true },
    });
    const rows = data.pageData ?? [];
    all.push(...rows);
    if (rows.length < 100 || all.length >= (data.pageTotal ?? all.length)) break;
  }

  console.log(`\n=== RULR ส่งมาทั้งหมด ${all.length} object ===\n`);

  for (const name of targets) {
    const matches = all.filter((o) => o.name === name);
    console.log(`── ${name}: พบ ${matches.length} ตัวใน feed ──`);
    if (matches.length === 0) {
      console.log(`   ⚠️ ไม่มีชื่อนี้ใน feed เลย (อาจเปลี่ยนชื่อ/ย้าย division)\n`);
      continue;
    }
    for (const o of matches) {
      const tId = o.thingsAttributeList?.find((a) => a.thingsObjectId != null)?.thingsObjectId ?? null;
      console.log(
        `   id=${o.id}  onlineStatus=${o.onlineStatus}  ` +
        `(${o.onlineStatus === 1 ? "ออนไลน์" : o.onlineStatus === 0 ? "ออฟไลน์" : o.onlineStatus === 2 ? "stateless" : "--"})  ` +
        `thingsObjectId=${tId}  modelName=${o.modelName}`
      );
    }
    console.log("");
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });