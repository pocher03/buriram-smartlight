# 🔒 SSOT — Single Source of Truth (ฉบับเดียวที่ใช้จริง)
## ศูนย์บัญชาการโคมไฟถนนอัจฉริยะ เทศบาลเมืองบุรีรัมย์

> **ผู้พัฒนา:** บริษัท จัมโบ้ อิเล็คทรอนิคส์ จำกัด (Jumbo Electronics Co., Ltd.)
> **เวอร์ชัน:** SSOT 1.1 | **วันที่:** 15 มิถุนายน 2569 | *(1.1: เพิ่มสถาปัตยกรรมรองรับ Solar + Controller)*
> **สถานะ:** ✅ Safe to commit — Credentials ทั้งหมดใช้ `${ENV_VARIABLE}` placeholder
> **ที่มา:** รวมและคัดกรองจาก master_plan v2.1 + ui_spec v2 + api_quick_reference + ผลทดสอบ API จริง (sample_API_request_BRU)
>
> 🔑 **ค่าจริงทั้งหมดอยู่ใน `.env.local` เท่านั้น** — ดู `.env.example` สำหรับ template

---

## 0. กฎเหล็กในการพัฒนา (Core Directives — ห้ามละเมิด)

1. **READ-ONLY STRICTLY** — ระบบเป็นศูนย์บัญชาการแสดงผลเท่านั้น ห้ามสร้าง UI Component หรือ API Route ที่สั่งการฮาร์ดแวร์ (ห้ามมีปุ่มเปิด/ปิด/หรี่ไฟ) แม้ API ต้นทางจะมีคำสั่งควบคุม (`OpenLightService`, `CloseLightService`, `AdjustLightBrightnessService`, `AdjustLightHighElectricService`, `AdjustLightLowElectricService`) ก็ห้ามนำมาใช้เด็ดขาด
2. **SINGLE-SCREEN LAYOUT (100vh)** — หน้า Dashboard ต้องจบในหน้าจอเดียว บังคับ `overflow: hidden` ระดับ Body ยกเว้นรายการ Log ภายในที่ scroll ได้
3. **NULL-SAFE UI** — ทุกฟิลด์ที่ไม่มีค่าต้องแสดง `--` ห้ามให้หน้าเว็บ Crash (ครอบคลุม `null`, `0.0`, field หาย)
4. **NO DIRECT API CALL** — Frontend ดึงข้อมูลจาก Local Database (ผ่าน Local API ของเรา) เท่านั้น ห้ามยิง API ต้นทางโดยตรงจาก Frontend
5. **THAI LANGUAGE** — UI และข้อความสรุปทั้งหมดเป็นภาษาไทยทางการ/ราชการ
6. **TOKEN SECURITY** — `clientSecret` และ Token เก็บใน `.env` ฝั่ง Backend/Worker เท่านั้น ห้ามหลุดไป Frontend (ห้ามใช้ `NEXT_PUBLIC_` กับค่าลับ)
7. **AUDIT LOG APPEND-ONLY** — บันทึกประวัติห้ามแก้ไข/ลบย้อนหลัง (เพิกถอนสิทธิ์ UPDATE/DELETE ระดับ DB Role) ตาม พ.ร.บ. คอมพิวเตอร์ฯ และ TOR ข้อ ๔.๗.๒–๔.๗.๓
8. **DATA INTEGRITY** — ห้ามแสดงสถานะ/พิกัด/ค่าวัดที่ไม่ตรงความจริงในโหมด Production ข้อมูลจำลองอยู่ใน Demo Mode ที่ติดป้ายชัดเจนเท่านั้น
9. **UI STYLE** — Tailwind CSS สไตล์ minimal corporate (Google Material) รองรับ Dark (ค่าเริ่มต้น) / Light สลับผ่าน `data-theme` + CSS Variables

---

## 1. 🔐 Credentials (ของจริง — เก็บเป็นความลับ)

