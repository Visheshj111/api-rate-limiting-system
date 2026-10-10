import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#202923",
        surface: "#ffffff",
        surface2: "#f2f4ef",
        line: "#e1e5de",
        mint: "#287451",
        amber: "#94651d",
        rose: "#ba513c",
        muted: "#6d766e",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
