// src/auth.config.ts
// คอนฟิก Auth.js แบบ "edge-safe" (ไม่มี Prisma/bcrypt) — ใช้ใน middleware ได้
// providers จริง (Credentials) ถูกใส่ใน src/auth.ts (ฝั่ง Node เท่านั้น)
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [], // ใส่จริงใน auth.ts (แยกเพื่อให้ middleware ไม่ลาก Prisma เข้า Edge)
  callbacks: {
    // ป้องกัน route: ทุกหน้านอกจาก /login ต้อง login ก่อน
    // ป้องกัน route: ทุกหน้าต้อง login ยกเว้นหน้าสาธารณะ (login / กู้รหัสผ่าน)
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // หน้าที่เข้าได้โดยไม่ต้อง login
      const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];
      const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

      if (isPublic) {
        // login อยู่แล้วเข้าหน้า login → เด้งเข้า dashboard
        // (ยกเว้นหน้ากู้รหัสผ่าน — ให้เข้าได้แม้ login อยู่)
        if (isLoggedIn && path.startsWith("/login")) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      return isLoggedIn; // ไม่ login → Auth.js เด้งไป /login เอง
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.username = user.username;
        token.role = user.role;
        token.isCrossProject = user.isCrossProject;
        token.projectId = user.projectId;
        token.activeProjectId = user.activeProjectId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.isCrossProject = token.isCrossProject;
        session.user.projectId = token.projectId;
        session.user.activeProjectId = token.activeProjectId;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
