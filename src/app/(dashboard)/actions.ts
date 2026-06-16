"use server";
// ออกจากระบบ — เขียน access log (APPEND-ONLY) ก่อนล้าง session
import { headers } from "next/headers";
import { auth, signOut } from "@/auth";
import { writeAccessLog } from "@/lib/access-log";

export async function logoutAction(): Promise<void> {
  const session = await auth();
  const h = headers();
  await writeAccessLog({
    userId: session?.user?.id ?? null,
    username: session?.user?.username ?? null,
    action: "logout",
    activeProjectId: session?.user?.activeProjectId ?? null,
    ip:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null,
    userAgent: h.get("user-agent"),
  });
  await signOut({ redirectTo: "/login" });
}
