// Dashboard (Server Component) — ดึงข้อมูลผ่าน adapter เท่านั้น (กฎเหล็ก #4)
// Sprint 3: ทุก query filter ด้วย activeProjectId จาก session (RBAC)
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAdapter } from "@/lib/adapters";
import { Dashboard } from "@/components/dashboard/dashboard";

// live adapter อ่าน DB ทุก request → ห้าม static render ตอน build (กัน build-time DB call)
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  // middleware กันไว้แล้ว แต่กัน null-safe ฝั่ง server ด้วย
  const activeProjectId = session?.user?.activeProjectId;
  if (!session?.user || !activeProjectId) redirect("/login");

  const adapter = await getAdapter();
  const [zones, data, month, week, day] = await Promise.all([
    adapter.getZones(activeProjectId),
    adapter.getDashboard(activeProjectId),
    adapter.getEnergy(activeProjectId, "month"),
    adapter.getEnergy(activeProjectId, "week"),
    adapter.getEnergy(activeProjectId, "day"),
  ]);

  return (
    <Dashboard
      source={adapter.source}
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        isCrossProject: session.user.isCrossProject,
      }}
      zones={zones}
      data={data}
      energy={{ month, week, day }}
    />
  );
}
