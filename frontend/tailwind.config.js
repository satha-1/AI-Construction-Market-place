const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: token("canvas"),
        surface: token("surface"),
        soft: token("soft"),
        ink: token("ink"),
        muted: token("muted"),
        subtle: token("subtle"),
        line: token("line"),
        accent: token("accent"),
        "accent-fg": token("accent-fg"),
        "accent-soft": token("accent-soft"),
        secondary: token("secondary"),
        success: "#059669",
        warning: "#D97706",
        danger: "#DC2626",
        info: "#2563EB",
      },
      fontFamily: {
        sans: ["var(--font)", "ui-monospace", "system-ui", "sans-serif"],
        display: ["var(--font)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        ui: "var(--r-ui)",
        card: "var(--r-card)",
      },
      boxShadow: {
        lift: "0 12px 30px rgba(0,0,0,0.08)",
      },
      transitionTimingFunction: {
        ui: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        ui: "300ms",
      },
      minHeight: { touch: "44px", "touch-lg": "48px" },
    },
  },
  plugins: [],
};
