/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#211922",
        muted: "#62625b",
        line: "#c8c8c1",
        panel: "#f6f6f3",
        brand: "#e60023",
        accent: "#103c25",
        sand: "#e5e5e0",
        wash: "#fbfbf8",
        focus: "#435ee5",
        warn: "#b45309",
        danger: "#9e0a0a"
      },
      boxShadow: {
        soft: "0 10px 24px rgba(33, 25, 34, 0.06)"
      }
    }
  },
  plugins: []
};
