/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00D4FF",
        "background-dark": "#020617",
        "background-light": "#0f172a",
        "panel-dark": "#0a1122",
        "navy-surface": "#0b1220",
        "navy-border": "#1e293b",
        "border-muted": "#1e293b",
        "border-navy": "#1e293b",
        "severity-critical": "#ef4444",
        "severity-warning": "#f59e0b",
        "threat-high": "#ef4444",
        "threat-low": "#10b981",
      }
    },
  },
  plugins: [],
}