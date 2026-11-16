import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    colors: {
      ink: "#050505",
      panel: "#090909",
      line: "#29313c",
      muted: "#9aa4b2",
      accent: "#f10d24"
    }
  }},
  plugins: []
};
export default config;
