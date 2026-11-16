import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    colors: {
      ink: "#070b14",
      panel: "#101d33",
      line: "#294363",
      muted: "#a6b8d0",
      accent: "#ed1c35"
    }
  }},
  plugins: []
};
export default config;
