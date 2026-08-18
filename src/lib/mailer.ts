// src/lib/mailer.ts
// ส่งอีเมลผ่าน SMTP (Gmail App Password) — ใช้สำหรับรีเซ็ตรหัสผ่านเท่านั้น
// ย้ายไป SMTP ขององค์กรได้ภายหลังโดยแก้เฉพาะค่าใน .env.local

import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const FROM_NAME = process.env.SMTP_FROM_NAME ?? "ระบบโคมไฟถนนอัจฉริยะ";

export const mailerConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

/** เทมเพลตอีเมลรีเซ็ตรหัสผ่าน — โทนราชการ อ่านง่าย ไม่ใช้ภาพภายนอก */
function resetEmailHtml(name: string, link: string, minutes: number): string {
  return `
<div style="font-family:'IBM Plex Sans Thai','Segoe UI',sans-serif;background:#f1f3f4;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e0e0e0;">
    <div style="background:#1a73e8;padding:20px 24px;">
      <div style="color:#ffffff;font-size:16px;font-weight:700;">ศูนย์บริหารจัดการโคมไฟถนนอัจฉริยะ</div>
      <div style="color:#d2e3fc;font-size:12px;margin-top:2px;">เทศบาลเมืองบุรีรัมย์</div>
    </div>
    <div style="padding:24px;">
      <p style="font-size:14px;color:#202124;margin:0 0 12px;">เรียน ${name}</p>
      <p style="font-size:13px;color:#5f6368;line-height:1.7;margin:0 0 20px;">
        ระบบได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีของท่าน
        กรุณากดปุ่มด้านล่างเพื่อดำเนินการภายใน <strong style="color:#202124;">${minutes} นาที</strong>
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${link}" style="display:inline-block;background:#1a73e8;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
          ตั้งรหัสผ่านใหม่
        </a>
      </div>
      <p style="font-size:12px;color:#9aa0a6;line-height:1.7;margin:0 0 8px;">
        หากปุ่มไม่ทำงาน กรุณาคัดลอกลิงก์ต่อไปนี้ไปวางในเบราว์เซอร์
      </p>
      <p style="font-size:11px;color:#1a73e8;word-break:break-all;margin:0 0 20px;">${link}</p>
      <div style="border-top:1px solid #e0e0e0;padding-top:16px;">
        <p style="font-size:12px;color:#9aa0a6;line-height:1.7;margin:0;">
          หากท่านมิได้เป็นผู้ร้องขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้ รหัสผ่านเดิมของท่านจะยังคงใช้งานได้ตามปกติ
        </p>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:14px 24px;border-top:1px solid #e0e0e0;">
      <p style="font-size:11px;color:#9aa0a6;margin:0;">
        อีเมลฉบับนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
      </p>
    </div>
  </div>
</div>`.trim();
}

export async function sendResetEmail(opts: {
  to: string;
  name: string;
  link: string;
  minutes: number;
}): Promise<void> {
  if (!mailerConfigured) {
    // dev/ยังไม่ตั้งค่า SMTP — log ลิงก์ไว้ทดสอบแทนการส่งจริง
    console.warn("[mailer] ยังไม่ได้ตั้งค่า SMTP — ลิงก์รีเซ็ต:", opts.link);
    return;
  }

  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${SMTP_USER}>`,
    to: opts.to,
    subject: "การตั้งรหัสผ่านใหม่ — ศูนย์บริหารจัดการโคมไฟถนนอัจฉริยะ",
    html: resetEmailHtml(opts.name, opts.link, opts.minutes),
    text:
      `เรียน ${opts.name}\n\n` +
      `ระบบได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีของท่าน\n` +
      `กรุณาเปิดลิงก์ต่อไปนี้ภายใน ${opts.minutes} นาที\n\n${opts.link}\n\n` +
      `หากท่านมิได้เป็นผู้ร้องขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้`,
  });
}