import { lang as rootLang } from "next/root-params";
import { getFormat } from "@/lib/format";
import { isLang, localePath, type Lang } from "./config";
import { en } from "./pages/en";
import { es } from "./pages/es";
import { pt } from "./pages/pt";
import { UI } from "./ui";

const PAGES = { es, pt, en };

/** Idioma de la página actual (sale del primer segmento de la ruta). */
export async function currentLang(): Promise<Lang> {
  const raw = await rootLang();
  return isLang(raw) ? raw : "es";
}

/** Todo lo que necesita un componente del servidor para mostrar textos en el idioma de la página. */
export async function getI18n() {
  const lang = await currentLang();
  return i18nFor(lang);
}

export function i18nFor(lang: Lang) {
  return {
    lang,
    p: PAGES[lang],
    t: UI[lang],
    f: getFormat(lang),
    href: (path: string) => localePath(lang, path),
  };
}
