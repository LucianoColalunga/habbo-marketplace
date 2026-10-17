"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getFormat } from "@/lib/format";
import { localePath, type Lang } from "./config";
import { UI } from "./ui";

const LangContext = createContext<Lang>("es");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Textos, formatos y enlaces en el idioma de la página (componentes del navegador). */
export function useI18n() {
  const lang = useContext(LangContext);
  return { lang, t: UI[lang], f: getFormat(lang), href: (path: string) => localePath(lang, path) };
}
