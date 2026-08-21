/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        zisamale: {
          green: "#2D7D46",
          "green-dark": "#1B5E20",
          "green-light": "#E8F5E9",
          teal: "#0F7B8A",
          "teal-dark": "#004D56",
          "teal-light": "#E0F2F1",
          dark: "#1A1A2E",
          light: "#F5F5F0",
        },
        risk: {
          critical: "#C62828",
          "critical-light": "#FFEBEE",
          high: "#E65100",
          "high-light": "#FFF3E0",
          medium: "#F9A825",
          "medium-light": "#FFFDE7",
          low: "#2E7D32",
          "low-light": "#E8F5E9",
        },
        info: {
          DEFAULT: "#1565C0",
          light: "#E3F2FD",
        },
        neutral: {
          DEFAULT: "#616161",
          light: "#F5F5F5",
        },
        surface: {
          bg: "#F5F5F0",
          card: "#FFFFFF",
          border: "#E0E0E0",
          divider: "#EEEEEE",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Roboto Mono", "monospace"],
      },
      fontSize: {
        label: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
        caption: ["14px", { lineHeight: "1.4", fontWeight: "500" }],
        body: ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "1.5", fontWeight: "400" }],
        title: ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        headline: ["24px", { lineHeight: "1.3", fontWeight: "700" }],
        data: ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        display: ["32px", { lineHeight: "1.2", fontWeight: "700" }],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        card: "0px 1px 3px rgba(0,0,0,0.12), 0px 1px 2px rgba(0,0,0,0.08)",
        "card-hover":
          "0px 3px 6px rgba(0,0,0,0.15), 0px 2px 4px rgba(0,0,0,0.12)",
        elevated:
          "0px 10px 20px rgba(0,0,0,0.15), 0px 3px 6px rgba(0,0,0,0.10)",
        critical: "0px 0px 0px 2px #C62828, 0px 4px 8px rgba(198,40,40,0.2)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in": "slideIn 200ms cubic-bezier(0, 0, 0.2, 1)",
        "fade-in": "fadeIn 200ms cubic-bezier(0, 0, 0.2, 1)",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
