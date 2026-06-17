# CLAUDE.md — ศูนย์บัญชาการโคมไฟถนนอัจฉริยะ เทศบาลเมืองบุรีรัมย์
**บริษัท จัมโบ้ อิเล็คทรอนิคส์ จำกัด** | SSOT v1.1 | อัปเดต: 15 มิถุนายน 2569

> **Claude Code:** อ่านไฟล์นี้ให้จบก่อนเขียนโค้ดทุกบรรทัด จากนั้นอ่าน `buriram_master_plan_v2.md`

**Sprint ปัจจุบัน:** Sprint 3 ✅ เสร็จ (code) — Auth.js v5 Credentials + bcrypt, RBAC 2 role
(admin ผูก projectId / super_admin isCrossProject auto-redirect บุรีรัมย์ Phase 1),
middleware กัน route, access_logs APPEND-ONLY (login/fail/logout/select_project),
ล็อกบัญชี 30 วิ หลังผิด 3 ครั้ง, seed 3 บัญชี — build ผ่าน
⏳ ค้างบน Droplet: ตั้ง AUTH_SECRET ใน .env.local + รัน `npm run db:seed` (ดูคำสั่งท้าย session)
→ ถัดไป Sprint 4 (Analytics + Export + UAT; "ลืมรหัสผ่าน" เลื่อนมาที่นี่)
---

## 🔴 กฎเหล็ก (ห้ามละเมิดเด็ดขาด — ทุกข้อมีผลทางกฎหมายและความปลอดภัย)

| # | กฎ | รายละเอียด |
|---|---|---|
| 1 | **READ-ONLY** | ห้ามสร้าง UI/API ที่สั่งการฮาร์ดแวร์ทุกชนิด (ห้ามแม้แต่ปุ่มเปิด/ปิด/หรี่ไฟ) |
| 2 | **100vh SINGLE-SCREEN** | Dashboard จบในหน้าจอเดียว บังคับ `overflow:hidden` ระดับ body |
| 3 | **NULL-SAFE** | ทุกค่าที่ไม่มีต้องแสดง `--` — ห้าม crash, ห้าม undefined ปรากฏ UI |
| 4 | **NO DIRECT API CALL** | Frontend ดึงจาก Local DB เท่านั้น ห้ามยิง `rulr-aiot.com` จาก Frontend |
| 5 | **ภาษาไทยทางการ** | UI label/ข้อความ/alert ทั้งหมดเป็นภาษาไทยระดับราชการ |
| 6 | **SECRET ใน .env.local เท่านั้น** | ห้ามใช้ `NEXT_PUBLIC_` กับค่าลับ ห้าม hardcode credential ในโค้ด |
| 7 | **AUDIT LOG APPEND-ONLY** | ห้าม UPDATE/DELETE ตาราง `alarm_logs`, `access_logs` ทุกกรณี |
| 8 | **DEMO MODE ติดป้าย** | ข้อมูลจำลองต้องแสดง banner "⚠️ ข้อมูลสาธิต" ทุกหน้าจอ |

---

## 💾 Commit Strategy (บังคับ — ป้องกันระบบพัง)

Claude Code ต้อง commit ทุกครั้งที่ถึง checkpoint ต่อไปนี้ **ก่อนเขียนโค้ดต่อ:**

```
CHECKPOINT 1: หลัง scaffold โปรเจกต์เสร็จ (next.js init, tailwind, shadcn)
CHECKPOINT 2: หลังสร้าง component ใหม่แต่ละตัวเสร็จและ compile ผ่าน
CHECKPOINT 3: หลัง Prisma migration รันผ่าน
CHECKPOINT 4: หลังเชื่อม API endpoint ใหม่แต่ละตัวสำเร็จ
CHECKPOINT 5: หลังแก้ bug ที่ใช้เวลานานกว่า 10 นาที
CHECKPOINT 6: ก่อนเริ่มงานที่ "เสี่ยง" (refactor ใหญ่, เปลี่ยน schema, แก้ auth)
CHECKPOINT 7: สิ้นสุดทุก Sprint
```

```bash
# รูปแบบ commit message (ภาษาอังกฤษ เพื่อ git standard)
git add -A
git commit -m "feat(sprint-1): add KPI cards with null-safe display"
git commit -m "fix(map): leaflet marker null-check for missing lat/lng"
git commit -m "chore(db): prisma migration add device_type column"
git commit -m "checkpoint: sprint-1 dashboard mock complete ✓"
```

> **เหตุผล:** Claude Code session มี context limit — ถ้าระบบพังระหว่างเขียน
> และไม่มี commit ก่อนหน้า จะต้องเริ่มใหม่ทั้งหมด สูญ credit โดยเปล่าประโยชน์

---

## 💡 Credit Optimization (มี 30 credit — ใช้อย่างมีประสิทธิภาพ)