| รายการ | ค่า |
|---|---|
| **Base URL** | `https://rulr-aiot.com` |
| **Client ID** | `${RULR_CLIENT_ID}` |
| **Client Secret** | `${RULR_CLIENT_SECRET}` |
| **Token Endpoint** | `POST /os/api/auth/token` |
| **Refresh Endpoint** | `POST /os/api/auth/refreshToken` |
| **Token Type** | `Bearer` |
| **Token Expiry** | `43,200 วินาที (12 ชม.)` |
| **Refresh Token Expiry** | `30 วัน` |
| **divisionId บุรีรัมย์** | `1889` |
| **Parent Organization** | `Jumbo Electronics (id: 391)` |
| **Domain** | `IMPACT` |
| **พิกัดอ้างอิงเทศบาล (สำหรับสภาพอากาศ)** | `lat: 14.992892, lng: 103.113694` |
| **OpenWeather API Key** | `<OPENWEATHER_API_KEY>` มีแล้ว

### `.env` Template (ฝั่ง Worker/Backend)
```env
RULR_BASE_URL=https://rulr-aiot.com
RULR_CLIENT_ID=${RULR_CLIENT_ID}
RULR_CLIENT_SECRET=${RULR_CLIENT_SECRET}
RULR_DIVISION_ID=1889
RULR_DOMAIN=IMPACT
OPENWEATHER_API_KEY=          # มีแล้ว
DATABASE_URL=                 # PostgreSQL connection string
DATA_SOURCE=mock              # mock | live  (สลับ Adapter)
```

### Token Request / Response
```json
// POST /os/api/auth/token
{ "clientId": "<CLIENT_ID>", "clientSecret": "<CLIENT_SECRET>" }
```
```json
// Response
{ "errorCode": 0, "errorDesc": "None",
  "data": { "tokenType": "bearer", "accessToken": "<token>",
            "refreshToken": "<refresh>", "expiresIn": 43200 } }
```
> ⚠️ ห้าม call ซ้ำก่อน Token หมดอายุ — จะได้ 403 Access Denied ใช้ refreshToken แทน

---

## 2. 📡 Endpoints ที่ใช้จริง (ยืนยันจาก Postman) + ลำดับ CRON ทุก 30 นาที

```
1. POST /os/api/auth/token (หรือ /refreshToken)          → accessToken
2. POST /mm/api/division/pandect/info                     → KPI ภาพรวม
3. POST /mm/api/things/object/page                        → อุปกรณ์ + Telemetry
4. GET  /mm/api/internal/alarm/history/pagelist           → Log ฮาร์ดแวร์ + พิกัดจริง
5. POST /mm/api/division/pandect/save/energy              → สถิติพลังงาน (type 0/1)
6. GET  OpenWeatherMap (พิกัดเทศบาล)                      → อุณหภูมิ/ความชื้น/PM2.5
→ เขียนลง PostgreSQL → Frontend อ่านจาก Local DB
```

### 2.1 KPI ภาพรวม — `POST /mm/api/division/pandect/info`
Body: `{ "divisionId": 1889 }`
Field สำคัญ: `lightTotal` (26), `lightOnlineNum`, `lightSwitchNum`, `alarmNum`, `processAlarmNum`, `dealAlarmNum`, `alarmTotal`, `autualEnergy` (String → parseFloat), `openLightPlanDTO.{openTime, closeTime}`

### 2.2 อุปกรณ์ + Telemetry — `POST /mm/api/things/object/page`
Body:
```json
{ "divisionId": 1889, "page": 0, "size": 100,
  "filterRequest": { "fillThingsLocation": true, "fillThingsAttribute": true } }
```
> ⚠️ **กรองอุปกรณ์ก่อนบันทึก** — `pageTotal` คืน 52 แต่โคมจริง 26 ต้น มี Gateway/Controller ปน
> ```javascript
> const validLamps = pageData.filter(d =>
>   d.modelName === "Lamp" && d.name.startsWith("BRU-NEMA-"));
> ```

### 2.3 Log ฮาร์ดแวร์ + พิกัด — `GET /mm/api/internal/alarm/history/pagelist?DivisionId=1889&Page={n}&Size=100`
Field สำคัญ: `deviceName`, `name` (เช่น Offline), `alarmLevel`, `createdAtStr`, `handleStatus`, `divisionName`, **`longitude`, `latitude`** (พิกัดจริง)

