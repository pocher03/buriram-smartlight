// src/workers/index.ts
// Worker entrypoint — แยกออกจาก Next.js (รันใน container ของตัวเอง)
// 🚧 CRON jobs จริง (Token Service + Data Sync ทุก 30 นาที) จะเพิ่มใน Sprint 2
// ตอนนี้เป็น placeholder ให้ container start/healthy ได้ โดยยังไม่ยิง API ต้นทาง

function main() {
  console.log(
    "[worker] Buriram SmartLight worker เริ่มทำงาน — โหมด idle (logic จะมาใน Sprint 2)"
  );

  // keep process alive จนกว่าจะถูกสั่งหยุด
  const keepAlive = setInterval(() => {
    /* no-op heartbeat */
  }, 1 << 30);

  const shutdown = (signal: string) => {
    console.log(`[worker] ได้รับสัญญาณ ${signal} — กำลังปิดการทำงาน`);
    clearInterval(keepAlive);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
