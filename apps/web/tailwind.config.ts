import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", ...defaultTheme.fontFamily.sans],
        heading: ['"Space Grotesk Variable"', '"Space Grotesk"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          DEFAULT: "#0f766e",
          dark: "#115e59",
          light: "#ccfbf1",
        },
      },
      minHeight: { tap: "3rem" },
      minWidth: { tap: "3rem" },
    },
  },
  plugins: [],
} satisfies Config;