### หลักการประหยัด credit
```
✅ DO:
- บอก Claude Code ว่า "ทำ X ให้เสร็จก่อน แล้ว commit แล้วหยุด รอ confirm"
- แนบ error message หรือ log จริงเมื่อมี bug (อย่าอธิบายเอง)
- ระบุไฟล์/บรรทัดที่ต้องแก้ให้ชัดเจน
- ให้ทำทีละ Sprint อย่าให้ทำข้ามหลาย Sprint ในครั้งเดียว
- ใช้ "ทำแค่ X ก่อน อย่าแตะ Y" เพื่อ scope งานให้แคบ

❌ DON'T:
- ให้ทำงานหลายอย่างพร้อมกันในคำสั่งเดียว ("ทำ auth + map + chart ให้เสร็จ")
- ให้แก้ไขไฟล์ที่ยังไม่ถึงเวลา (เช่น แก้ Sprint 3 ตอนยังอยู่ Sprint 1)
- ให้ refactor โดยไม่มี test ยืนยันก่อน
- ให้ install package โดยไม่บอกเหตุผล
```

### Sprint Scope (ทำทีละ Sprint เท่านั้น)
```
Sprint 0 → scaffold + docker + SSL เท่านั้น
Sprint 1 → frontend + mock เท่านั้น  
Sprint 2 → DB + pipeline เท่านั้น
Sprint 3 → auth + RBAC เท่านั้น
Sprint 4 → analytics + UAT เท่านั้น
```

---

## 📁 โครงสร้าง Repository

```
repo/
├── CLAUDE.md                        ← อ่านก่อนเสมอ (ไฟล์นี้)
├── .env.example                     ← Template (safe to commit ✅)
├── .env.local                       ← Credentials จริง (gitignored ⛔)
├── .gitignore
├── .claudeignore
├── buriram_master_plan_v2.md    ← SSOT หลัก อ่านก่อนเขียนโค้ด
└── docs/
    └── api-samples/  
        ├── buriram_v8_4.html               ← ตัวอย่าง API response จริง
```

### โครงสร้าง Source Code (เป้าหมาย)
```
src/
├── app/                    ← Next.js App Router
│   ├── (auth)/login/
│   ├── (dashboard)/page.tsx
│   └── api/               ← Local API routes (ไม่ใช่ RULR API)
├── components/
│   ├── dashboard/         ← KPI, Map, Charts, Logs
│   ├── ui/                ← shadcn components
│   └── shared/            ← NullSafe, StatusBadge, ThemeToggle
├── lib/
│   ├── adapters/          ← mock.ts | live.ts (DATA_SOURCE switch)
│   ├── device-profiles.ts ← DEVICE_PROFILES constant
│   ├── null-safe.ts       ← getVal, safeNum, display utils
│   └── prisma.ts          ← Prisma client singleton
├── workers/               ← CRON jobs (แยกจาก Next.js)
│   ├── token-service.ts   ← refresh token เชิงรุก
│   └── data-sync.ts       ← ดึง API → DB ทุก 30 นาที
└── prisma/
    └── schema.prisma
```

---

## ⚙️ Tech Stack (ล็อคแล้ว — ห้ามเปลี่ยน)

| Layer | Technology | หมายเหตุ |
|---|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS | App Router |
| Map | Leaflet.js + OpenStreetMap | ห้ามใช้ Google Maps |
| Charts | Recharts | |
| ORM | Prisma + PostgreSQL | |
| Auth | Auth.js (NextAuth v5) + bcrypt | |
| Deploy | Docker Compose + Caddy | Auto-HTTPS |
| UI Components | shadcn/ui | |
| Style | Tailwind CSS — minimal corporate Google style | Dark mode default |

---

## Data Source Adapter Pattern (บังคับใช้ตั้งแต่ Sprint 1)

```typescript
// src/lib/adapters/index.ts
// ควบคุมด้วย DATA_SOURCE ใน .env.local
// mock → Sprint 0-1 และ Demo Mode
// live → Sprint 2+ ดึงจาก Local PostgreSQL เท่านั้น

const adapter = process.env.DATA_SOURCE === 'live'
  ? await import('./live')
  : await import('./mock');

export default adapter;
```

---

## Device Type Profiles (ห้าม hardcode — อ้างอิงจากนี้เท่านั้น)

```typescript
// src/lib/device-profiles.ts
type DeviceType = 'controller' | 'solar';

export const DEVICE_PROFILES = {
  controller: {
    hasBattery: false,
    expectAlwaysOnline: false, // ออฟไลน์กลางวัน = ปกติ (ไม่ใช่ fault)
    showSOC: false,
  },
  solar: {
    hasBattery: true,
    expectAlwaysOnline: true,  // ออฟไลน์ทุกเวลา = fault
    showSOC: true,
  },
} satisfies Record<DeviceType, DeviceTypeProfile>;
```

