import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  define: {
    "process.env":
      process.env.NODE_ENV === "development"
        ? {
            GRIST_BASE_URL: process.env.GRIST_BASE_URL,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          }
        : {},
  },
  resolve:
    process.env.NODE_ENV === "development"
      ? {}
      : {
          alias: {
            "react-dom/server": "react-dom/server.node",
          },
        },
});
