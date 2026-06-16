// src/middleware.ts
// ป้องกัน route /dashboard (ที่นี่คือ "/") — ต้อง login ก่อน (กฎเหล็ก #4 + Sprint 3)
// ใช้ authConfig แบบ edge-safe (ไม่มี Prisma) — ตรวจสิทธิ์จาก JWT ใน callback authorized
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // ครอบทุก path ยกเว้น api (รวม /api/auth), static asset, รูป, favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
