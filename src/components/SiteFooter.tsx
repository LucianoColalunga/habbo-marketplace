import Link from "next/link";

export function SiteFooter({ hotel }: { hotel: string }) {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-text-2 md:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <p>
            <strong className="text-text">Furnímetro</strong> es un sitio de fans, sin fines comerciales. No es oficial y no
            está afiliado, patrocinado ni aprobado por Sulake Oy ni por Azerion. Habbo es una marca registrada de Sulake Oy.
          </p>
          <p className="text-muted">
            Precios y estadísticas: API pública de Habbo. Íconos de furnis: servidos directamente por el CDN de Habbo. Los datos
            pueden tener demoras o errores; no los uses como única referencia para comprar o vender.
          </p>
        </div>
        <ul className="space-y-1 md:text-right">
          <li>
            <Link className="hover:text-text" href={`/${hotel}/acerca`}>
              Qué datos son reales y sus límites
            </Link>
          </li>
          <li>
            <Link className="hover:text-text" href={`/${hotel}/alertas`}>
              Alertas de precio
            </Link>
          </li>
          <li>
            <a className="hover:text-text" href="https://github.com/LucianoColalunga/habbo-marketplace" rel="noopener">
              Código fuente
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
