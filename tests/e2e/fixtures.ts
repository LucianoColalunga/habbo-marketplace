import { test as base } from "@playwright/test";

/**
 * Igual que el `test` de Playwright, pero con el aviso de cookies ya respondido
 * ("aceptar todas"), para que no tape botones en las pruebas que no son sobre él.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.addInitScript(() => {
      try {
        if (!localStorage.getItem("bm:consent")) localStorage.setItem("bm:consent", JSON.stringify({ v: 1, prefs: true, at: Date.now() }));
      } catch {
        // sin almacenamiento
      }
    });
    await provide(page);
  },
});

export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";
