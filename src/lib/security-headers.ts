import { HOTELS } from "./hotels";

/**
 * Encabezados de seguridad para todas las respuestas.
 *
 * La CSP solo permite cargar código y estilos del propio sitio, imágenes de los
 * CDN de Habbo (furnis y NFT) y conexiones a la API pública de los hoteles y a
 * la de Immutable (las consultas en vivo salen del navegador). 'unsafe-inline' en scripts hace falta porque las páginas
 * se prerenderizan estáticas y Next.js inserta scripts en línea para hidratar;
 * usar nonces obligaría a renderizar cada página en cada pedido. Igual no hay
 * HTML sin escapar en el sitio, y el resto de las directivas limita a dónde
 * puede conectarse o qué puede cargar un script inyectado.
 */
export function contentSecurityPolicy(dev: boolean): string {
  const hotelOrigins = Object.values(HOTELS).map((h) => `https://${h.domain}`);
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.habbo.com https://nft-tokens.habbo.com",
    "font-src 'self'",
    `connect-src 'self' ${hotelOrigins.join(" ")} https://api.immutable.com${dev ? " ws: wss:" : ""}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function securityHeaders(dev: boolean) {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(dev) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
