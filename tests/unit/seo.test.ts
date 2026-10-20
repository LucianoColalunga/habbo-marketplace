import { describe, expect, it } from "vitest";
import { es } from "@/lib/i18n/pages/es";
import { pt } from "@/lib/i18n/pages/pt";
import { languageAlternates, pageMeta } from "@/lib/i18n/seo";
import { buildSitemap, sitemapPages } from "@/lib/i18n/sitemap";
import { siteUrl } from "@/lib/site";

describe("dirección del sitio", () => {
  it("usa SITE_URL, si no el dominio de producción de Vercel, y nunca algo raro", () => {
    expect(siteUrl({ SITE_URL: "https://bomhams.example/x" })).toBe("https://bomhams.example");
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "habbo-marketplace-three.vercel.app" })).toBe(
      "https://habbo-marketplace-three.vercel.app",
    );
    expect(siteUrl({ SITE_URL: "javascript:alert(1)" })).toBe("http://localhost:3000");
    expect(siteUrl({ SITE_URL: "http://otro.com" })).toBe("http://localhost:3000");
    expect(siteUrl({})).toBe("http://localhost:3000");
  });
});

describe("metadata de cada página", () => {
  it("dirección canónica e idiomas alternativos (hreflang)", () => {
    expect(languageAlternates("/com/furni/throne")).toEqual({
      es: "/com/furni/throne",
      "pt-BR": "/pt/com/furni/throne",
      en: "/en/com/furni/throne",
      "x-default": "/com/furni/throne",
    });
    const meta = pageMeta({ lang: "pt", p: pt, path: "/nft", title: "NFT", description: "d", section: "nft" });
    expect(meta.alternates?.canonical).toBe("/pt/nft");
    expect(meta.openGraph).toMatchObject({
      url: "/pt/nft",
      locale: "pt_BR",
      title: "NFT · NFT · Stats",
      images: [{ url: "/og/nft-pt.png", width: 1200, height: 630 }],
    });
    expect(meta.robots).toBeUndefined();
  });

  it("las búsquedas internas no se indexan pero sus enlaces sí se siguen", () => {
    const meta = pageMeta({ lang: "es", p: es, path: "/es/buscar", title: "Buscar", description: "d", noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("sitemap", () => {
  const input = {
    hotels: ["es", "com"] as const,
    furni: {
      es: { keys: ["throne", "dragon egg"], generatedAt: "2026-10-18T05:00:00.000Z" },
      com: { keys: ["throne"], generatedAt: "2026-10-18T06:00:00.000Z" },
    },
    nft: { ids: ["019c05de-fd53-99ad-99be-cb21be61ab86"], generatedAt: "2026-10-18T08:00:00.000Z" },
  };

  it("incluye las páginas principales y los furnis más activos, sin duplicar 'más vendidos'", () => {
    const paths = sitemapPages({ ...input, hotels: [...input.hotels] }).map((p) => p.path);
    expect(paths).toContain("/es");
    expect(paths).toContain("/com/rankings");
    expect(paths).not.toContain("/com/rankings/vendidos");
    expect(paths).toContain("/es/furni/dragon%20egg");
    expect(paths).toContain("/nft/coleccion/ropa/caros");
    expect(paths).not.toContain("/nft/rankings/vendidos");
    expect(paths).not.toContain("/es/buscar");
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("cada página va en los tres idiomas, con direcciones absolutas", () => {
    const entries = buildSitemap("https://bomhams.example", { ...input, hotels: [...input.hotels] });
    expect(entries.length).toBe(sitemapPages({ ...input, hotels: [...input.hotels] }).length * 3);
    const throne = entries.filter((e) => e.url.endsWith("/com/furni/throne"));
    expect(throne.map((e) => e.url)).toEqual([
      "https://bomhams.example/com/furni/throne",
      "https://bomhams.example/pt/com/furni/throne",
      "https://bomhams.example/en/com/furni/throne",
    ]);
    expect(throne[0].alternates?.languages).toMatchObject({ "x-default": "https://bomhams.example/com/furni/throne" });
    expect(throne[0].lastModified).toBe("2026-10-18T06:00:00.000Z");
  });
});
