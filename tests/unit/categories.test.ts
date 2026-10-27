import { describe, expect, it } from "vitest";
import { compactFurnidata, type CatalogItem } from "@/lib/habbo/furnidata";
import { buildCategoryIndex, CATEGORIES, lineLabel, matchCategories, subcategoriesOf } from "@/lib/market/categories";
import { sitemapPages } from "@/lib/i18n/sitemap";

function item(k: string, n: string, extra: Partial<CatalogItem> = {}): CatalogItem {
  return { k, n, t: "r", d: "", r: 1, c: "other", l: "", ...extra };
}

const items: CatalogItem[] = [
  item("sofa_silo", "Sofá Área Doble", { c: "chair", f: 1, l: "area" }),
  item("chair_norja", "Silla Norja", { c: "chair", f: 1, l: "norja" }),
  item("sofachair_silo", "Sillón Área", { c: "chair", f: 1, l: "area" }),
  item("throne", "Trono", { f: 1 }),
  item("bed_polyfon", "Cama Doble", { c: "bed", f: 2 }),
  item("tile_red", "Pinturas", { c: "floor", f: 4 }),
  item("rare_dragonlamp*1", "Lámpara Dragón", { l: "rare" }),
  item("queue_tile1*3", "Habbo Roller Aqua", { c: "roller" }),
  item("wf_trg_says", "Disparador: dice algo", { c: "wired_trigger", l: "wired" }),
  item("xmas_c23_sofa", "Sofá Navideño", { f: 1 }),
  item("clothing_party1", "Sombrerito de Fiesta", { l: "clothing" }),
  item("test_thing", "Cosa de prueba"),
  item("poster_12", "Póster", { t: "w", c: "wall_decoration" }),
  ...Array.from({ length: 15 }, (_, i) => item(`pura_${i}`, `Pura ${i}`, { l: "pura" })),
];
const index = buildCategoryIndex(items);
const members = (path: string) => index.members[path] ?? [];

describe("categorías de furnis", () => {
  it("ubica cada furni por tipo, uso y línea", () => {
    expect(members("asientos")).toEqual(expect.arrayContaining(["sofa_silo", "chair_norja", "throne", "xmas_c23_sofa"]));
    expect(members("asientos/sofas")).toEqual(["sofa_silo", "xmas_c23_sofa"]);
    expect(members("asientos/sillones")).toEqual(["sofachair_silo"]);
    expect(members("asientos/tronos")).toEqual(["throne"]);
    expect(members("camas")).toEqual(["bed_polyfon"]);
    expect(members("pisos/baldosas")).toEqual(["tile_red"]);
    expect(members("rares/clasicos")).toEqual(["rare_dragonlamp*1"]);
    expect(members("iluminacion")).toContain("rare_dragonlamp*1");
    expect(members("wired/disparadores")).toEqual(["wf_trg_says"]);
    expect(members("temporadas/navidad")).toEqual(["xmas_c23_sofa"]);
    expect(members("ropa")).toEqual(["clothing_party1"]);
    expect(members("pared/cuadros")).toEqual(["poster_12"]);
  });

  it("en los hoteles en otros idiomas también usa el nombre en inglés", () => {
    const de = [item("ads_glow_c26", "Leuchtende Drachenstatue"), item("ads_glow_c27", "Kleiner Tisch")];
    expect(buildCategoryIndex(de).members.iluminacion).toBeUndefined();
    const english = new Map([
      ["ads_glow_c26", "Glowing Dragon Lamp"],
      ["ads_glow_c27", "Small Table"],
    ]);
    const withEnglish = buildCategoryIndex(de, (k) => english.get(k));
    expect(withEnglish.members.iluminacion).toEqual(["ads_glow_c26"]);
    expect(withEnglish.members["mesas/mesas"]).toEqual(["ads_glow_c27"]);
  });

  it("deja afuera los rollers de los pisos y los furnis de prueba", () => {
    expect(members("pisos")).not.toContain("queue_tile1*3");
    expect(Object.values(index.members).flat()).not.toContain("test_thing");
  });

  it("las colecciones salen de las líneas con suficientes furnis", () => {
    const col = CATEGORIES.find((c) => c.slug === "colecciones")!;
    expect(subcategoriesOf(index, col)).toEqual([{ slug: "pura", count: 15 }]);
    expect(members("colecciones/area")).toEqual([]);
    expect(lineLabel("iced_dark")).toBe("Iced Dark");
    expect(lineLabel("hhistory_2024")).toBe("Habbo History 2024");
  });

  it("el buscador entiende categorías en los tres idiomas", () => {
    expect(matchCategories(index, "sofás", "es")[0]).toMatchObject({ cat: "asientos", sub: "sofas", label: "Sofás", count: 2 });
    expect(matchCategories(index, "pisos", "pt")[0]).toMatchObject({ cat: "pisos", sub: null, label: "Pisos e tapetes" });
    expect(matchCategories(index, "beds", "en")[0]).toMatchObject({ cat: "camas", label: "Beds" });
    expect(matchCategories(index, "pura", "es")[0]).toMatchObject({ cat: "colecciones", sub: "pura", label: "Pura" });
    expect(matchCategories(index, "xy", "es")).toEqual([]);
  });

  it("el catálogo guarda los usos y el ambiente de cada furni", () => {
    const c = compactFurnidata(
      {
        roomitemtypes: {
          furnitype: [
            { classname: "sofa_silo", name: "Sofá", tradeable: true, cansiton: true, canputstuffon: true, environment: "" },
            { classname: "ktchn_oven", name: "Horno", tradeable: true, environment: "kitchen" },
          ],
        },
      },
      "es",
      "h",
      "2026-10-19T00:00:00Z",
    );
    expect(c.schema).toBe(2);
    expect(c.items[0]).toMatchObject({ k: "sofa_silo", f: 1 | 8 });
    expect(c.items[0].e).toBeUndefined();
    expect(c.items[1]).toMatchObject({ k: "ktchn_oven", e: "kitchen" });
    expect(c.items[1].f).toBeUndefined();
  });

  it("las categorías van al sitemap (con un tope de colecciones)", () => {
    const paths = sitemapPages({
      hotels: ["es"],
      furni: {},
      nft: { ids: [], generatedAt: null },
      categories: { es: [{ slug: "asientos", subs: [{ slug: "sofas" }] }] },
    }).map((p) => p.path);
    expect(paths).toEqual(expect.arrayContaining(["/es/categorias", "/es/categorias/asientos", "/es/categorias/asientos/sofas"]));
  });
});