### 2.4 พลังงาน — `POST /mm/api/division/pandect/save/energy`
- **Response ซ้อน 2 ชั้น:** เข้าถึงผ่าน `response.data.data`
- ทุกค่าเป็น **String → `parseFloat()` เสมอ**
- ค่าติดลบ: เก็บค่าดิบลง DB, แสดงผลใช้ `Math.abs()` ก่อนคูณ 4.5 บาท / 0.5 kg
- `type: 0` รายวัน → `time` = String วันที่ (`"2026-06-01"`)
- `type: 1` รายเดือน → `time` = Integer เดือน (ไม่มีปี) ต้องประกอบเอง: `` `${year}-${String(time).padStart(2,'0')}` ``

```typescript
export interface RulrEnergyResponse {
  errorCode: number; errorDesc: string;
  data: { errorCode: number; errorDesc: string;
    data: {                       // ⚠️ ซ้อน 2 ชั้น
      totalReduction: string;     // parseFloat
      totalSaveEnergy: string;    // parseFloat
      reductionList: Array<{ time: string; firColumn: string;
        secColumn: string; value: string; }>;
    };
  };
}
```

---

## 3. 📊 Telemetry Key Mapping (ห้ามเดาชื่อ — ดึงจาก `thingsAttributeList`)

| identify | ความหมาย | หน่วย | ชนิด | หมายเหตุ |
|---|---|---|---|---|
| `voltage` | แรงดันไฟฟ้า | V | FLOAT | |
| `electricity` | กระแสไฟฟ้า | A | FLOAT | API ใช้คำนี้แทน current |
| `actp` | กำลังไฟฟ้าแอกทีฟ | W | FLOAT | |
| `acte` | พลังงานสะสม | kWh | FLOAT | |
| `switchStatus` | สถานะสวิตช์ | — | INT | 0=ปิด, 1=เปิด |
| `brightness` | ความสว่าง | % | INT | |
| `frequency` | ความถี่ | Hz | FLOAT | |
| `illumination` | ความส่องสว่าง | Lux | INT | |
| `runtime` | เวลาทำงาน | นาที | INT | |
| `snr` | คุณภาพสัญญาณ | — | INT | |

> `realValue` มาเป็น String เสมอ → `parseFloat()` ก่อนแสดงผล
> **Power Factor** ไม่พบ identify → แสดง `--`

### 3.5 🔀 Device Type Architecture (รองรับ Solar + Controller ในระบบเดียว)

> **หลักการ:** "ชนิดอุปกรณ์" เป็น **ข้อมูล** ไม่ใช่ค่า hardcode — แต่ละโคมมี `device_type` ของตัวเองในตาราง `devices` UI/logic ปรับพฤติกรรมตามชนิด ทำให้โครงการเดียวมีโคมหลายชนิดปนกันได้ และเพิ่มชนิดที่ 3 ในอนาคตได้โดยไม่ต้องรื้อ schema/UI
>
> **เฟสแรก:** วาง schema + UI ให้รองรับครบ 2 ชนิดเชิงสถาปัตยกรรม แต่ข้อมูลจริงมีเฉพาะ `controller` (บุรีรัมย์ 26 ต้น) — โค้ดสาขา `solar` พร้อมทำงานเมื่อมีอุปกรณ์จริงเข้ามา

| มิติ | `controller` (Smart Lighting Controller) | `solar` (Solar Light) |
|---|---|---|
| ฮาร์ดแวร์ | NEMA controller บนโคมไฟถนน AC | โคมโซลาร์ + แบตเตอรี่ในตัว |
| แหล่งไฟ | การไฟฟ้า (AC) ร่วมวงจรหลอด | แผงโซลาร์ + แบตเตอรี่ |
| ออนไลน์กลางวัน | อาจออฟไลน์ (ดับตามตู้ควบคุม) = **ปกติ** | ควรออนไลน์ 24 ชม. ออฟไลน์ = **ผิดปกติ** |
| SOC แบตเตอรี่ | ไม่มี → `--`/ซ่อนช่อง | มีค่า (รอ MQTT Bridge) |
| ข้อมูลผลิตไฟ/ชาร์จ | ไม่มี | อาจมี (เผื่อ slot) |
| สูตร ESG | ประหยัดจากการหรี่/ตั้งเวลา | ประหยัด + พลังงานสะอาดที่ผลิตเอง |
| เกณฑ์ขึ้น Alarm สีแดง | ออฟไลน์เฉพาะ "ช่วงที่ควรติด" (เย็น–เช้ามืด) | ออฟไลน์ทุกช่วงเวลา |

