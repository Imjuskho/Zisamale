/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        zisamale: {
          clay: "#A8502F",
          "clay-dark": "#8A3E22",
          "clay-light": "#F4E3D8",
          ochre: "#B7791F",
          ink: "#29241C",
          paper: "#F6F1E7",
          green: "#2D7D46",
          "green-dark": "#1B5E20",
          "green-light": "#E8F5E9",
          teal: "#17646C",
          "teal-dark": "#0E474D",
          "teal-light": "#E4EEEC",
          dark: "#29241C",
          light: "#F6F1E7",
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
          DEFAULT: "#6E6557",
          light: "#F1EBDF",
        },
        surface: {
          bg: "#F6F1E7",
          card: "#FFFDF8",
          border: "#E3D9C6",
          divider: "#EFE8D9",
        },
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "-apple-system", "sans-serif"],
        display: ["Fraunces", "Georgia", "Times New Roman", "serif"],
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
        card: "0px 1px 3px rgba(41, 36, 28, 0.10), 0px 1px 2px rgba(41, 36, 28, 0.06)",
        "card-hover":
          "0px 3px 8px rgba(41, 36, 28, 0.14), 0px 2px 4px rgba(41, 36, 28, 0.08)",
        elevated:
          "0px 12px 24px rgba(41, 36, 28, 0.16), 0px 4px 8px rgba(41, 36, 28, 0.08)",
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
