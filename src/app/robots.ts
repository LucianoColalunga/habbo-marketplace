import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** /robots.txt: todo el sitio se puede indexar menos la API, las búsquedas internas y la página del dueño. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/*/buscar", "/*/alertas/servidor"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
