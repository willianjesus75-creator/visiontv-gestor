import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    colors: {
      ink: "#090d16",
      panel: "#111827",
      line: "#263244",
      muted: "#91a0b7",
      accent: "#e11d48"
    }
  }},
  plugins: []
};
export default config;
