/**
 * Íconos de furnis servidos por el CDN público de Habbo (no se copian ni se
 * alojan en este sitio). Formato verificado:
 *   https://images.habbo.com/dcr/hof_furni/<revision>/<classname>_icon.png
 * Las variantes de color usan "_" en lugar de "*": rare_dragonlamp*1 -> rare_dragonlamp_1_icon.png
 */
export function furniIconUrl(classname: string, revision: number): string | null {
  if (process.env.NEXT_PUBLIC_FURNI_IMAGES === "off") return null;
  if (!classname || !Number.isFinite(revision) || revision <= 0) return null;
  const file = `${classname.replace(/\*/g, "_")}_icon.png`;
  return `https://images.habbo.com/dcr/hof_furni/${revision}/${encodeURIComponent(file)}`;
}
