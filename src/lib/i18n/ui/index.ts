import type { WatchRule } from "@/lib/alerts/rules";
import type { Lang } from "../config";
import { en } from "./en";
import { es, type Ui } from "./es";
import { pt } from "./pt";

export type { Ui };

export const UI: Record<Lang, Ui> = { es, pt, en };

/** "20 % o más por debajo del promedio" en el idioma de la página. */
export function describeRuleIn(t: Ui, rule: Pick<WatchRule, "mode" | "value">): string {
  return rule.mode === "below_avg" ? t.rules.avg(rule.value) : t.rules.price(rule.value);
}
