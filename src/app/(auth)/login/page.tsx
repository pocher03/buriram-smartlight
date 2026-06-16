"use client";

// Login (Sprint 1) — Mock redirect เท่านั้น ยังไม่ต่อ Auth.js จริง (จะทำใน Sprint 3)
// ⚠️ READ-ONLY: ไม่มีการสั่งการฮาร์ดแวร์
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("admin123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const doLogin = () => {
    setLoading(true);
    // Mock: เข้าสู่ระบบทันที (การยืนยันตัวตนจริงอยู่ใน Sprint 3)
    router.push("/");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doLogin();
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(145deg,#e6f4ea 0%,#f8fdf9 45%,#ffffff 100%)",
        }}
      >
        <div
          className="bg-float absolute rounded-full pointer-events-none"
          style={{
            top: -80,
            left: -80,
            width: 360,
            height: 360,
            background: "radial-gradient(circle,rgba(30,142,62,.16),transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            bottom: -90,
            right: -90,
            width: 420,
            height: 420,
            background: "radial-gradient(circle,rgba(52,168,83,.12),transparent 70%)",
          }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="login-in w-full" style={{ maxWidth: 420 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: "30px 34px",
              boxShadow:
                "0 12px 56px rgba(30,142,62,.16),0 2px 10px rgba(0,0,0,.06)",
              border: "1px solid #e8f0ea",
            }}
          >
            <div className="text-center mb-4">
              <div
                className="mx-auto mb-3 flex items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  background: "linear-gradient(135deg,#1e8e3e,#34a853)",
                  borderRadius: 16,
                  boxShadow: "0 10px 32px rgba(30,142,62,.32)",
                }}
              >
                <span className="ms ms-f text-white" style={{ fontSize: 30 }}>
                  lightbulb
                </span>
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#202124", lineHeight: 1.3 }}>
                ศูนย์บริหารจัดการโคมไฟถนนอัจฉริยะ
              </h1>
              <p style={{ fontSize: 12, color: "#5f6368", marginTop: 5 }}>
                เทศบาลเมืองบุรีรัมย์
              </p>
            </div>

            <Field label="ชื่อผู้ใช้งาน" icon="person">
              <input
                className="login-input login-input-grn"
                style={{ paddingLeft: 40 }}
                value={user}
                onChange={(e) => setUser(e.target.value)}
                onKeyDown={onKey}
                placeholder="กรอกชื่อผู้ใช้งาน"
                autoComplete="username"
              />
            </Field>

            <Field label="รหัสผ่าน" icon="lock">
              <input
                className="login-input login-input-grn"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                type={showPw ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={onKey}
                placeholder="กรอกรหัสผ่าน"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 38,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                <span className="ms" style={{ fontSize: 17, color: "#9aa0a6" }}>
                  {showPw ? "visibility_off" : "visibility"}
                </span>
              </button>
            </Field>

            <button
              className="login-btn login-btn-grn"
              onClick={doLogin}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>

            <p style={{ fontSize: 10, color: "#9aa0a6", textAlign: "center", marginTop: 14 }}>
              โหมดสาธิต — ระบบยืนยันตัวตนจริงจะเปิดใช้งานใน Sprint 3
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#9aa0a6" }}>
            พัฒนาโดย{" "}
            <strong style={{ color: "#5f6368" }}>บริษัท จัมโบ้ อิเล็คทรอนิคส์ จำกัด</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: "#5f6368",
          marginBottom: 6,
          letterSpacing: ".3px",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span
          className="ms ms-f"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 17,
            color: "#9aa0a6",
            pointerEvents: "none",
          }}
        >
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}
