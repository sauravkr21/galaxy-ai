import type { Config } from "tailwindcss";

/**
 * Design tokens distilled from the Galaxy.ai reference recording:
 *  - canvas: near-white (#f8f8fb) with a subtle dot grid
 *  - nodes: white cards, hairline borders (#ececf1), soft layered shadow
 *  - accent: violet (#7c5cff family) used for the running glow + run button
 *  - data edges: amber (#f5a623) for text, violet/blue for image/vision links
 *  - "Running" status badge: amber pill
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f7fa",
        ink: {
          DEFAULT: "#1a1a23",
          muted: "#6b6b78",
          faint: "#9a9aa7",
        },
        hairline: "#ececf1",
        violet: {
          50: "#f4f1ff",
          100: "#ece6ff",
          200: "#d8ccff",
          300: "#bba6ff",
          400: "#9b7aff",
          500: "#7c5cff",
          600: "#6a45f0",
          700: "#5a37d6",
        },
        amber: {
          soft: "#fef3c7",
          DEFAULT: "#f5a623",
          ink: "#b45309",
        },
        edge: {
          data: "#f5a623",
          vision: "#7c5cff",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        node: "14px",
        pill: "9999px",
      },
      boxShadow: {
        node: "0 1px 2px rgba(16,16,40,0.04), 0 8px 24px rgba(16,16,40,0.06)",
        "node-hover": "0 2px 4px rgba(16,16,40,0.06), 0 12px 32px rgba(16,16,40,0.10)",
        pop: "0 12px 40px rgba(16,16,40,0.14)",
        glow: "0 0 0 2px rgba(124,92,255,0.55), 0 0 24px 4px rgba(124,92,255,0.45)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(124,92,255,0.55), 0 0 0 4px rgba(124,92,255,0.18), 0 0 22px 2px rgba(124,92,255,0.30)",
          },
          "50%": {
            boxShadow:
              "0 0 0 2px rgba(124,92,255,0.85), 0 0 0 8px rgba(124,92,255,0.28), 0 0 40px 8px rgba(124,92,255,0.55)",
          },
        },
        "dash": {
          to: { strokeDashoffset: "-16" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 1.4s ease-in-out infinite",
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
