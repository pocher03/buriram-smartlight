"use client";

// Leaflet map (โหลดแบบ client-only ผ่าน dynamic import ใน map-panel)
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { Device } from "@/lib/types";
import { DEVICE_PROFILES } from "@/lib/device-profiles";
import { deviceStatus, STATUS_COLOR, STATUS_LABEL } from "@/lib/device-status";
import { display } from "@/lib/null-safe";

const CENTER: [number, number] = [14.992892, 103.113694];

/**
 * เรียก map.invalidateSize() ใหม่ทุกครั้งที่ container เปลี่ยนขนาด/กลับมาแสดงผล:
 *  - mobile: container ถูกซ่อนด้วย display:none ตอนยังไม่ได้กดแท็บ "แผนที่"
 *    Leaflet จึงคำนวณขนาดเป็น 0x0 ตอน init → ต้องวัดใหม่เมื่อ active = true
 *  - desktop: เมื่อผู้ใช้กดปุ่มปรับขนาดคอลัมน์ (sizeKey เปลี่ยน) container กว้างขึ้น/แคบลง
 *    → ต้องวัดใหม่ ไม่งั้น tile เพี้ยน
 * Desktop ส่ง active = true เสมอ; เรียก 2 จังหวะ (0ms + 260ms) เผื่อมี transition ของ layout
 */
function InvalidateOnResize({
  active,
  sizeKey,
}: {
  active: boolean;
  sizeKey: string | number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const ids = [0, 260].map((d) => setTimeout(() => map.invalidateSize(), d));
    return () => ids.forEach(clearTimeout);
  }, [active, sizeKey, map]);
  return null;
}

/**
 * (mobile) เมื่อเลือกโซนใน dropdown บนแผนที่ → pan/zoom ไปยังกลุ่มหมุดของโซนนั้น
 * ขอบเขตอยู่ที่แผนที่เท่านั้น (ไม่กรอง KPI/Log) — focusZone undefined = desktop (ไม่ auto-pan)
 */
function FitToZone({ focusZone, devices }: { focusZone?: string; devices: Device[] }) {
  const map = useMap();
  useEffect(() => {
    if (!focusZone) return; // desktop: คงพฤติกรรมเดิม ไม่ pan อัตโนมัติ
    const pts = devices
      .filter((d) => d.lat != null && d.lng != null)
      .map((d) => [d.lat as number, d.lng as number] as [number, number]);
    if (focusZone === "all" || pts.length === 0) {
      map.setView(CENTER, 14);
    } else if (pts.length === 1) {
      map.setView(pts[0], 16);
    } else {
      map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
    }
    // ตั้งใจไม่ใส่ devices ใน deps: pan เฉพาะตอนผู้ใช้เปลี่ยนโซน ไม่ใช่ตอนข้อมูล refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusZone, map]);
  return null;
}

export default function MapInner({
  devices,
  active = true,
  sizeKey = "",
  focusZone,
}: {
  devices: Device[];
  active?: boolean;
  sizeKey?: string | number;
  focusZone?: string;
}) {
  // กฎเหล็ก #3: ปักหมุดเฉพาะต้นที่มีพิกัด (null = ไม่ปักหมุด)
  const located = devices.filter((d) => d.lat != null && d.lng != null);

  return (
    <MapContainer
      center={CENTER}
      zoom={14}
      minZoom={12}
      maxZoom={18}
      zoomControl={true}
      style={{ height: "100%", width: "100%" }}
      attributionControl={false}
    >
      <InvalidateOnResize active={active} sizeKey={sizeKey} />
      <FitToZone focusZone={focusZone} devices={devices} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {located.map((d) => {
        const status = deviceStatus(d);
        const color = STATUS_COLOR[status];
        const showSOC = DEVICE_PROFILES[d.deviceType].showSOC;
        return (
          <CircleMarker
            key={d.deviceId}
            center={[d.lat as number, d.lng as number]}
            radius={8}
            pathOptions={{
            color: color,
            weight: 2.5,
            fillColor: color,
            fillOpacity: 0.70,
          }}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                <div
                  style={{
                    background: color,
                    color: "#fff",
                    padding: "10px 14px",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {d.name}
                  <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.9 }}>
                    {d.zoneName} · {STATUS_LABEL[status]}
                  </div>
                </div>
                <div style={{ padding: "10px 14px" }} className="text-t1 dark:text-dk-t1">
                  <PopupRow label="แรงดัน" value={display(d.telemetry.voltage, " V")} />
                  <PopupRow label="กระแส" value={display(d.telemetry.electricity, " A")} />
                  <PopupRow label="กำลังไฟฟ้า" value={display(d.telemetry.actp, " W")} />
                  <PopupRow
                    label="สวิตช์ไฟ"
                    value={
                      d.telemetry.switchStatus == null
                        ? "--"
                        : d.telemetry.switchStatus === 1
                          ? "เปิด"
                          : "ปิด"
                    }
                  />
                  {showSOC && (
                    <PopupRow label="แบตเตอรี่ (SOC)" value={display(d.telemetry.soc, "%")} />
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

function PopupRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "2px 0",
      }}
    >
      <span style={{ color: "#9aa0a6" }}>{label}</span>
      <strong className="tabular-nums">{value}</strong>
    </div>
  );
}
