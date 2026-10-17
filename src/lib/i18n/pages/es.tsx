import type { ReactNode } from "react";

/** Textos de las páginas (solo se usan en el servidor). */
export const es = {
  meta: {
    title: "Furnímetro — precios del Marketplace",
    template: "%s · Furnímetro",
    description:
      "Precios, ofertas abiertas, promedios e historial del Marketplace de furnis, con datos de la API pública de Habbo. Sitio de fans no oficial.",
    nftTitle: "NFT de Habbo — precios y ventas",
    nftTemplate: "%s · NFT · Furnímetro",
    nftDescription:
      "Precios piso, ventas y tendencias de los coleccionables NFT oficiales de Habbo en la blockchain Immutable. Sección separada del Marketplace de créditos.",
  },
  header: { homeAria: "Furnímetro, inicio", nftHomeAria: "Furnímetro NFT, inicio" },
  footer: {
    about: (
      <>
        <strong className="text-text">Furnímetro</strong> es un sitio de fans, sin fines comerciales. No es oficial y no está
        afiliado, patrocinado ni aprobado por Sulake Oy ni por Azerion. Habbo es una marca registrada de Sulake Oy.
      </>
    ),
    data: "Precios y estadísticas: API pública de Habbo. Íconos de furnis: servidos directamente por el CDN de Habbo. Los datos pueden tener demoras o errores; no los uses como única referencia para comprar o vender.",
    linkAbout: "Qué datos son reales y sus límites",
    linkAlerts: "Alertas de precio",
    linkSource: "Código fuente",
  },
  notFound: {
    title: "No encontramos esa página",
    body: "Puede que el furni no sea intercambiable o que el enlace esté mal escrito.",
    back: "Volver al inicio",
  },
  loading: "Cargando",
  channels: {
    title: "Recibí las ofertas en tu celular",
    note: "Unite con un toque: ahí publicamos las ofertas más fuertes que detecta cada escaneo.",
    aria: "Canales de avisos",
    discord: "Unite al Discord",
    telegram: "Unite al canal de Telegram",
    whatsapp: "Seguí el canal de WhatsApp",
  },
  home: {
    kicker: (label: string, region: string) => `Marketplace · hotel ${label} (${region})`,
    title: "Precios de furnis, ofertas y tendencias del Marketplace",
    intro:
      "Buscá cualquier furni intercambiable para ver su precio mínimo publicado, cuántos hay en venta, su promedio y la evolución de su precio.",
    lastScan: "Rankings: último escaneo",
    consulted: (n: string) => ` (${n} furnis consultados)`,
    liveNote: ". Ficha de cada furni: consulta en vivo a la API de Habbo.",
    howFresh: "¿Qué tan actuales son los datos?",
    noScans: "Todavía no hay escaneos guardados para este hotel.",
    noData:
      "Este hotel todavía no tiene datos del recolector, así que no hay rankings. La búsqueda y la ficha de cada furni funcionan igual, con datos en vivo, una vez que se descargue el catálogo.",
    summaryAria: "Resumen del mercado",
    active: "Furnis con actividad",
    activeSub: "ventas en 30 días u ofertas",
    withOffers: "Con ofertas abiertas",
    sold: "Unidades vendidas",
    last7: "últimos 7 días",
    credits: "Créditos movidos",
    bestSellers: "Más vendidos",
    bestSellersHint: "Unidades en los últimos 7 días",
    noSales: "Sin ventas registradas todavía.",
    deals: "Ofertas detectadas",
    dealsHint: "Precio mínimo muy por debajo del promedio",
    seeDeals: "Ver ofertas",
    noDeals: "Ninguna oferta fuerte en el último escaneo.",
    ups: "Mayores subas",
    downs: "Mayores bajas",
    changeHint: "Promedio de 7 días vs. semana anterior",
    noUps: "Sin subas con volumen suficiente.",
    noDowns: "Sin bajas con volumen suficiente.",
  },
  list: {
    metric: {
      s7: "Vendidos 7 d",
      c7: "Créditos 7 d",
      change: "Variación",
      ref: "Promedio",
      oo: "En venta",
      pct: "Bajo el promedio",
    },
    empty: "Todavía no hay datos suficientes para esta lista.",
    colFurni: "Furni",
    colMin: "Precio mínimo",
    colForSale: "En venta",
    colAvg7: "Promedio 7 d",
    col30: "30 días",
  },
  rankings: {
    metaTitle: "Rankings",
    title: (label: string) => `Rankings de ${label}`,
    computedA: "Calculados con el último escaneo (",
    computedB: "). Cada furni muestra el dato de su propio último escaneo.",
    noScans: "Todavía no hay escaneos guardados.",
    kindAria: "Tipo de ranking",
    noData: "Este hotel todavía no tiene datos del recolector.",
    kinds: {
      vendidos: { title: "Más vendidos", hint: "Unidades vendidas en los últimos 7 días." },
      volumen: { title: "Más créditos movidos", hint: "Créditos gastados en ventas en los últimos 7 días." },
      subas: { title: "Mayores subas", hint: "Promedio de los últimos 7 días contra los 7 anteriores (mínimo 5 ventas en cada semana)." },
      bajas: { title: "Mayores bajas", hint: "Promedio de los últimos 7 días contra los 7 anteriores (mínimo 5 ventas en cada semana)." },
      caros: { title: "Más caros", hint: "Precio promedio de venta más alto (con al menos 1 venta en 30 días)." },
      ofertados: { title: "Más publicados", hint: "Cantidad de ofertas abiertas al momento del escaneo." },
    },
  },
  deals: {
    metaTitle: "Ofertas detectadas",
    title: (label: string) => `Ofertas detectadas en ${label}`,
    intro: (o: { pct: number; sold7: number; sold30: number; ref: number }) =>
      `Furnis cuyo precio mínimo publicado estaba al menos un ${o.pct} % por debajo de lo que se pagó en la última semana. Solo cuentan furnis con ventas recientes (${o.sold7} o más en 7 días y ${o.sold30} o más en 30), de ${o.ref} créditos o más, y sin exceso de ofertas (si hay más publicados que ventas, el precio bajo no es una ganga: es que nadie compra).`,
    notice: (
      <>
        La API de Habbo informa el precio mínimo y la cantidad de ofertas en el momento de la consulta, no cada publicación por
        separado. Una oferta de esta lista puede haberse vendido después del escaneo: usá <strong>Verificar en vivo</strong>{" "}
        antes de entrar al juego.
      </>
    ),
    channelsTitle: "Que te lleguen estas ofertas",
    forYourList: "Detectadas para tu lista",
    configure: "Configurar alertas",
  },
  alerts: {
    metaTitle: "Alertas de precio",
    title: "Alertas de precio",
    intro:
      "Elegí los furnis que te interesan y te avisamos cuando alguien los publique barato: por debajo de lo que se suele pagar, o al precio que vos digas.",
    how: (
      <>
        <strong className="text-text">Cómo funciona.</strong> Cada pocos minutos miramos el precio más barato publicado de cada
        furni de tu lista. Si cumple tu condición, te avisamos. Si alguien lo publica barato y otro lo compra antes de que
        volvamos a mirar, ese aviso no llega.
      </>
    ),
    channelsTitle: "¿Preferís Discord, Telegram o WhatsApp?",
    channelsNote: "Unite con un toque. Ahí publicamos para todos las ofertas más fuertes de cada escaneo (no tu lista personal).",
  },
  item: {
    notFoundTitle: "Furni no encontrado",
    metaDesc: (name: string, label: string) =>
      `Precio mínimo, ofertas abiertas, promedio e historial de ${name} en el Marketplace de ${label}.`,
    catalogPending: "Todavía no se descargó el catálogo de este hotel. Volvé en un rato.",
    breadcrumb: "Ruta",
    home: "Inicio",
    wall: "De pared",
    floor: "De suelo",
    line: (l: string) => `Línea: ${l}`,
    hotel: (label: string) => `Hotel ${label}`,
    otherHotels: "Ver en otros hoteles:",
    ownEconomy: "(cada hotel tiene su propia economía)",
    loadingAria: "Cargando furni",
    category: {
      chair: "Asiento",
      table: "Mesa",
      lighting: "Iluminación",
      divider: "Separador",
      gate: "Puerta",
      bed: "Cama",
      rug: "Alfombra",
      shelf: "Estante",
      wired: "Wired",
      games: "Juegos",
      pets: "Mascotas",
      trophy: "Trofeo",
      music: "Música",
      floor: "Piso",
      wall_decoration: "Decoración de pared",
      other: "Otros",
    } as Record<string, string>,
  },
  search: {
    metaTitle: "Buscar furni",
    title: "Buscar furni",
    nftMetaTitle: "Buscar NFT",
    nftTitle: "Buscar NFT",
    min2: "Escribí al menos 2 letras.",
    none: (q: string) => `No encontramos furnis intercambiables para «${q}».`,
    noneNft: (q: string) => `No encontramos NFT para «${q}».`,
    first60: "Primeros 60 resultados",
    results: (n: number) => `${n} resultados`,
    forQ: (q: string) => ` para «${q}»`,
    noOpenOffers: "sin ofertas abiertas",
    noMarket: "sin datos de mercado todavía",
    floor: (v: string) => `piso ${v}`,
    noListings: "sin publicaciones",
    sales7: (n: string) => `${n} ventas en 7 d`,
  },
  about: {
    metaTitle: "Datos y límites",
    title: "Qué datos son reales y cuáles son sus límites",
    sourcesTitle: "De dónde salen los datos",
    sources: (
      <>
        <p>
          Todo sale de la <strong>API pública y documentada de Habbo</strong> (endpoint de estadísticas del Marketplace,
          documentado en su Swagger oficial) y del <strong>furnidata</strong> público de cada hotel, que trae los nombres y la
          lista de furnis intercambiables. No se usan cuentas, contraseñas ni datos de usuarios, y no se lee la web del juego.
        </p>
        <p>
          Los íconos de los furnis se muestran directo desde el servidor de imágenes de Habbo; este sitio no los copia ni los
          aloja.
        </p>
      </>
    ),
    freshTitle: "Qué tan actual es cada dato",
    fresh: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Ficha de un furni:</strong> tu navegador consulta la API en el momento (precio mínimo publicado, ofertas
          abiertas y los últimos 30 días de ventas). Se reutiliza la respuesta durante 1 minuto.
        </li>
        <li>
          <strong>Historial por día:</strong> Habbo lo da agrupado por día y hasta el día anterior; el día de hoy todavía no
          aparece.
        </li>
        <li>
          <strong>Rankings y ofertas detectadas:</strong> salen del recolector, que consulta el catálogo de a partes. Cada furni
          muestra el dato de su último escaneo; los más activos se actualizan más seguido.
        </li>
        <li>
          <strong>Historial de más de 30 días y del precio mínimo publicado:</strong> lo va guardando este sitio desde que
          empezó a recolectar; antes de esa fecha no hay datos.
        </li>
      </ul>
    ),
    scanLine: (label: string, ago: ReactNode, scanned: string, requests: string, catalog: string) => (
      <>
        Hotel {label}: última corrida {ago}, con {scanned} furnis consultados en {requests} pedidos. Catálogo: {catalog} furnis
        intercambiables.
      </>
    ),
    limitsTitle: "Límites que conviene saber",
    limits: (label: string) => (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>No es tiempo real de cada publicación.</strong> La API informa el precio más bajo publicado y cuántas ofertas
          hay en el momento de la consulta. No muestra cada oferta, ni quién la publicó, ni a qué hora.
        </li>
        <li>
          <strong>La API limita los pedidos</strong> (medimos unos 15 a 20 por minuto por conexión, con hasta 25 + 25 furnis por
          pedido). Por eso el recolector va despacio y recorre el catálogo de a partes.
        </li>
        <li>
          <strong>Promedios:</strong> el promedio de 7 días es ponderado por unidades vendidas. Con pocas ventas, un solo precio
          raro lo puede mover mucho; las subas y bajas piden al menos 5 ventas por semana.
        </li>
        <li>Cada hotel tiene su propia economía: los precios de {label} no se comparan con los de otros hoteles.</li>
        <li>Los datos pueden tener errores o demoras. No los uses como única referencia para comprar o vender.</li>
      </ul>
    ),
    privacyTitle: "Privacidad",
    privacy:
      "Tu lista de alertas y las ofertas detectadas se guardan solo en tu navegador. El sitio no usa cuentas ni cookies de seguimiento (solo recuerda el idioma que elegiste). Las consultas en vivo van desde tu navegador directo a la API de Habbo, sin enviar cookies.",
    legalTitle: "Aviso legal",
    legal:
      "Furnímetro es un sitio de fans, gratuito y sin fines comerciales. No es oficial y no está afiliado, patrocinado ni aprobado por Sulake Oy ni por Azerion. Habbo y los nombres e imágenes de los furnis son propiedad de Sulake Oy. Si Sulake pide retirar algún contenido, se retira.",
  },
  nft: {
    banner: (marketLink: ReactNode) => (
      <>
        <strong className="text-text">Sección NFT</strong>: coleccionables oficiales de Habbo en la blockchain Immutable, que se
        compran con criptomonedas (precios en dólares). No son los furnis del Marketplace del juego: para eso andá a {marketLink}.
      </>
    ),
    marketLink: "Marketplace (créditos)",
    footerData:
      "Datos de la API pública de Immutable zkEVM; imágenes servidas por Habbo (nft-tokens.habbo.com). Furnímetro no es oficial ni está afiliado a Sulake Oy, Azerion ni Immutable.",
    footerRisk:
      "Esto no es asesoramiento financiero. Los precios de los NFT cambian rápido y pueden bajar a cero; los dólares son aproximados según la cotización del momento.",
    collections: {
      furni: "Furnis NFT",
      ropa: "Ropa NFT",
      mascotas: "Mascotas NFT",
      tokens: "Tokens NFT",
      addons: "Add-ons NFT",
    },
    home: {
      kicker: "NFT · blockchain Immutable zkEVM",
      title: "Precios y ventas de los NFT oficiales de Habbo",
      intro:
        "Furnis, ropa, mascotas, tokens y add-ons coleccionables: precio piso (la publicación más barata), mejor oferta de compra, ventas de la semana y evolución del precio, en dólares.",
      lastScan: "Último escaneo",
      rate: (v: string) => `Cotización usada: 1 ETH ≈ ${v}.`,
      liveNote: "La ficha de cada NFT se consulta en vivo.",
      where: "¿De dónde salen los datos?",
      noScans: "Todavía no hay escaneos guardados de la sección NFT.",
      noData: "La sección NFT todavía no tiene datos del recolector.",
      summaryAria: "Resumen NFT",
      listed: "Modelos a la venta",
      sales: "Ventas",
      last7: "últimos 7 días",
      volume: "Dólares movidos",
      models: "Modelos con datos",
      modelsSub: "a la venta o vendidos en 30 días",
      collectionsTitle: "Colecciones",
      collectionsHint: "Las 5 colecciones oficiales de Habbo en Immutable",
      colListed: (n: string, floor: string) => `${n} a la venta · desde ${floor}`,
      colSales: (n: string, v: string) => `${n} ventas · ${v} en 7 días`,
      bestSellers: "Más vendidos",
      bestSellersHint: "Unidades en los últimos 7 días",
      noSales: "Sin ventas registradas todavía.",
      deals: "Ofertas",
      dealsHint: "Piso muy por debajo del promedio semanal",
      noDeals: "Ninguna oferta fuerte en el último escaneo.",
      ups: "Mayores subas",
      downs: "Mayores bajas",
      changeHint: "Promedio de 7 días vs. semana anterior",
      needWeek: "Hace falta una semana más de datos.",
    },
    list: {
      metric: {
        s7: "Vendidos 7 d",
        v7: "USD 7 d",
        change: "Variación",
        floor: "Precio piso",
        discount: "Bajo el promedio",
        a30: "Promedio 30 d",
      },
      floor: (v: string) => `piso ${v}`,
      noListings: "sin publicaciones",
      empty: "Todavía no hay datos suficientes para esta lista.",
      colFloor: "Precio piso",
      colAvg7: "Promedio 7 d",
      colSold7: "Vendidos 7 d",
      col30: "30 días",
    },
    rankings: {
      metaTitle: "Rankings",
      title: "Rankings NFT",
      collectionMeta: "Colección",
      lastScan: "Último escaneo",
      prices: ". Precios en dólares (aproximados).",
      noScans: "Todavía no hay escaneos guardados.",
      kindAria: "Tipo de ranking",
      kinds: {
        vendidos: { title: "Más vendidos", hint: "Unidades vendidas en los últimos 7 días." },
        volumen: { title: "Más dólares movidos", hint: "Total pagado en ventas en los últimos 7 días (USD)." },
        subas: {
          title: "Mayores subas",
          hint: "Precio promedio de venta de 7 días contra los 7 anteriores (mínimo 3 ventas en cada semana).",
        },
        bajas: {
          title: "Mayores bajas",
          hint: "Precio promedio de venta de 7 días contra los 7 anteriores (mínimo 3 ventas en cada semana).",
        },
        ofertas: {
          title: "Ofertas",
          hint: "Precio piso al menos 30 % por debajo de lo que se pagó en promedio esta semana (con 3 o más ventas).",
        },
        caros: {
          title: "Más caros",
          hint: "Precio promedio de venta más alto en 30 días (con 2 o más ventas). Se usa la venta real y no el piso, porque hay publicaciones a precios absurdos que nadie compra.",
        },
      },
    },
    item: {
      notFoundTitle: "NFT no encontrado",
      metaDesc: (name: string) => `Precio piso, ventas e historial del NFT ${name} de Habbo en Immutable.`,
      origin: (s: string) => `Origen: ${s}`,
      set: (s: string) => `Set: ${s}`,
      supply: (n: string) => `Existen ${n}`,
      buy: (link: ReactNode) => (
        <>
          Este NFT se compra y vende con criptomonedas en el marketplace de Immutable (por ejemplo desde {link}). No se consigue
          con créditos del juego.
        </>
      ),
    },
    about: {
      metaTitle: "Datos y límites",
      title: "Sección NFT: de dónde salen los datos",
      whatTitle: "Qué es esta sección",
      what: (marketLink: ReactNode) => (
        <p>
          Muestra los <strong>coleccionables NFT oficiales de Habbo</strong>, que viven en la blockchain{" "}
          <strong>Immutable zkEVM</strong> y se compran y venden con criptomonedas. Es independiente del {marketLink}, donde los
          furnis se pagan con créditos. Los precios de una sección no se pueden comparar con los de la otra.
        </p>
      ),
      marketLink: "Marketplace del juego",
      sourcesTitle: "Fuentes",
      sources: (eth: string | null) => (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>API pública de Immutable zkEVM</strong> (sin claves ni cuentas): modelos a la venta, precio piso, mejores
            ofertas de compra, última venta y el historial de ventas de cada colección. Respetamos su límite publicado de 5
            pedidos por segundo.
          </li>
          <li>
            <strong>Cotizaciones</strong> ETH, IMX y USDC a dólares: servicio de conversión de Immutable.
            {eth ? ` En el último escaneo, 1 ETH ≈ ${eth}.` : ""}
          </li>
          <li>
            <strong>Imágenes</strong>: servidas directamente por Habbo desde nft-tokens.habbo.com.
          </li>
        </ul>
      ),
      included: "Colecciones incluidas:",
      freshTitle: "Qué tan actual es cada dato",
      fresh: (ago: ReactNode) => (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Ficha de un NFT:</strong> el precio piso, la mejor oferta y las publicaciones se consultan en vivo desde tu
            navegador.
          </li>
          <li>
            <strong>Rankings y ventas por día:</strong> salen del recolector{ago ? <> (último escaneo {ago})</> : null}. Las
            ventas se guardan desde que empezó a correr; el primer escaneo cargó las de los 14 días anteriores.
          </li>
          <li>
            <strong>Dólares:</strong> las ventas se pagan en ETH (o IMX/USDC) y se pasan a dólares con la cotización del momento
            del escaneo, así que son aproximados.
          </li>
        </ul>
      ),
      limitsTitle: "Límites",
      limits: (
        <ul className="list-disc space-y-1 pl-5">
          <li>Solo las colecciones de Immutable zkEVM. Las de la red anterior (Immutable X) ya no están disponibles en su API.</li>
          <li>Los avatares NFT de Habbo en Ethereum no se incluyen: sus datos requieren servicios con clave de acceso.</li>
          <li>Hay publicaciones a precios absurdos que nadie compra: por eso «Más caros» usa ventas reales, no el piso.</li>
          <li>Las ventas entre billeteras de la misma persona o con precios raros también cuentan en los promedios.</li>
        </ul>
      ),
      noticeTitle: "Aviso",
      notice:
        "Esto no es asesoramiento financiero. Los NFT son activos volátiles: su precio puede cambiar mucho o llegar a cero. Furnímetro no vende, no compra y no custodia nada; solo muestra datos públicos. No es un sitio oficial de Habbo, Sulake, Azerion ni Immutable.",
    },
  },
};

export type Pages = typeof es;
