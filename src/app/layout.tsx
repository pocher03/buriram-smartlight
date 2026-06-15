import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ศูนย์บัญชาการโคมไฟถนนอัจฉริยะ — เทศบาลเมืองบุรีรัมย์",
  description:
    "ระบบมอนิเตอร์โคมไฟถนนอัจฉริยะ เทศบาลเมืองบุรีรัมย์ โดยบริษัท จัมโบ้ อิเล็คทรอนิคส์ จำกัด",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // กฎ: Dark mode เป็นค่าเริ่มต้น (toggle Light/Dark จะเพิ่มใน Sprint 1)
  return (
    <html lang="th" className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
