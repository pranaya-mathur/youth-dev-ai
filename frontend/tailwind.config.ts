import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        sans: ["var(--font-dm)", "system-ui", "sans-serif"],
      },
      colors: {
        dusk: {
          950: "#0c0a14",
          900: "#141022",
          800: "#1e1a32",
          700: "#2a2545",
        },
        bloom: {
          300: "#f9b4c9",
          400: "#f07ba8",
          500: "#e4568c",
        },
        aqua: {
          400: "#5ee0d3",
          500: "#2ec4b6",
        },
        sun: {
          300: "#ffe29a",
          400: "#ffd166",
        },
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(ellipse 120% 80% at 10% 0%, rgba(244,114,182,0.35), transparent 55%), radial-gradient(ellipse 90% 70% at 90% 10%, rgba(46,196,182,0.28), transparent 50%), radial-gradient(ellipse 70% 60% at 50% 100%, rgba(255,209,102,0.2), transparent 45%)",
      },
      boxShadow: {
        glow: "0 0 60px -12px rgba(244,114,182,0.45)",
        card: "0 25px 50px -12px rgba(12,10,20,0.55)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseSoft: "pulseSoft 4s ease-in-out infinite",
        drawerIn: "drawerIn 0.34s cubic-bezier(0.22, 1, 0.36, 1) both",
        backdropIn: "backdropIn 0.22s ease-out both",
        fabIn: "fabIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        coachTyping: "coachTyping 1.05s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        drawerIn: {
          "0%": { transform: "translateX(100%)", opacity: "0.96" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        backdropIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fabIn: {
          "0%": { transform: "scale(0.85) translateY(8px)", opacity: "0" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        coachTyping: {
          "0%, 100%": { opacity: "0.35", transform: "translateY(0)" },
          "50%": { opacity: "1", transform: "translateY(-2px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
