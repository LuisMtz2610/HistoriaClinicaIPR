import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2B9C93", // teal from logo
          light: "#4FB7AE",
          dark: "#217A73"
        }
      }
    },
  },
  plugins: [],
};
export default config;
