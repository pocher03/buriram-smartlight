"use client";

// Leaflet map (โหลดแบบ client-only ผ่าน dynamic import ใน map-panel)
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Device } from "@/lib/types";
import { DEVICE_PROFILES } from "@/lib/device-profiles";
import { deviceStatus, STATUS_COLOR, STATUS_LABEL } from "@/lib/device-status";
import { display } from "@/lib/null-safe";

const CENTER: [number, number] = [14.992892, 103.113694];

// เกณฑ์ตัดสิน "ไฟติด" — ตรงกับ smart-alarm (ข้อมูลจริง โคมที่ติดกินไฟต่ำสุด 44.4 W)
const LAMP_ON_POWER_W = 20;

function createPulseIcon(color: string) {
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- วงนอก aura โปร่งใส -->
        <div style="
          position: absolute;
          width: 24px; height: 24px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.2;
        "></div>
        <!-- วงกลาง ขอบขาวชิดจุดกลาง -->
        <div style="
          position: absolute;
          width: 10px; height: 10px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.85);
          background: transparent;
        "></div>
        <!-- จุดใน -->
        <div style="
          position: absolute;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 6px ${color};
        "></div>
      </div>
    `,
  });
}

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
      minZoom={5}
      maxZoom={19}
      zoomControl={true}
      style={{ height: "100%", width: "100%" }}
      attributionControl={false}
    >
      <InvalidateOnResize active={active} sizeKey={sizeKey} />
      <FitToZone focusZone={focusZone} devices={devices} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        maxNativeZoom={19}
      />
      {located.map((d) => {
        const status = deviceStatus(d);
        const color = STATUS_COLOR[status];
        const showSOC = DEVICE_PROFILES[d.deviceType].showSOC;
        const isOnline = d.telemetry.onlineStatus === 1;

        return (
          <Marker
            key={d.deviceId}
            position={[d.lat as number, d.lng as number]}
            icon={createPulseIcon(color)}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                {/* หัวเรื่อง — ชื่ออุปกรณ์ + สถานะ */}
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
                  {isOnline ? (
                    <>
                      <PopupRow label="แรงดัน" value={display(d.telemetry.voltage, " V")} />
                      <PopupRow label="กระแส" value={display(d.telemetry.electricity, " A")} />
                      <PopupRow label="กำลังไฟฟ้า" value={display(d.telemetry.actp, " W")} />
                      {/* สถานะไฟตัดสินจากกำลังไฟจริง — switchStatus จากต้นทางค้างที่ 0 เสมอ ใช้ไม่ได้ */}
                      <PopupRow
                        label="สถานะไฟ"
                        value={
                          d.telemetry.actp == null
                            ? "--"
                            : d.telemetry.actp > LAMP_ON_POWER_W
                              ? "ติด"
                              : "ดับ"
                        }
                      />
                      <PopupRow label="ความสว่าง" value={display(d.telemetry.brightness, "%")} />
                      {showSOC && (
                        <PopupRow label="แบตเตอรี่ (SOC)" value={display(d.telemetry.soc, "%")} />
                      )}
                    </>
                  ) : (
                    /* ออฟไลน์ — ค่าที่เก็บไว้เป็นค่าค้างจากรอบสุดท้ายที่ติดต่อได้
                       แสดง "--" เพื่อไม่ให้เข้าใจผิดว่าเป็นค่าปัจจุบัน (กฎเหล็ก #5) */
                    <>
                      <PopupRow label="แรงดัน" value="--" />
                      <PopupRow label="กระแส" value="--" />
                      <PopupRow label="กำลังไฟฟ้า" value="--" />
                      <PopupRow label="สถานะไฟ" value="--" />
                      <PopupRow label="ความสว่าง" value="--" />
                      {showSOC && <PopupRow label="แบตเตอรี่ (SOC)" value="--" />}
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: "1px solid rgba(128,128,128,.25)",
                          fontSize: 10,
                          lineHeight: 1.6,
                          opacity: 0.7,
                        }}
                      >
                        อุปกรณ์ไม่ได้เชื่อมต่อ — ไม่มีข้อมูลปัจจุบัน
                        <br />
                        ติดต่อได้ล่าสุด {fmtLastSeen(d.telemetry.updatedAt)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

/** เวลาที่ติดต่ออุปกรณ์ได้ล่าสุด (แสดงเป็นเวลาไทย) */
function fmtLastSeen(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "--"
    : d.toLocaleString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
      });
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
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}