// Genera las imágenes para compartir (public/og/{market,nft}-{es,pt,en}.png, 1200×630).
// Uso: npm run og-images   (necesita el navegador de Playwright: npx playwright install chromium)
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const TEXT = {
  market: {
    es: { chip: "Marketplace · créditos", title: "Precios del Marketplace de Habbo", sub: "Furnis, ofertas, rankings e historial de precios", fan: "Sitio de fans no oficial" },
    pt: { chip: "Marketplace · créditos", title: "Preços do Marketplace do Habbo", sub: "Mobis, ofertas, rankings e histórico de preços", fan: "Site de fãs não oficial" },
    en: { chip: "Marketplace · credits", title: "Habbo Marketplace prices", sub: "Furni, deals, rankings and price history", fan: "Unofficial fan site" },
  },
  nft: {
    es: { chip: "NFT · blockchain", title: "NFT oficiales de Habbo: precios y ventas", sub: "Furnis, ropa, mascotas, tokens y add-ons en Immutable", fan: "Sitio de fans no oficial" },
    pt: { chip: "NFT · blockchain", title: "NFT oficiais do Habbo: preços e vendas", sub: "Mobis, roupas, mascotes, tokens e add-ons na Immutable", fan: "Site de fãs não oficial" },
    en: { chip: "NFT · blockchain", title: "Habbo's official NFTs: prices and sales", sub: "Furni, clothes, pets, tokens and add-ons on Immutable", fan: "Unofficial fan site" },
  },
};
const ACCENT = { market: { color: "#f5b942", ink: "#1a1405" }, nft: { color: "#a78bfa", ink: "#140d2b" } };

/** Estrellas siempre iguales (números "al azar" repetibles). */
function stars(accent) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 90 }, () => {
    const r = 0.6 + rand() * 1.8;
    const color = rand() < 0.2 ? accent : rand() < 0.5 ? "#3987e5" : "#cfe1ff";
    return `<circle cx="${(rand() * 1200).toFixed(1)}" cy="${(rand() * 630).toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${(0.3 + rand() * 0.6).toFixed(2)}"/>`;
  }).join("");
}

function html(section, lang) {
  const t = TEXT[section][lang];
  const a = ACCENT[section];
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Space+Grotesk:wght@500;700&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #0c0e13; color: #eef0f4; font-family: Inter, sans-serif; overflow: hidden; position: relative; }
  svg.sky { position: absolute; inset: 0; }
  .wrap { position: absolute; inset: 0; padding: 64px 72px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 18px; font-family: "Space Grotesk"; font-weight: 700; font-size: 40px; }
  .brand span { color: ${a.color}; }
  .chip { margin-top: 56px; align-self: flex-start; background: ${a.color}; color: ${a.ink}; font-family: "Space Grotesk"; font-weight: 700; font-size: 26px; padding: 8px 18px; border-radius: 12px; }
  h1 { margin-top: 22px; font-family: "Space Grotesk"; font-weight: 700; font-size: 68px; line-height: 1.05; max-width: 900px; }
  p.sub { margin-top: 20px; font-size: 30px; color: #b4b9c6; max-width: 820px; }
  .foot { margin-top: auto; display: flex; justify-content: space-between; font-size: 22px; color: #868c99; }
</style></head><body>
<svg class="sky" viewBox="0 0 1200 630">${stars(a.color)}
  <path d="M880 190 L950 140 L1000 165 L1070 90 L1130 60" fill="none" stroke="${a.color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
  <circle cx="1130" cy="60" r="10" fill="${a.color}"/>
</svg>
<div class="wrap">
  <div class="brand">
    <svg viewBox="0 0 32 32" width="64" height="64"><path d="M16 3 28 9.5v13L16 29 4 22.5v-13Z" fill="#1c2030" stroke="#343a4a"/><path d="M16 3 28 9.5 16 16 4 9.5Z" fill="#242a3c"/><path d="M16 16v13L4 22.5v-13Z" fill="#151821"/><path d="M7.5 20.5 12 16.8l3.2 2.4 4.6-5.4 4.7-2.6" fill="none" stroke="#f5b942" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24.5" cy="11.2" r="2" fill="#f5b942"/></svg>
    <div>Furní<span>metro</span></div>
  </div>
  <div class="chip">${t.chip}</div>
  <h1>${t.title}</h1>
  <p class="sub">${t.sub}</p>
  <div class="foot"><span>.es · .com · .com.br · ES · PT · EN</span><span>${t.fan}</span></div>
</div></body></html>`;
}

mkdirSync("public/og", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const section of ["market", "nft"]) {
  for (const lang of ["es", "pt", "en"]) {
    await page.setContent(html(section, lang), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const path = `public/og/${section}-${lang}.png`;
    await page.screenshot({ path });
    console.log("listo", path);
  }
}
await browser.close();
