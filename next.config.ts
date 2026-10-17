import type { NextConfig } from "next";
import { parseHotelList } from "./src/lib/hotels";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // No generar archivos de instrucciones para herramientas externas en el repo.
  agentRules: false,
  cacheLife: {
    // Datos que salen del último escaneo guardado (rankings, resúmenes).
    // Lo que es "en vivo" se consulta desde el navegador, no pasa por esta caché.
    market: { stale: 300, revalidate: 600, expire: 86400 },
  },
  async redirects() {
    return [{ source: "/", destination: `/${parseHotelList(process.env.NEXT_PUBLIC_HOTELS)[0]}`, permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