```typescript
type DeviceType = 'controller' | 'solar';   // เพิ่มชนิดที่ 3 ได้ในอนาคต

interface DeviceTypeProfile {
  hasBattery: boolean;          // solar=true, controller=false
  expectAlwaysOnline: boolean;  // solar=true, controller=false
  showSOC: boolean;             // = hasBattery
}

const DEVICE_PROFILES: Record<DeviceType, DeviceTypeProfile> = {
  controller: { hasBattery: false, expectAlwaysOnline: false, showSOC: false },
  solar:      { hasBattery: true,  expectAlwaysOnline: true,  showSOC: true  },
};
```



---

## 4. 🎯 ตาราง GAP (สถานะล่าสุด — แก้พิกัดให้ถูกต้องแล้ว)

| GAP | รายการ | สถานะ | วิธีจัดการ |
|---|---|---|---|
| ① | อุณหภูมิ/ความชื้น/PM2.5 | ⚠️ ไม่มีใน API ต้นทาง | OpenWeatherMap + Air Pollution API cache 30 นาที — รอ API key |
| ② | SOC แบตเตอรี่ | ⚠️ ขึ้นกับชนิด | **แสดงตาม `device_type`** — `solar` มีค่า (เมื่อ MQTT Bridge มา), `controller` ไม่มีแบตเตอรี่ → แสดง `--`/ซ่อนช่อง ดูข้อ 3.5 |
| ③ | Power Factor | ⚠️ ไม่พบ identify | แสดง `--` |
| ④ | Energy Schema | ✅ ยืนยันแล้ว | ซ้อน 2 ชั้น + String → parseFloat (ดูข้อ 2.4) |
| ⑤ | Top 5 Fault Area | ✅ ทำเองได้ | Aggregate จาก alarm log group by โซน |
| ⑥ | MoM / แนวโน้มปี | ⚠️ ต้องสะสมเวลา | live จาก `acte`; MoM ต้องมีข้อมูล ≥2 เดือน ระหว่างนั้นแสดง "กำลังเก็บข้อมูล" |
| ⑦ | **พิกัด GPS อุปกรณ์** | ✅ **แก้ไขแล้ว** | **พิกัดจริงอยู่ใน alarm log (`longitude`/`latitude`) ไม่ใช่ object/page — backfill จาก alarm log ไม่ต้อง mock มั่ว**; ต้นที่ไม่เคยมี alarm = ไม่มีพิกัด → null-safe (`--` / ไม่ปักหมุด) |

ข้อ 4 ประเด็นค้าง — อัปเดตเป็น:
   ✅ Production Server + Domain: monitor.jumboelec.co.th (พร้อม)
   ✅ Email Service (Resend): พร้อม
   ⏳ รายชื่อโซนจริง: ใช้ mock ไปก่อน
   ⏳ Log Retention จาก TOR: default 365 วัน
   ⏳ Device Type controller behavior: รอทีมยืนยัน

### 🔗 External Blockers (ไม่บล็อก Sprint 0–1)
1. Production Server / โดเมน (DO Droplet 4vCPU/8GB) — เปิด/คุยทีม 16 มิ.ย.
2. Email Service (Resend/Brevo) + SPF/DKIM — กำลังดำเนินการ
3. Lock รายชื่อโซนจริง + seed ผู้ใช้ — รอทีม (ปัจจุบันมี 2 ชุดไม่ตรงกันในเอกสารเก่า ต้องเลือกชุดเดียว)

---

## 5. 🖥️ UI/UX Single-Screen Blueprint (100vh)

**Header:** โลโก้+ชื่อระบบ (ซ้าย) · ตัวเลือกโซน/พื้นที่ภายในโครงการ + นาฬิกา/วันที่ + สถานะระบบ + สภาพอากาศ (กลาง) · ปุ่มสลับธีม Light/Dark (ขวา)
> Multi-Project แยกที่ชั้น **Login** (ผูกบัญชี-โครงการ redirect อัตโนมัติ) ไม่ใช่ Dropdown บน Header — Dropdown บน Header = เลือกโซนภายในโครงการเท่านั้น

