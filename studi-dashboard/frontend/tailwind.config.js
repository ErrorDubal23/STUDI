/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "media",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#fcfcfb",
          dark: "#1a1a19",
        },
        plane: {
          DEFAULT: "#f9f9f7",
          dark: "#0d0d0d",
        },
        ink: {
          DEFAULT: "#0b0b0b",
          secondary: "#52514e",
          muted: "#898781",
          dark: "#ffffff",
          "dark-secondary": "#c3c2b7",
        },
        hairline: {
          DEFAULT: "#e1e0d9",
          dark: "#2c2c2a",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
