import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    env: loadEnv(mode, ".", ""),
    exclude: [
      "node_modules/**",
      ".git/**",
      ".next/**",
      "dist/**",
      "olddata/**",
      "storage/**",
    ],
  },
}));
