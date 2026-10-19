import type { Pages } from "./es";

export const pt: Pages = {
  meta: {
    title: "Bomhams Market — preços do Marketplace",
    template: "%s · Bomhams Market",
    description:
      "Preços, ofertas abertas, médias e histórico do Marketplace de mobis, com dados da API pública do Habbo. Site de fãs não oficial.",
    nftTitle: "NFT do Habbo — preços e vendas",
    nftTemplate: "%s · NFT · Bomhams Market",
    nftDescription:
      "Preço mínimo, vendas e tendências dos colecionáveis NFT oficiais do Habbo na blockchain Immutable. Seção separada do Marketplace de créditos.",
  },
  seo: {
    ogAltMarket: "Bomhams Market: preços do Marketplace do Habbo",
    ogAltNft: "Bomhams Market: preços dos NFT oficiais do Habbo",
    home: (label) => `Preços do Marketplace do Habbo ${label}`,
    homeDesc: (label, region) =>
      `Menor preço, ofertas abertas, médias e histórico dos mobis do Marketplace do Habbo ${label} (${region}). Rankings e ofertas detectadas todos os dias.`,
    rankings: (kind, label) => `${kind} do Marketplace do Habbo ${label}`,
    rankingsDesc: (hint, label) => `${hint} Ranking de mobis do Marketplace do Habbo ${label}, atualizado a cada varredura.`,
    deals: (label) => `Ofertas de mobis no Habbo ${label}`,
    dealsDesc: (label) =>
      `Mobis anunciados bem abaixo do que costuma ser pago no Marketplace do Habbo ${label}, com verificação ao vivo.`,
    alerts: (label) => `Alertas de preço de mobis no Habbo ${label}`,
    alertsDesc: "Escolha mobis e receba um aviso quando alguém anunciar barato no Marketplace do Habbo. Grátis e sem conta.",
    about: (label) => `Dados e limites do Marketplace do Habbo ${label}`,
    aboutDesc: "De onde vêm os preços (API pública do Habbo), quão atuais são e quais limites têm.",
    furni: (name, label) => `${name}: preço no Habbo ${label}`,
    categories: (label) => `Categorias de mobis do Habbo ${label}`,
    categoriesDesc: (label) =>
      `Mobis do Marketplace do Habbo ${label} por tipo, uso ou coleção: assentos, pisos, iluminação, raros, wired e mais, com o preço.`,
    category: (cat, label) => `${cat}: preços no Habbo ${label}`,
    categoryDesc: (cat, label, n) => `Menor preço, ofertas abertas e vendas de ${n} mobis de «${cat}» no Marketplace do Habbo ${label}.`,
    nftHome: "Preços dos NFT oficiais do Habbo",
    nftCollection: (name) => `${name}: preços e vendas`,
    nftCollectionDesc: (name) =>
      `Preço mínimo, vendas da semana e rankings de ${name} do Habbo na blockchain Immutable, em dólares.`,
    nftRanking: (kind) => `NFT do Habbo: ${kind}`,
    nftRankingDesc: (hint) => `${hint} NFT oficiais do Habbo na blockchain Immutable.`,
    nftAboutDesc: "De onde vêm os preços dos NFT do Habbo (API pública da Immutable), quão atuais são e quais limites têm.",
  },
  header: { homeAria: "Bomhams Market, início", nftHomeAria: "Bomhams Market NFT, início" },
  footer: {
    about: (
      <>
        <strong className="text-text">Bomhams Market</strong> é um site de fãs, sem fins comerciais. Não é oficial e não é afiliado,
        patrocinado nem aprovado pela Sulake Oy nem pela Azerion. Habbo é uma marca registrada da Sulake Oy.
      </>
    ),
    data: "Preços e estatísticas: API pública do Habbo. Ícones dos mobis: servidos diretamente pelo CDN do Habbo. Os dados podem ter atrasos ou erros; não use como única referência para comprar ou vender.",
    linkAbout: "Quais dados são reais e seus limites",
    linkAlerts: "Alertas de preço",
    linkSource: "Código-fonte",
    linkPrivacy: "Privacidade e cookies",
    linkX: "Bomhams no X",
  },
  notFound: {
    title: "Não encontramos essa página",
    body: "Talvez o mobi não seja negociável ou o link esteja errado.",
    back: "Voltar ao início",
  },
  loading: "Carregando",
  channels: {
    title: "Receba as ofertas no seu celular",
    note: "Entre com um toque: lá publicamos as ofertas mais fortes que cada varredura encontra.",
    aria: "Canais de avisos",
    discord: "Entre no Discord",
    telegram: "Entre no canal do Telegram",
    whatsapp: "Siga o canal do WhatsApp",
  },
  home: {
    kicker: (label, region) => `Marketplace · hotel ${label} (${region})`,
    title: "Preços de mobis, ofertas e tendências do Marketplace",
    intro:
      "Busque qualquer mobi negociável para ver o menor preço anunciado, quantos estão à venda, a média e a evolução do preço.",
    lastScan: "Rankings: última varredura",
    consulted: (n) => ` (${n} mobis consultados)`,
    liveNote: ". Página de cada mobi: consulta ao vivo à API do Habbo.",
    howFresh: "Quão atuais são os dados?",
    noScans: "Ainda não há varreduras salvas para este hotel.",
    noData:
      "Este hotel ainda não tem dados do coletor, então não há rankings. A busca e a página de cada mobi funcionam normalmente, com dados ao vivo, assim que o catálogo for baixado.",
    summaryAria: "Resumo do mercado",
    active: "Mobis com atividade",
    activeSub: "vendas em 30 dias ou ofertas",
    withOffers: "Com ofertas abertas",
    sold: "Unidades vendidas",
    last7: "últimos 7 dias",
    credits: "Créditos movimentados",
    bestSellers: "Mais vendidos",
    bestSellersHint: "Unidades nos últimos 7 dias",
    noSales: "Ainda sem vendas registradas.",
    deals: "Ofertas detectadas",
    dealsHint: "Menor preço bem abaixo da média",
    seeDeals: "Ver ofertas",
    noDeals: "Nenhuma oferta forte na última varredura.",
    ups: "Maiores altas",
    downs: "Maiores quedas",
    changeHint: "Média de 7 dias vs. semana anterior",
    noUps: "Sem altas com volume suficiente.",
    noDowns: "Sem quedas com volume suficiente.",
  },
  list: {
    metric: {
      s7: "Vendidos 7 d",
      c7: "Créditos 7 d",
      change: "Variação",
      ref: "Média",
      oo: "À venda",
      pct: "Abaixo da média",
    },
    empty: "Ainda não há dados suficientes para esta lista.",
    colFurni: "Mobi",
    colMin: "Menor preço",
    colForSale: "À venda",
    colAvg7: "Média 7 d",
    col30: "30 dias",
  },
  categories: {
    title: (label) => `Categorias do ${label}`,
    intro: "Explore os mobis por tipo, uso ou coleção. Cada categoria tem subcategorias: em Assentos, por exemplo, estão os sofás, as cadeiras e os tronos.",
    count: (n) => `${n} mobis`,
    all: "Todos",
    index: "Categorias",
    breadcrumb: "Caminho",
    subsAria: "Subcategorias",
    limited: (shown, total) => `Mostramos os ${shown} mais vendidos de ${total}. Escolha uma subcategoria ou use a busca para ver o resto.`,
    empty: "Ainda não há mobis nesta categoria.",
    pending: "O catálogo deste hotel ainda não foi baixado. Volte daqui a pouco.",
    collectionsHint: "Cada linha de mobis do jogo, como Pura, Iced ou Mode.",
    homeTitle: "Explore por categoria",
    homeHint: "Assentos, pisos, iluminação, raros, wired e mais",
  },
  rankings: {
    metaTitle: "Rankings",
    title: (label) => `Rankings do ${label}`,
    computedA: "Calculados com a última varredura (",
    computedB: "). Cada mobi mostra o dado da sua própria última varredura.",
    noScans: "Ainda não há varreduras salvas.",
    kindAria: "Tipo de ranking",
    noData: "Este hotel ainda não tem dados do coletor.",
    kinds: {
      vendidos: { title: "Mais vendidos", hint: "Unidades vendidas nos últimos 7 dias." },
      volumen: { title: "Mais créditos movimentados", hint: "Créditos gastos em vendas nos últimos 7 dias." },
      subas: { title: "Maiores altas", hint: "Média dos últimos 7 dias contra os 7 anteriores (mínimo de 5 vendas em cada semana)." },
      bajas: { title: "Maiores quedas", hint: "Média dos últimos 7 dias contra os 7 anteriores (mínimo de 5 vendas em cada semana)." },
      caros: { title: "Mais caros", hint: "Maior preço médio de venda (com pelo menos 1 venda em 30 dias)." },
      ofertados: { title: "Mais anunciados", hint: "Quantidade de ofertas abertas no momento da varredura." },
    },
  },
  deals: {
    metaTitle: "Ofertas detectadas",
    title: (label) => `Ofertas detectadas no ${label}`,
    intro: (o) =>
      `Mobis cujo menor preço anunciado estava pelo menos ${o.pct}% abaixo do que foi pago na última semana. Só contam mobis com vendas recentes (${o.sold7} ou mais em 7 dias e ${o.sold30} ou mais em 30), de ${o.ref} créditos ou mais, e sem excesso de ofertas (se há mais anunciados do que vendas, o preço baixo não é pechincha: é que ninguém compra).`,
    notice: (
      <>
        A API do Habbo informa o menor preço e a quantidade de ofertas no momento da consulta, não cada anúncio separadamente.
        Uma oferta desta lista pode ter sido vendida depois da varredura: use <strong>Verificar ao vivo</strong> antes de entrar
        no jogo.
      </>
    ),
    channelsTitle: "Receba estas ofertas",
    forYourList: "Detectadas para sua lista",
    configure: "Configurar alertas",
  },
  alerts: {
    metaTitle: "Alertas de preço",
    title: "Alertas de preço",
    intro:
      "Escolha os mobis que você quer e avisamos quando alguém anunciar barato: abaixo do que costuma ser pago, ou pelo preço que você definir.",
    how: (
      <>
        <strong className="text-text">Como funciona.</strong> A cada poucos minutos olhamos o anúncio mais barato de cada mobi
        da sua lista. Se atender sua condição, avisamos. Se alguém anunciar barato e outra pessoa comprar antes da próxima
        olhada, esse aviso não chega.
      </>
    ),
    channelsTitle: "Prefere Discord, Telegram ou WhatsApp?",
    channelsNote: "Entre com um toque. Lá publicamos para todos as ofertas mais fortes de cada varredura (não a sua lista pessoal).",
  },
  item: {
    notFoundTitle: "Mobi não encontrado",
    metaDesc: (name, label) => `Menor preço, ofertas abertas, média e histórico de ${name} no Marketplace do ${label}.`,
    catalogPending: "O catálogo deste hotel ainda não foi baixado. Volte daqui a pouco.",
    breadcrumb: "Caminho",
    home: "Início",
    wall: "De parede",
    floor: "De chão",
    line: (l) => `Linha: ${l}`,
    hotel: (label) => `Hotel ${label}`,
    otherHotels: "Ver em outros hotéis:",
    ownEconomy: "(cada hotel tem sua própria economia)",
    loadingAria: "Carregando mobi",
    category: {
      chair: "Assento",
      table: "Mesa",
      lighting: "Iluminação",
      divider: "Divisória",
      gate: "Portão",
      bed: "Cama",
      rug: "Tapete",
      shelf: "Estante",
      wired: "Wired",
      games: "Jogos",
      pets: "Mascotes",
      trophy: "Troféu",
      music: "Música",
      floor: "Piso",
      wall_decoration: "Decoração de parede",
      other: "Outros",
    },
  },
  search: {
    metaTitle: "Buscar mobi",
    title: "Buscar mobi",
    nftMetaTitle: "Buscar NFT",
    nftTitle: "Buscar NFT",
    min2: "Digite pelo menos 2 letras.",
    none: (q) => `Não encontramos mobis negociáveis para «${q}».`,
    noneNft: (q) => `Não encontramos NFT para «${q}».`,
    first60: "Primeiros 60 resultados",
    results: (n) => `${n} resultados`,
    forQ: (q) => ` para «${q}»`,
    noOpenOffers: "sem ofertas abertas",
    noMarket: "ainda sem dados de mercado",
    floor: (v) => `mínimo ${v}`,
    noListings: "sem anúncios",
    sales7: (n) => `${n} vendas em 7 d`,
  },
  about: {
    metaTitle: "Dados e limites",
    title: "Quais dados são reais e quais são seus limites",
    sourcesTitle: "De onde vêm os dados",
    sources: (
      <>
        <p>
          Tudo vem da <strong>API pública e documentada do Habbo</strong> (endpoint de estatísticas do Marketplace, documentado
          no Swagger oficial) e do <strong>furnidata</strong> público de cada hotel, que traz os nomes e a lista de mobis
          negociáveis. Não usamos contas, senhas nem dados de usuários, e não lemos o site do jogo.
        </p>
        <p>Os ícones dos mobis são exibidos direto do servidor de imagens do Habbo; este site não os copia nem hospeda.</p>
      </>
    ),
    freshTitle: "Quão atual é cada dado",
    fresh: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Página de um mobi:</strong> seu navegador consulta a API na hora (menor preço anunciado, ofertas abertas e os
          últimos 30 dias de vendas). A resposta é reaproveitada por 1 minuto.
        </li>
        <li>
          <strong>Histórico por dia:</strong> o Habbo entrega agrupado por dia e até o dia anterior; o dia de hoje ainda não
          aparece.
        </li>
        <li>
          <strong>Rankings e ofertas detectadas:</strong> vêm do coletor, que consulta o catálogo por partes. Cada mobi mostra o
          dado da sua última varredura; os mais ativos são atualizados com mais frequência.
        </li>
        <li>
          <strong>Histórico de mais de 30 dias e do menor preço anunciado:</strong> este site vai guardando desde que começou a
          coletar; antes dessa data não há dados.
        </li>
      </ul>
    ),
    scanLine: (label, ago, scanned, requests, catalog) => (
      <>
        Hotel {label}: última rodada {ago}, com {scanned} mobis consultados em {requests} pedidos. Catálogo: {catalog} mobis
        negociáveis.
      </>
    ),
    limitsTitle: "Limites que vale saber",
    limits: (label) => (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Não é tempo real de cada anúncio.</strong> A API informa o menor preço anunciado e quantas ofertas existem no
          momento da consulta. Não mostra cada oferta, nem quem anunciou, nem a que horas.
        </li>
        <li>
          <strong>A API limita os pedidos</strong> (medimos uns 15 a 20 por minuto por conexão, com até 25 + 25 mobis por
          pedido). Por isso o coletor vai devagar e percorre o catálogo por partes.
        </li>
        <li>
          <strong>Médias:</strong> a média de 7 dias é ponderada pelas unidades vendidas. Com poucas vendas, um único preço
          estranho pode movê-la bastante; altas e quedas exigem pelo menos 5 vendas por semana.
        </li>
        <li>Cada hotel tem sua própria economia: os preços do {label} não se comparam com os de outros hotéis.</li>
        <li>Os dados podem ter erros ou atrasos. Não use como única referência para comprar ou vender.</li>
      </ul>
    ),
    privacyTitle: "Privacidade",
    privacy:
      "Sua lista de alertas fica salva no seu navegador e, se você criar uma conta, também na conta. Não usamos publicidade nem cookies de rastreamento. As consultas ao vivo vão do seu navegador direto para a API do Habbo, sem enviar cookies. Os detalhes estão em «Privacidade e cookies».",
    legalTitle: "Aviso legal",
    legal:
      "Bomhams Market é um site de fãs, gratuito e sem fins comerciais. Não é oficial e não é afiliado, patrocinado nem aprovado pela Sulake Oy nem pela Azerion. Habbo e os nomes e imagens dos mobis são propriedade da Sulake Oy. Se a Sulake pedir para retirar algum conteúdo, ele será retirado.",
  },
  privacy: {
    metaTitle: "Privacidade e cookies",
    metaDesc: "O que o Bomhams Market guarda, onde e como apagar. Sem publicidade nem rastreamento.",
    title: "Privacidade e cookies",
    intro: "O Bomhams Market não tem publicidade nem rastreamento, não vende dados e não pede seu e-mail. Isto é tudo o que fica salvo e onde.",
    sections: [
      {
        title: "No seu navegador (necessário)",
        items: [
          "Sua lista de alertas, as ofertas detectadas e os ajustes. Continuam salvos mesmo se você fechar a aba ou desligar o computador, e são apagados se você apagar os dados deste site no navegador.",
          "Um registro das consultas ao vivo ao Habbo dos últimos minutos, para não passar do limite do Habbo.",
          "Sua escolha sobre os cookies.",
        ],
      },
      {
        title: "Preferências (só se você aceitar)",
        items: [
          "O cookie fm_lang, com o idioma que você escolheu, para abrir a página inicial nesse idioma. Dura 1 ano.",
          "Se você desligar o fundo de estrelas, isso fica lembrado para a próxima visita.",
        ],
      },
      {
        title: "Se você criar uma conta",
        items: [
          "Guardamos seu nome de usuário, sua senha criptografada (ninguém consegue lê-la, nem quem administra o site), sua lista de alertas e a data de criação. Nada mais.",
          "O cookie de sessão bm_session, necessário para você continuar conectado. Não pode ser lido pela página e dura 30 dias ou até você sair.",
          "Você pode apagar sua conta e todos os dados quando quiser em «Minha conta».",
          "Não use a mesma senha do Habbo nem de outro site. Como não pedimos e-mail, se você esquecer a senha ela não pode ser recuperada: será preciso criar outra conta.",
        ],
      },
      {
        title: "Serviços envolvidos",
        items: [
          "A Vercel hospeda o site: como qualquer servidor, recebe seu endereço IP e registra os pedidos por segurança durante pouco tempo.",
          "A Upstash guarda as contas (banco de dados conectado pela Vercel).",
          "Seu navegador consulta os preços ao vivo direto no Habbo e na Immutable, sem enviar cookies. As imagens dos mobis vêm dos servidores do Habbo.",
        ],
      },
    ],
    change: "Para mudar sua escolha sobre os cookies, toque em «Cookies» no rodapé.",
  },
  nft: {
    banner: (marketLink) => (
      <>
        <strong className="text-text">Seção NFT</strong>: colecionáveis oficiais do Habbo na blockchain Immutable, comprados com
        criptomoedas (preços em dólares). Não são os mobis do Marketplace do jogo: para isso, vá ao {marketLink}.
      </>
    ),
    marketLink: "Marketplace (créditos)",
    footerData:
      "Dados da API pública da Immutable zkEVM; imagens servidas pelo Habbo (nft-tokens.habbo.com). Bomhams Market não é oficial nem afiliado à Sulake Oy, à Azerion ou à Immutable.",
    footerRisk:
      "Isto não é recomendação financeira. Os preços dos NFT mudam rápido e podem chegar a zero; os valores em dólares são aproximados pela cotação do momento.",
    collections: {
      furni: "Mobis NFT",
      ropa: "Roupas NFT",
      mascotas: "Mascotes NFT",
      tokens: "Tokens NFT",
      addons: "Add-ons NFT",
    },
    home: {
      kicker: "NFT · blockchain Immutable zkEVM",
      title: "Preços e vendas dos NFT oficiais do Habbo",
      intro:
        "Mobis, roupas, mascotes, tokens e add-ons colecionáveis: preço mínimo (o anúncio mais barato), melhor oferta de compra, vendas da semana e evolução do preço, em dólares.",
      lastScan: "Última varredura",
      rate: (v) => `Cotação usada: 1 ETH ≈ ${v}.`,
      liveNote: "A página de cada NFT é consultada ao vivo.",
      where: "De onde vêm os dados?",
      noScans: "Ainda não há varreduras salvas da seção NFT.",
      noData: "A seção NFT ainda não tem dados do coletor.",
      summaryAria: "Resumo NFT",
      listed: "Modelos à venda",
      sales: "Vendas",
      last7: "últimos 7 dias",
      volume: "Dólares movimentados",
      models: "Modelos com dados",
      modelsSub: "à venda ou vendidos em 30 dias",
      collectionsTitle: "Coleções",
      collectionsHint: "As 5 coleções oficiais do Habbo na Immutable",
      colListed: (n, floor) => `${n} à venda · a partir de ${floor}`,
      colSales: (n, v) => `${n} vendas · ${v} em 7 dias`,
      bestSellers: "Mais vendidos",
      bestSellersHint: "Unidades nos últimos 7 dias",
      noSales: "Ainda sem vendas registradas.",
      deals: "Ofertas",
      dealsHint: "Preço mínimo bem abaixo da média semanal",
      noDeals: "Nenhuma oferta forte na última varredura.",
      ups: "Maiores altas",
      downs: "Maiores quedas",
      changeHint: "Média de 7 dias vs. semana anterior",
      needWeek: "Falta mais uma semana de dados.",
    },
    list: {
      metric: {
        s7: "Vendidos 7 d",
        v7: "USD 7 d",
        change: "Variação",
        floor: "Preço mínimo",
        discount: "Abaixo da média",
        a30: "Média 30 d",
      },
      floor: (v) => `mínimo ${v}`,
      noListings: "sem anúncios",
      empty: "Ainda não há dados suficientes para esta lista.",
      colFloor: "Preço mínimo",
      colAvg7: "Média 7 d",
      colSold7: "Vendidos 7 d",
      col30: "30 dias",
    },
    rankings: {
      metaTitle: "Rankings",
      title: "Rankings NFT",
      collectionMeta: "Coleção",
      lastScan: "Última varredura",
      prices: ". Preços em dólares (aproximados).",
      noScans: "Ainda não há varreduras salvas.",
      kindAria: "Tipo de ranking",
      kinds: {
        vendidos: { title: "Mais vendidos", hint: "Unidades vendidas nos últimos 7 dias." },
        volumen: { title: "Mais dólares movimentados", hint: "Total pago em vendas nos últimos 7 dias (USD)." },
        subas: { title: "Maiores altas", hint: "Preço médio de venda de 7 dias contra os 7 anteriores (mínimo de 3 vendas em cada semana)." },
        bajas: { title: "Maiores quedas", hint: "Preço médio de venda de 7 dias contra os 7 anteriores (mínimo de 3 vendas em cada semana)." },
        ofertas: {
          title: "Ofertas",
          hint: "Preço mínimo pelo menos 30% abaixo do que foi pago em média nesta semana (com 3 ou mais vendas).",
        },
        caros: {
          title: "Mais caros",
          hint: "Maior preço médio de venda em 30 dias (com 2 ou mais vendas). Usamos a venda real e não o preço mínimo, porque há anúncios com preços absurdos que ninguém compra.",
        },
      },
    },
    item: {
      notFoundTitle: "NFT não encontrado",
      metaDesc: (name) => `Preço mínimo, vendas e histórico do NFT ${name} do Habbo na Immutable.`,
      origin: (s) => `Origem: ${s}`,
      set: (s) => `Conjunto: ${s}`,
      supply: (n) => `Existem ${n}`,
      buy: (link) => (
        <>
          Este NFT é comprado e vendido com criptomoedas no marketplace da Immutable (por exemplo pelo {link}). Não dá para
          conseguir com créditos do jogo.
        </>
      ),
    },
    about: {
      metaTitle: "Dados e limites",
      title: "Seção NFT: de onde vêm os dados",
      whatTitle: "O que é esta seção",
      what: (marketLink) => (
        <p>
          Mostra os <strong>colecionáveis NFT oficiais do Habbo</strong>, que ficam na blockchain <strong>Immutable zkEVM</strong>{" "}
          e são comprados e vendidos com criptomoedas. É independente do {marketLink}, onde os mobis são pagos com créditos. Os
          preços de uma seção não podem ser comparados com os da outra.
        </p>
      ),
      marketLink: "Marketplace do jogo",
      sourcesTitle: "Fontes",
      sources: (eth) => (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>API pública da Immutable zkEVM</strong> (sem chaves nem contas): modelos à venda, preço mínimo, melhores
            ofertas de compra, última venda e o histórico de vendas de cada coleção. Respeitamos o limite publicado de 5 pedidos
            por segundo.
          </li>
          <li>
            <strong>Cotações</strong> de ETH, IMX e USDC em dólares: serviço de conversão da Immutable.
            {eth ? ` Na última varredura, 1 ETH ≈ ${eth}.` : ""}
          </li>
          <li>
            <strong>Imagens</strong>: servidas diretamente pelo Habbo em nft-tokens.habbo.com.
          </li>
        </ul>
      ),
      included: "Coleções incluídas:",
      freshTitle: "Quão atual é cada dado",
      fresh: (ago) => (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Página de um NFT:</strong> o preço mínimo, a melhor oferta e os anúncios são consultados ao vivo pelo seu
            navegador.
          </li>
          <li>
            <strong>Rankings e vendas por dia:</strong> vêm do coletor{ago ? <> (última varredura {ago})</> : null}. As vendas são
            guardadas desde que ele começou a rodar; a primeira varredura carregou as dos 14 dias anteriores.
          </li>
          <li>
            <strong>Dólares:</strong> as vendas são pagas em ETH (ou IMX/USDC) e convertidas para dólares pela cotação do momento
            da varredura, então são aproximadas.
          </li>
        </ul>
      ),
      limitsTitle: "Limites",
      limits: (
        <ul className="list-disc space-y-1 pl-5">
          <li>Só as coleções da Immutable zkEVM. As da rede anterior (Immutable X) não estão mais disponíveis na API.</li>
          <li>Os avatares NFT do Habbo na Ethereum não estão incluídos: seus dados exigem serviços com chave de acesso.</li>
          <li>Há anúncios com preços absurdos que ninguém compra: por isso «Mais caros» usa vendas reais, não o preço mínimo.</li>
          <li>Vendas entre carteiras da mesma pessoa ou com preços estranhos também entram nas médias.</li>
        </ul>
      ),
      noticeTitle: "Aviso",
      notice:
        "Isto não é recomendação financeira. NFT são ativos voláteis: o preço pode mudar muito ou chegar a zero. O Bomhams Market não vende, não compra e não guarda nada; só mostra dados públicos. Não é um site oficial do Habbo, da Sulake, da Azerion nem da Immutable.",
    },
  },
};
