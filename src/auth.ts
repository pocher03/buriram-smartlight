// src/auth.ts
// Auth.js (NextAuth v5) ฉบับเต็ม — Credentials provider + bcrypt + Prisma (ฝั่ง Node)
// authorize() ทำเฉพาะตรวจซ้ำเบาๆ เพื่อออก session (idempotent — ไม่นับครั้งผิด/ไม่เขียน log)
// การนับครั้งผิด + ล็อกบัญชี + audit log อยู่ที่ verifyCredentials() (เรียกจาก Server Action)
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "./lib/prisma";
import { buildSessionUser } from "./lib/auth-verify";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "ชื่อผู้ใช้งาน", type: "text" },
        password: { label: "รหัสผ่าน", type: "password" },
      },
      authorize: async (creds) => {
        const username = String(creds?.username ?? "").trim();
        const password = String(creds?.password ?? "");
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;
        // เคารพการล็อกบัญชี (กันออก session ระหว่างถูกล็อก)
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return buildSessionUser(user);
      },
    }),
  ],
});
