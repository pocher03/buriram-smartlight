import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Providers } from "@/components/providers";

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
  // กฎ UI #9: Dark mode เป็นค่าเริ่มต้น — สลับ Light/Dark ผ่าน next-themes (class)
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
