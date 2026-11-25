export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        pine: {
          DEFAULT: "rgb(var(--rgb-pine) / <alpha-value>)",
          deep: "rgb(var(--rgb-pine-deep) / <alpha-value>)",
        },
        court: "rgb(var(--rgb-court) / <alpha-value>)",
        lime: {
          DEFAULT: "rgb(var(--rgb-lime) / <alpha-value>)",
          deep: "rgb(var(--rgb-lime-deep) / <alpha-value>)",
        },
        paper: "rgb(var(--rgb-paper) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--rgb-ink) / <alpha-value>)",
          soft: "rgb(var(--rgb-ink-soft) / <alpha-value>)",
          faint: "rgb(var(--rgb-ink-faint) / <alpha-value>)",
        },
        line: "rgb(var(--rgb-line) / <alpha-value>)",
      },
      boxShadow: {
        card: "var(--theme-shadow-card, 0 1px 2px rgb(28 36 32 / 0.07))",
      },
    },
  },
  plugins: [],
};
