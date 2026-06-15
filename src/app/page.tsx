// หน้า placeholder ของ Sprint 0 — ยืนยันว่า scaffold + theme + shadcn ทำงาน
// Dashboard จริงจะสร้างใน Sprint 1
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex items-center gap-2 rounded-full border border-yel/40 bg-yel-lt px-3 py-1 text-xs font-medium text-yel">
        <span className="ms text-sm ms-f">construction</span>
        Sprint 0 — เตรียมระบบ (Scaffold + Docker + SSL)
      </div>

      <h1 className="max-w-xl text-2xl font-semibold leading-snug">
        ศูนย์บัญชาการโคมไฟถนนอัจฉริยะ
        <br />
        <span className="text-blu">เทศบาลเมืองบุรีรัมย์</span>
      </h1>

      <p className="max-w-md text-sm text-muted-foreground">
        ระบบมอนิเตอร์โคมไฟถนนอัจฉริยะ (READ-ONLY) — โครงสร้างโปรเจกต์พร้อมแล้ว
        เริ่มสร้างแดชบอร์ดใน Sprint 1
      </p>

      <div className="flex gap-3">
        <Button>เริ่มต้น</Button>
        <Button variant="outline">เอกสารระบบ</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        บริษัท จัมโบ้ อิเล็คทรอนิคส์ จำกัด
      </p>
    </main>
  );
}
