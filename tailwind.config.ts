import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', "sans-serif"],
      },
      colors: {
        // --- shadcn semantic tokens (HSL CSS variables) ---
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // --- Brand palette (Google Material style — จาก buriram_v8_4.html) ---
        blu: { DEFAULT: "#1a73e8", lt: "#e8f0fe", dk: "#1557b0" },
        grn: { DEFAULT: "#1e8e3e", lt: "#e6f4ea" },
        red: { DEFAULT: "#d93025", lt: "#fce8e6" },
        yel: { DEFAULT: "#f9ab00", lt: "#fef9e7" },
        prp: { DEFAULT: "#7c3aed", lt: "#ede9fe" },
        sf: { DEFAULT: "#ffffff", 2: "#f8f9fa", 3: "#f1f3f4" },
        bdr: "#e0e0e0",
        t1: "#202124",
        t2: "#5f6368",
        t3: "#9aa0a6",
        "dk-bg": "#0f1117",
        "dk-sf": "#1e2128",
        "dk-sf2": "#262b35",
        "dk-bdr": "#2e3340",
        "dk-t1": "#e8eaed",
        "dk-t2": "#9aa0a6",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        g1: "0 1px 3px rgba(60,64,67,.15),0 1px 2px rgba(60,64,67,.10)",
        g2: "0 2px 6px rgba(60,64,67,.15),0 1px 3px rgba(60,64,67,.12)",
        g3: "0 4px 16px rgba(60,64,67,.15)",
        g4: "0 12px 40px rgba(26,115,232,.2),0 4px 12px rgba(26,115,232,.12)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-dot": {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.6)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "fade-up": "fade-up 0.42s ease both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