**คอลัมน์ซ้าย (KPI):** โคมทั้งหมด/ออนไลน์/ออฟไลน์/โคมมีปัญหา · สถานะงานซ่อมบำรุง · Sparkline อุณหภูมิ 24 ชม. *(ตัด Gateway KPI Card ออกตาม ui_spec v2)*

**คอลัมน์กลาง (แผนที่):** **Leaflet.js + OpenStreetMap** (ไม่ใช่ Google Maps) ล็อกซูม/ตำแหน่งที่เขตเทศบาล · Marker แยกสี (เขียว=ปกติ, แดง=ขัดข้อง) · Tooltip คลิกหมุดแสดง รหัสเสา/สถานะ/แรงดัน/กระแส (SOC = `--`)

**คอลัมน์ขวา (Unified Logs):** Time Filter (วันนี้/3/7/30/90 วัน/กำหนดเอง) · Tabs 4 ประเภท · Alert Feed จัดระดับสี · Donut Chart ออนไลน์/ออฟไลน์

**แถบล่าง (Analytics):** พลังงาน&ESG (กราฟแท่ง) · ประหยัดอัจฉริยะ (`kWh×4.5 บาท`, `kWh×0.5 kg CO₂`) · Top 5 พื้นที่ปัญหา · AI Insight (rule-based)

### Logs 4 Tabs
1. **Hardware Alarms** — `GET /mm/api/internal/alarm/history/pagelist`
2. **Service Control** — `POST /mm/api/things/service/control/log`   ⚠️ endpoint ยังไม่ทดสอบ — Phase 2 เท่านั้น
3. **System Operate** — `POST /mm/api/sys/operate/log/list`  ⚠️ endpoint ยังไม่ทดสอบ — Phase 2 เท่านั้น
4. **Access & Compliance** — Local PostgreSQL (ไม่ใช่ API ต้นทาง)

---

## 6. 🗄️ Database Schema (PostgreSQL + Prisma)

```
users                 — บัญชี (username, passwordHash, role, projectId, email)
projects              — โครงการ (buriram / future tenants)
zones                 — โซน (จัดกลุ่มเอง — API คืน children:[] ไม่มี sub-division)
devices               — ทะเบียนโคม (deviceId, name, zoneId FK, lat, lng จาก alarm log, device_type ['controller'|'solar'])
telemetry_snapshots   — ค่าล่าสุดทุก 30 นาที (voltage, electricity, actp, acte, switchStatus, onlineStatus, soc [nullable, solar only], createdAt)
alarm_logs            — Log ฮาร์ดแวร์ (APPEND-ONLY)
energy_stats          — สถิติพลังงานรายวัน/รายเดือน (MoM)
fault_aggregates      — Top 5 พื้นที่ปัญหา (pre-aggregated)
weather_cache         — ข้อมูลอากาศล่าสุด
access_logs           — Log การเข้าใช้ (APPEND-ONLY, TOR ๔.๗.๒–๔.๗.๓)
token_store           — accessToken/refreshToken (ฝั่ง Worker เท่านั้น)
password_reset_tokens — token รีเซ็ต (hash, หมดอายุ 30 นาที, ใช้ครั้งเดียว)
```
- Index `createdAt` ทุกตาราง Log (รองรับ Time Filter)
- `alarm_logs` + `access_logs` เพิกถอน UPDATE/DELETE ระดับ DB Role

---

## 7. 🧩 Mandatory Patterns

