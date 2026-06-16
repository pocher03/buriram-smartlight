// ส่วนขยายชนิดข้อมูล (module augmentation) ของ Auth.js
// เพิ่มฟิลด์ RBAC: role / isCrossProject / projectId / activeProjectId
import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id?: string;
    username: string;
    role: Role;
    isCrossProject: boolean;
    projectId: string | null;
    activeProjectId: string | null;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      name: string;
      email: string;
      role: Role;
      isCrossProject: boolean;
      projectId: string | null;
      activeProjectId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    username: string;
    role: Role;
    isCrossProject: boolean;
    projectId: string | null;
    activeProjectId: string | null;
  }
}
