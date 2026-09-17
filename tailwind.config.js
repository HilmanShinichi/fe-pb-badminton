export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        pine: { DEFAULT: "#1d4d3b", deep: "#143728" },
        court: "#eef3e4",
        lime: { DEFAULT: "#b8d94a", deep: "#7a9a1e" },
        paper: "#f4f2ea",
        ink: { DEFAULT: "#1c2420", soft: "#55605a", faint: "#8a948e" },
        line: "#ddd8c8",
      },
      boxShadow: {
        card: "0 1px 2px rgb(28 36 32 / 0.07)",
      },
    },
  },
  plugins: [],
};
