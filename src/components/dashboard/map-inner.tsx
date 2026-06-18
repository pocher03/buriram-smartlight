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
 * บน mobile แผนที่ถูกซ่อนด้วย display:none ตอนยังไม่ได้กดแท็บ "แผนที่"
 * Leaflet จึงคำนวณขนาด container เป็น 0x0 ตอน init → ต้องสั่ง invalidateSize()
 * ใหม่ทุกครั้งที่ container กลับมาแสดงผล (active = true) เพื่อให้คำนวณขนาดถูก
 * Desktop ส่ง active = true เสมอ → เรียกครั้งเดียวตอน mount (ไม่กระทบของเดิม)
 */
function InvalidateOnActive({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    // หน่วงหนึ่ง frame ให้ browser paint container จริงก่อนค่อยวัดขนาด
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [active, map]);
  return null;
}

export default function MapInner({
  devices,
  active = true,
}: {
  devices: Device[];
  active?: boolean;
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
      <InvalidateOnActive active={active} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {located.map((d) => {
        const status = deviceStatus(d);
        const color = STATUS_COLOR[status];
        const showSOC = DEVICE_PROFILES[d.deviceType].showSOC;
        return (
          <CircleMarker
            key={d.deviceId}
            center={[d.lat as number, d.lng as number]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: color,
              fillOpacity: 0.95,
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
