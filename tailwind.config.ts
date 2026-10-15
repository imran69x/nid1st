import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4f9",
          100: "#dbe5f2",
          200: "#b8cde4",
          300: "#89aed2",
          400: "#5a8ebd",
          500: "#3771a7",
          600: "#27588b",
          700: "#1f4670",
          800: "#132c4a",
          900: "#0b1b2f",
          950: "#07111f",
        },
        navy: {
          DEFAULT: "#0f2035",
          dark: "#0a1626",
          light: "#183252",
        },
        accent: {
          DEFAULT: "#00a86b",
          hover: "#008f5b",
          light: "#e6f7f0",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        bengali: ["var(--font-noto-bengali)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        card: "0 4px 20px -2px rgba(15, 32, 53, 0.08)",
        glow: "0 0 25px -5px rgba(55, 113, 167, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
