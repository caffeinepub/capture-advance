import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Geist Mono", "monospace"],
        sans: ["Sora", "sans-serif"],
        display: ["Sora", "sans-serif"],
      },
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
        // Trading terminal brand colors
        buy: "#00c853",
        sell: "#ff1744",
        terminal: {
          green: "#00c853",
          red: "#ff1744",
          yellow: "#ffd600",
          cyan: "#00e5ff",
          bg: "#0a0a0d",
          panel: "#0d0d11",
          border: "rgba(255,255,255,0.07)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        "buy-sm": "0 0 15px rgba(0, 200, 83, 0.3)",
        "buy-lg": "0 0 40px rgba(0, 200, 83, 0.6)",
        "sell-sm": "0 0 15px rgba(255, 23, 68, 0.3)",
        "sell-lg": "0 0 40px rgba(255, 23, 68, 0.6)",
        panel: "0 4px 24px rgba(0,0,0,0.5)",
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
        "glow-buy": {
          "0%, 100%": { boxShadow: "0 0 20px 5px rgba(0,200,83,0.4), 0 0 60px 10px rgba(0,200,83,0.2)" },
          "50%": { boxShadow: "0 0 40px 15px rgba(0,200,83,0.8), 0 0 100px 30px rgba(0,200,83,0.4)" },
        },
        "glow-sell": {
          "0%, 100%": { boxShadow: "0 0 20px 5px rgba(255,23,68,0.4), 0 0 60px 10px rgba(255,23,68,0.2)" },
          "50%": { boxShadow: "0 0 40px 15px rgba(255,23,68,0.8), 0 0 100px 30px rgba(255,23,68,0.4)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-buy": "glow-buy 1.2s ease-in-out infinite",
        "glow-sell": "glow-sell 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
