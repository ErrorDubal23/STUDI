/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "media",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#ffffff",
          dark: "#1d1a16",
        },
        plane: {
          DEFAULT: "#faf7f0",
          dark: "#0d0d0c",
        },
        ink: {
          DEFAULT: "#0b0b0b",
          secondary: "#524f47",
          muted: "#8c887d",
          dark: "#ffffff",
          "dark-secondary": "#c7c3b6",
        },
        hairline: {
          DEFAULT: "#ece7db",
          dark: "#2f2b23",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,25,15,0.04), 0 10px 28px -10px rgba(30,25,15,0.14)",
        "card-dark": "0 1px 2px rgba(0,0,0,0.3), 0 10px 28px -10px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
