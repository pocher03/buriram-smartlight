"use client";

// Theme provider — Dark เป็นค่าเริ่มต้น (กฎ UI ข้อ 9), สลับ Light/Dark ผ่าน class
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
