import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Read the repo-root .env so the proxy target can follow the backend PORT.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  const backendPort = env.PORT || "3000";
  const frontendPort = Number(env.FRONTEND_PORT) || 5180;

  return {
    plugins: [react()],
    server: {
      port: frontendPort,
      proxy: { "/api": `http://localhost:${backendPort}` },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test-setup.ts",
    },
  };
});
