/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "Segoe UI", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
      colors: {
        canvas: "var(--bg)",
        ink: "var(--ink)",
        mute: "var(--muted)",
        line: "var(--line)",
        accent: "var(--accent)",
        paper: "var(--surface-solid)",
        forest: "var(--forest)",
        botanical: "var(--botanical)",
        sage: "var(--sage)",
        ivory: "var(--ivory)",
        terracotta: "var(--terracotta)",
        charcoal: "var(--charcoal)",
      },
      boxShadow: {
        card: "var(--shadow)",
      },
      borderRadius: {
        card: "0.9rem",
      },
    },
  },
  plugins: [],
};
