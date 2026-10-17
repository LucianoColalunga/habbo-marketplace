import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta contra el sitio compilado (npm run build primero).
 * Usan los datos de .data/ (corré antes el recolector) y la API real de Habbo
 * desde el navegador para la parte "en vivo".
 */
const PORT = 3100;
// Para probar un sitio ya publicado: PLAYWRIGHT_BASE_URL=https://... npm run test:e2e
const REMOTE = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  // Algunas pruebas consultan la API real de Habbo, que limita los pedidos por IP:
  // un reintento evita falsos negativos por un 429 ocasional.
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    locale: "es-AR",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
  webServer: REMOTE
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}/es`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
