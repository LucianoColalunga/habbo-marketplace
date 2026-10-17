import { describe, expect, it } from "vitest";
import { getFormat } from "@/lib/format";
import { homeHotel, isLang, localePath, splitLocale } from "@/lib/i18n/config";
import { langRedirects, langRewrites } from "@/lib/i18n/routing";
import { describeRuleIn, UI } from "@/lib/i18n/ui";
import { en as enPages } from "@/lib/i18n/pages/en";
import { es as esPages } from "@/lib/i18n/pages/es";
import { pt as ptPages } from "@/lib/i18n/pages/pt";
import { StarfieldEngine, starCount } from "@/lib/starfield";

/** Todas las rutas de claves de un objeto ("nav.home", "item.d30", ...). */
function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !("$$typeof" in v) && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("direcciones por idioma", () => {
  it("el español va sin prefijo y los otros con el suyo", () => {
    expect(localePath("es", "/com/furni/throne")).toBe("/com/furni/throne");
    expect(localePath("en", "/com/furni/throne")).toBe("/en/com/furni/throne");
    expect(localePath("pt", "/nft")).toBe("/pt/nft");
    expect(localePath("pt", "/")).toBe("/pt");
    // Nunca arma un enlace a otro sitio.
    expect(localePath("es", "//evil.com/x")).toBe("/evil.com/x");
    expect(localePath("es", "/\\evil.com")).toBe("/evil.com");
    expect(localePath("en", "\\\\evil.com")).toBe("/en/evil.com");
  });

  it("la ruta visible y la interna dan lo mismo (sin diferencias entre servidor y navegador)", () => {
    expect(splitLocale("/com/rankings")).toEqual({ lang: "es", rest: "/com/rankings" });
    expect(splitLocale("/es/com/rankings")).toEqual({ lang: "es", rest: "/com/rankings" });
    // "/es/rankings" es el hotel .es, no el idioma.
    expect(splitLocale("/es/rankings")).toEqual({ lang: "es", rest: "/es/rankings" });
    expect(splitLocale("/es/es/rankings")).toEqual({ lang: "es", rest: "/es/rankings" });
    expect(splitLocale("/es")).toEqual({ lang: "es", rest: "/es" });
    expect(splitLocale("/es/nft/item/x")).toEqual({ lang: "es", rest: "/nft/item/x" });
    expect(splitLocale("/en/br/ofertas")).toEqual({ lang: "en", rest: "/br/ofertas" });
    expect(splitLocale("/pt/nft")).toEqual({ lang: "pt", rest: "/nft" });
    expect(isLang("pt")).toBe(true);
    expect(isLang("fr")).toBe(false);
  });

  it("cada idioma arranca en su hotel", () => {
    expect(homeHotel("es")).toBe("es");
    expect(homeHotel("pt")).toBe("br");
    expect(homeHotel("en")).toBe("com");
  });

  it("la portada respeta la cookie antes que el idioma del navegador", () => {
    const rules = langRedirects(["es", "com", "br"]).filter((r) => r.source === "/");
    expect(rules[0]).toMatchObject({ has: [{ type: "cookie", value: "pt" }], destination: "/pt/br" });
    const header = rules.findIndex((r) => r.has?.[0].type === "header");
    const cookie = rules.map((r) => r.has?.[0].type).lastIndexOf("cookie");
    expect(cookie).toBeLessThan(header);
    expect(rules.at(-1)).toEqual({ source: "/", destination: "/es", permanent: false });
    // Sin el hotel preferido, se usa el primero habilitado.
    expect(langRedirects(["es"]).find((r) => r.source === "/en")?.destination).toBe("/en/es");
  });

  it("reescribe el español hacia la ruta interna y redirige la interna a la visible", () => {
    // Dos reglas, la de hoteles primero: cada una ve el resultado de la anterior.
    expect(langRewrites().map((r) => r.destination)).toEqual(["/es/:hotel/:path*", "/es/nft/:path*"]);
    const toVisible = langRedirects(["es"]).find((r) => r.source.startsWith("/es/:hotel("));
    expect(toVisible).toMatchObject({ destination: "/:hotel", permanent: false });
    expect(toVisible!.source).toContain("com|br");
  });
});