```javascript
// Null-Safe กลาง
const getVal = (list, id) => list?.find(a => a.identify === id)?.realValue ?? null;
const safeNum = (v) => (v != null ? Number(v) : null);
const display = (v) => (v == null ? '--' : v);

// คำนวณประหยัด (ใช้ Math.abs กับค่าพลังงานก่อนคูณ)
const calcSavings = (kWh) => ({
  money: (Math.abs(kWh) * 4.5).toFixed(2),
  co2:   (Math.abs(kWh) * 0.5).toFixed(2),
});

// Top 5 Fault — group by โซนจาก alarm log
const getTop5Faults = (logs) =>
  Object.entries(logs.reduce((a, l) => (a[l.divisionName]=(a[l.divisionName]||0)+1, a), {}))
    .sort(([,x],[,y]) => y-x).slice(0,5).map(([name,count]) => ({name,count}));

// Timezone: API คืน UTC ไม่มี suffix → เติม Z ตอน parse → แสดง Asia/Bangkok
const parseUTC = (s) => new Date(`${s.replace(' ','T')}Z`);

// ตัดสินสถานะตามชนิดอุปกรณ์ — กันไม่ให้ controller ขึ้นแดงทั้งกระดานตอนกลางวัน
// (controller ที่ออฟไลน์ "ช่วงที่ควรดับ" = ปกติ; solar ออฟไลน์เมื่อไหร่ = ผิดปกติ)
const isFault = (device, snapshot, plan /* {openTime,closeTime} */) => {
  if (snapshot?.onlineStatus === 1) return false;          // ออนไลน์ = ปกติ
  if (DEVICE_PROFILES[device.device_type].expectAlwaysOnline) return true; // solar
  return isWithinLightingHours(new Date(), plan);          // controller: ผิดปกติเฉพาะช่วงที่ควรติด
};

// SOC แสดงตามชนิด
const displaySOC = (device, soc) =>
  DEVICE_PROFILES[device.device_type].showSOC ? display(soc) : null; // null = ซ่อนช่อง
```

---

## 8. 🚀 แผน Sprint (~2–3 สัปดาห์ ผ่าน Claude Code)

| Sprint | งาน | Definition of Done |
|---|---|---|
| **0** เตรียมระบบ | Scaffold Next.js+TS+Tailwind+shadcn · `.claudeignore` · DO Droplet+Caddy+SSL · docker-compose (app/postgres/worker/caddy) | `docker compose up` ขึ้นผ่าน HTTPS |
| **1** Frontend+Mock | Port v8.4 → components · Login+Dark/Light · Leaflet · Recharts · **Adapter (Mock/Live) + env DATA_SOURCE** · **UI อ่านค่า `DEVICE_PROFILES` (SOC/สีสถานะตามชนิด)** | Dashboard นิ่งครบ ใช้ดูได้แม้ Mock; mock มีทั้ง controller + solar ทดสอบ branching |
| **2** DB+Pipeline | Prisma migration (**มี `device_type`**) · Token Service (refresh เชิงรุก) · CRON 5 endpoint + OpenWeather → DB · Local API · **logic `isFault()` ตามชนิด** | ข้อมูลจริงไหลลง DB อ่านผ่าน Local API; controller ไม่ขึ้นแดงผิดตอนกลางวัน |
| **3** Auth+RBAC | Auth.js+bcrypt+RBAC · Multi-tenant redirect · ลืมรหัส→เมล · Access Log · ล็อกบัญชี 30 วิ หลังผิด 3 ครั้ง · Frontend Mock→Live | Login จริง เห็นข้อมูลจริง ว่าง=`--` |
| **4** Analytics+UAT | Top 5 + MoM + AI Insight · Export CSV/PDF · Backup+hardening · UAT (Demo Mode สำหรับสาธิต) | ผ่าน UAT พร้อมส่งมอบ |

> **กลยุทธ์ประหยัด Credit:** แยก session ตาม Sprint แต่ละ session ต้อง build/รันผ่านก่อนไปต่อ
> **Fallback Sprint 4:** เอา CSV ก่อน เลื่อน PDF / AI Insight แบบ template

---

## 9. 🔒 Locked Decisions

| ประเด็น | ผล | เหตุผล |
|---|---|---|
| Map Engine | Leaflet.js + OpenStreetMap | TOR ไม่บังคับ Google Maps — ฟรี เร็วกว่า |
| Server | DO Droplet 4vCPU/8GB (Ubuntu 24.04) | พอกับ 26 โคม คุมง่าย |
| ORM | Prisma | Migration ปลอดภัย |
| Deploy | Docker Compose + Caddy (Auto-HTTPS) | Rollback ง่าย SSL อัตโนมัติ |

### `.claudeignore` / `.gitignore`
```
node_modules/
.next/
out/
build/
.env*
*.log
.git/
buriram_SSOT_MASTER.md   # ⛔ ไฟล์นี้มี secret — ห้าม commit
```

---
*จัดทำเป็น SSOT ฉบับเดียวสำหรับป้อน Claude Code | บริษัท จัมโบ้ อิเล็คทรอนิคส์ จำกัด*
*แทนที่: buriram_phase1_build_plan_v1, buriram_master_spec_v1, GAP_1, Buriram_Dashboard_Master_Context, burirum_update*