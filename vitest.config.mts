import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  Object.assign(process.env, env);

  return {
    plugins: [tsconfigPaths(), react()],
    test: {
      environment: "jsdom",
      exclude: ["**/node_modules/**", "**/dist/**"],
    },
  };
});
