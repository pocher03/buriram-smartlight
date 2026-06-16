// prisma/seed.ts
// Seed ผู้ใช้จริง (Sprint 3) — 1 admin (บุรีรัมย์) + 2 super_admin
// idempotent: รันซ้ำได้ (upsert) — re-seed = รีเซ็ตรหัส/ปลดล็อกบัญชี (กันบัญชีถูกล็อก)
//
// รัน:  npm run db:seed
// ปรับค่าได้ผ่าน .env.local (SEED_*_USER / SEED_*_PASS / SEED_*_EMAIL)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PROJECT_ID = "buriram";
const DIVISION_ID = Number(process.env.RULR_DIVISION_ID ?? 1889);

interface SeedUser {
  username: string;
  password: string;
  name: string;
  email: string;
  role: "admin" | "super_admin";
  isCrossProject: boolean;
  projectId: string | null;
}

const env = (k: string, fallback: string) => process.env[k]?.trim() || fallback;

const users: SeedUser[] = [
  {
    username: env("SEED_ADMIN_USER", "admin_buriram"),
    password: env("SEED_ADMIN_PASS", "Buriram@2569"),
    name: "ผู้ดูแลระบบเทศบาลเมืองบุรีรัมย์",
    email: env("SEED_ADMIN_EMAIL", "admin_buriram@jumboelec.co.th"),
    role: "admin",
    isCrossProject: false,
    projectId: PROJECT_ID,
  },
  {
    username: env("SEED_SUPER1_USER", "jumbo_admin"),
    password: env("SEED_SUPER1_PASS", "Jumbo@2569"),
    name: "ผู้ดูแลระบบส่วนกลาง จัมโบ้ (หลัก)",
    email: env("SEED_SUPER1_EMAIL", "jumbo_admin@jumboelec.co.th"),
    role: "super_admin",
    isCrossProject: true,
    projectId: null,
  },
  {
    username: env("SEED_SUPER2_USER", "jumbo_backup"),
    password: env("SEED_SUPER2_PASS", "Backup@2569"),
    name: "ผู้ดูแลระบบส่วนกลาง จัมโบ้ (สำรอง)",
    email: env("SEED_SUPER2_EMAIL", "jumbo_backup@jumboelec.co.th"),
    role: "super_admin",
    isCrossProject: true,
    projectId: null,
  },
];

async function main() {
  // โครงการบุรีรัมย์ต้องมีก่อน (FK ของ admin.projectId)
  await prisma.project.upsert({
    where: { id: PROJECT_ID },
    update: {},
    create: { id: PROJECT_ID, name: "เทศบาลเมืองบุรีรัมย์", divisionId: DIVISION_ID },
  });

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      // re-seed → รีเซ็ตรหัส + ปลดล็อก (failedAttempts/lockedUntil)
      update: {
        passwordHash,
        name: u.name,
        email: u.email,
        role: u.role,
        isCrossProject: u.isCrossProject,
        projectId: u.projectId,
        failedAttempts: 0,
        lockedUntil: null,
      },
      create: {
        username: u.username,
        passwordHash,
        name: u.name,
        email: u.email,
        role: u.role,
        isCrossProject: u.isCrossProject,
        projectId: u.projectId,
      },
    });
    console.log(`  ✓ ${u.role.padEnd(11)} ${u.username}`);
  }

  console.log("Seed users เสร็จสมบูรณ์");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