**เฟสแรก:** มีเฉพาะ `controller` (26 ต้น บุรีรัมย์) — โค้ดสาขา `solar` พร้อมทำงานเมื่อมีอุปกรณ์เพิ่ม

---

## 🔒 Security Checklist (ตรวจก่อน commit ทุกครั้ง)

```
□ ไม่มี credential/token/key ปรากฏในโค้ด
□ ไม่มีการใช้ NEXT_PUBLIC_ กับค่าลับ
□ .env.local อยู่ใน .gitignore
□ ไม่มี console.log ที่แสดงข้อมูลผู้ใช้หรือ token
□ API routes มีการตรวจสอบ session ก่อน return ข้อมูล
□ Prisma queries ใช้ parameterized (ไม่มี string concat)
□ ไม่มีการ expose divisionId หรือ clientId ใน Frontend bundle
```
## 🐛 บั๊กที่เจอจริงตอน Deploy Sprint 2 (ห้ามทำผิดซ้ำ)

| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| RULR gateway ตอบ 401 ทั้งที่ credential ถูก | Node fetch/undici ไม่ใส่ `User-Agent` header ให้อัตโนมัติ (curl ใส่ให้) gateway ปฏิเสธ request ที่ไม่มี User-Agent | ทุก fetch ไปยัง rulr-aiot.com ต้องมี header `User-Agent` + `Accept: application/json` เสมอ |
| Prisma Client "did not initialize" ใน worker container | Dockerfile.worker copy `package.json` → `npm ci` → ค่อย copy `prisma/` ทีหลัง ทำให้ `postinstall` (prisma generate) รันก่อนมี schema | ต้อง `COPY prisma ./prisma` และ `RUN npx prisma generate` **ก่อน** `COPY . .` เสมอใน Dockerfile ที่ใช้ Prisma |
| ตารางใหม่ (เช่น kpi_snapshots) สร้างแล้วแต่ worker ยังบอกว่าไม่มีตาราง | `docker compose restart`/`up -d` ไม่ recreate container จริงถ้า config ไม่เปลี่ยน → connection เก่ายังไม่เห็นตารางใหม่ | ใช้ `docker compose up -d --force-recreate <service>` หลัง migrate ตารางใหม่เสมอ |
| DATABASE_URL ที่ใช้จริงผิดจากแผน | `.env.local` ไม่ได้ตั้ง `POSTGRES_USER`/`POSTGRES_DB` → Postgres ใช้ default = `postgres`/`postgres` ไม่ใช่ `buriram`/`buriram_db` | **DATABASE_URL จริงบน Droplet คือ** `postgresql://postgres:PASSWORD@postgres:5432/postgres` — ใช้ค่านี้เสมอ ไม่ใช่ตามแผนเดิม |
| Droplet อยู่ branch ผิด ทำให้ pull ดูเหมือนสำเร็จแต่ไม่ได้โค้ดใหม่ | repo บน Droplet checkout เป็น `master` แต่ GitHub ใช้ `main` | เช็ค `git branch` ก่อนเชื่อ `git pull` ทุกครั้งบน Droplet |
---

## ✅ Definition of Done ต่อ Sprint

| Sprint | งาน | เงื่อนไขผ่าน |
|---|---|---|
| **0** | Scaffold + Docker + SSL | `docker compose up` ขึ้น HTTPS ได้ ไม่มี error |
| **1** | Frontend + Mock + Login + Dark/Light | Dashboard นิ่ง ครบทุก widget บน mock, Leaflet แสดงหมุด |
| **2** | DB + CRON Pipeline + Local API | ข้อมูลจริงไหลลง DB ทุก 30 นาที อ่านผ่าน Local API ว่าง = `--` |
| **3** | Auth + RBAC + Access Log | Login จริง, ล็อคบัญชีหลังผิด 3 ครั้ง, Log บันทึกครบ |
| **4** | Analytics + Export + UAT | UAT ผ่าน, Export CSV ได้, Demo Mode ติดป้ายชัด |

> **ทุก Sprint: commit + รัน build ผ่าน + ไม่มี TypeScript error ก่อนถือว่าเสร็จ**

---

## ⚠️ ประเด็นเปิดค้าง (รอยืนยัน — ห้าม implement จนกว่าจะยืนยัน)

| ประเด็น | สถานะ | กระทบ |
|---|---|---|
| รายชื่อโซนจริง + mapping อุปกรณ์ | ⏳ ยังไม่มี | seed ตาราง zones — ใช้ mock ไปก่อน |
| Log Retention จาก TOR | ⏳ ยังไม่ยืนยัน | default 365 วัน ไปก่อน |
| TOR ยืนยันเลข Log Retention จริง | ⏳ รอเช็ค | pruning cron |

Device Type section — เพิ่ม warning:
   ⚠️ isFault() logic: วาง schema + DEVICE_PROFILES ได้ใน Sprint 1
   แต่ห้าม implement logic ออฟไลน์=fault จนกว่าทีมจะยืนยันพฤติกรรม controller