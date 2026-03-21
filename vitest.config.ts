import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    coverage: {
      enabled: false,
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/features/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
      exclude: ["src/lib/auth-client.ts", "src/lib/auth.ts", "src/lib/db.ts"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
