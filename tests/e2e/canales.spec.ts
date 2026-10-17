import { expect, test } from "@playwright/test";

// Necesita un build con NEXT_PUBLIC_DISCORD_URL, NEXT_PUBLIC_TELEGRAM_URL y NEXT_PUBLIC_WHATSAPP_URL.
test.skip(!process.env.E2E_CANALES, "Solo con un build que tenga los enlaces de los canales configurados");

test("botones para unirse a Discord, Telegram y WhatsApp", async ({ page }) => {
  for (const path of ["/es", "/es/ofertas", "/es/alertas"]) {
    await page.goto(path);
    for (const [name, href] of [
      ["Unite al Discord", process.env.NEXT_PUBLIC_DISCORD_URL],
      ["Unite al canal de Telegram", process.env.NEXT_PUBLIC_TELEGRAM_URL],
      ["Seguí el canal de WhatsApp", process.env.NEXT_PUBLIC_WHATSAPP_URL],
    ]) {
      const link = page.getByRole("link", { name: name! });
      await expect(link, `${path} ${name}`).toHaveAttribute("href", href!);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
  }
});
