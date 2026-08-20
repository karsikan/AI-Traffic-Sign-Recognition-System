/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        asphalt: { 900: "#0b1220", 800: "#121b2e", 700: "#1c2841" },
        signal: { DEFAULT: "#f5a623", 600: "#e0950f" },   // amber
        go: { DEFAULT: "#1faa59" },                        // reflective green
        alert: { DEFAULT: "#e03131" },                     // stop red
      },
      fontFamily: {
        display: ['"Barlow Condensed"', "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
