// Dashboard (Server Component) — ดึงข้อมูลผ่าน adapter เท่านั้น (กฎเหล็ก #4)
// Sprint 1: adapter = mock (DATA_SOURCE=mock) → ส่งต่อให้ Client Dashboard
import { getAdapter } from "@/lib/adapters";
import { Dashboard } from "@/components/dashboard/dashboard";

// live adapter อ่าน DB ทุก request → ห้าม static render ตอน build (กัน build-time DB call)
export const dynamic = "force-dynamic";

const PROJECT_ID = "buriram";

export default async function DashboardPage() {
  const adapter = await getAdapter();
  const [zones, data, month, week, day] = await Promise.all([
    adapter.getZones(PROJECT_ID),
    adapter.getDashboard(PROJECT_ID),
    adapter.getEnergy(PROJECT_ID, "month"),
    adapter.getEnergy(PROJECT_ID, "week"),
    adapter.getEnergy(PROJECT_ID, "day"),
  ]);

  return (
    <Dashboard
      source={adapter.source}
      zones={zones}
      data={data}
      energy={{ month, week, day }}
    />
  );
}
