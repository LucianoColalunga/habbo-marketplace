import path from "node:path";
import { defineConfig } from "vitest/config";

/** Pruebas contra la API real de Habbo (hacen pocos pedidos). npm run test:live */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/live/**/*.test.ts"],
    testTimeout: 90_000,
    fileParallelism: false,
  },
});