describe("diccionarios", () => {
  it("portugués e inglés tienen las mismas claves que el español", () => {
    expect(keys(UI.pt)).toEqual(keys(UI.es));
    expect(keys(UI.en)).toEqual(keys(UI.es));
    expect(keys(ptPages)).toEqual(keys(esPages));
    expect(keys(enPages)).toEqual(keys(esPages));
  });

  it("los textos cambian de idioma de verdad", () => {
    expect(UI.es.nav.deals).toBe("Ofertas");
    expect(UI.en.nav.deals).toBe("Deals");
    expect(UI.pt.search.furniLabel).toBe("Buscar mobi");
    expect(describeRuleIn(UI.en, { mode: "below_avg", value: 20 })).toBe("20% or more below average");
    expect(describeRuleIn(UI.pt, { mode: "below_price", value: 500 })).toBe("por 500 créditos ou menos");
  });
});

describe("formatos por idioma", () => {
  it("números, porcentajes y dólares", () => {
    expect(getFormat("es").int(1234567)).toBe("1.234.567");
    expect(getFormat("en").int(1234567)).toBe("1,234,567");
    expect(getFormat("es").pct(0.123)).toBe("+12,3 %");
    expect(getFormat("en").pct(-0.5)).toBe("−50%");
    expect(getFormat("en").usd(0.29)).toBe("$0.29");
    expect(getFormat("en").usd(0.004)).toBe("< $0.01");
  });

  it("tiempo relativo y fechas cortas", () => {
    const now = Date.parse("2026-10-17T12:00:00Z");
    expect(getFormat("es").relative("2026-10-17T11:55:00Z", now)).toBe("hace 5 min");
    expect(getFormat("pt").relative("2026-10-17T09:00:00Z", now)).toBe("há 3 h");
    expect(getFormat("en").relative("2026-10-14T12:00:00Z", now)).toBe("3 days ago");
    expect(getFormat("en").relative(null, now)).toBe("never");
    expect(getFormat("pt").shortDate(Date.UTC(2026, 9, 17))).toBe("17 out");
    expect(getFormat("en").shortDate(Date.UTC(2026, 9, 17))).toBe("Oct 17");
  });
});

describe("fondo de estrellas", () => {
  /** Números "al azar" repetibles para la prueba. */
  function seeded(seed = 1) {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  it("ajusta la cantidad de estrellas al tamaño de la pantalla", () => {
    expect(starCount(375, 812)).toBe(36);
    expect(starCount(1920, 1080)).toBe(150);
    const e = new StarfieldEngine(seeded());
    e.resize(1280, 720);
    expect(e.stars).toHaveLength(starCount(1280, 720));
    e.resize(375, 812);
    expect(e.stars).toHaveLength(36);
  });

  it("al tocar una estrella explota en chispas y vuelve a aparecer en otro lado", () => {
    const e = new StarfieldEngine(seeded(7));
    e.resize(800, 600);
    const star = e.stars[0];
    const { x, y } = star;
    expect(e.explodeAt(x, y)).toBeGreaterThan(0);
    expect(e.sparks.length).toBeGreaterThanOrEqual(14);
    const rings = e.rings.length;
    expect(e.explodeAt(-500, -500)).toBe(0); // lejos de todo: no explota nada
    expect(e.rings).toHaveLength(rings);
    expect(star.wait).toBeGreaterThan(0);
    expect(star.fade).toBe(0);
    // Las chispas se apagan solas y la estrella reaparece.
    for (let i = 0; i < 300; i++) e.step(1);
    expect(e.sparks).toHaveLength(0);
    expect(e.rings).toHaveLength(0);
    expect(star.wait).toBeLessThanOrEqual(0);
    expect(star.fade).toBeGreaterThan(0.9);
  });

  it("las estrellas siguen dentro de la pantalla y se dibujan líneas solo hacia las cercanas", () => {
    const e = new StarfieldEngine(seeded(3));
    e.resize(400, 300);
    for (let i = 0; i < 2000; i++) e.step(2);
    for (const s of e.stars) {
      expect(s.x).toBeGreaterThanOrEqual(-5);
      expect(s.x).toBeLessThanOrEqual(405);
      expect(s.y).toBeGreaterThanOrEqual(-5);
      expect(s.y).toBeLessThanOrEqual(305);
    }
    const links = e.links(200, 150);
    expect(links.every((l) => l.strength > 0 && l.strength <= 1)).toBe(true);
    expect(links.every((l) => Math.hypot(l.star.x - 200, l.star.y - 150) < 150)).toBe(true);
  });
});
