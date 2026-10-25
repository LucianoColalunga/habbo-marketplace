import type { Lang } from "./config";

/**
 * Planes (Standard y VIP) y la comparación con SecureHabbo, en los tres
 * idiomas. La comparación es honesta: dice qué ya tenemos, qué está en camino y
 * qué no hacemos a propósito.
 */

/** Cómo está cada función: sí, en parte, en camino o no (a propósito). */
export type FeatureStatus = "yes" | "partial" | "soon" | "no";

/** Lo que ofrece SecureHabbo (revisado el 25/10/2026) y cómo está en Stats. */
export const COMPARISON: { key: ComparisonKey; stats: FeatureStatus }[] = [
  { key: "creditPrices", stats: "partial" },
  { key: "trends", stats: "yes" },
  { key: "watchlist", stats: "yes" },
  { key: "nftPrices", stats: "yes" },
  { key: "nftListings", stats: "yes" },
  { key: "burns", stats: "yes" },
  { key: "wallet", stats: "yes" },
  { key: "onlines", stats: "partial" },
  { key: "emeralds", stats: "soon" },
  { key: "ethAvatars", stats: "soon" },
  { key: "levels", stats: "soon" },
  { key: "crafting", stats: "soon" },
  { key: "traders", stats: "soon" },
  { key: "recycler", stats: "soon" },
  { key: "trading", stats: "no" },
  { key: "rewards", stats: "no" },
  { key: "approvals", stats: "no" },
];

type ComparisonKey =
  | "creditPrices"
  | "trends"
  | "watchlist"
  | "nftPrices"
  | "nftListings"
  | "burns"
  | "wallet"
  | "onlines"
  | "emeralds"
  | "ethAvatars"
  | "levels"
  | "crafting"
  | "traders"
  | "recycler"
  | "trading"
  | "rewards"
  | "approvals";

/** Qué trae cada plan. */
export const PLAN_FEATURES: { key: PlanFeatureKey; standard: boolean; vip: boolean }[] = [
  { key: "everything", standard: true, vip: true },
  { key: "sameAsOthers", standard: true, vip: true },
  { key: "account", standard: true, vip: true },
  { key: "csv", standard: false, vip: true },
  { key: "badge", standard: false, vip: true },
  { key: "early", standard: false, vip: true },
];

type PlanFeatureKey = "everything" | "sameAsOthers" | "account" | "csv" | "badge" | "early";

const es = {
  metaTitle: "Planes: Standard y VIP",
  metaDesc: "Stats es gratis. Compará los planes Standard y VIP, y todo lo que ofrecemos frente a SecureHabbo.",
  title: "Planes",
  intro: "Todo lo que hace Stats es gratis con el plan Standard. El VIP suma funciones nuevas a medida que salen.",
  standard: "Standard",
  standardPrice: "Gratis",
  standardHint: "Todo el sitio, con o sin cuenta.",
  vip: "VIP",
  vipPrice: "Por invitación",
  vipHint: "Por ahora lo da la administración. Más adelante se va a poder contratar.",
  yourPlan: "Tu plan",
  createAccount: "Crear una cuenta",
  colFeature: "Qué incluye",
  no: "No",
  features: {
    everything: "Precios, rankings, ofertas, catálogo, alertas, NFT y todo lo que hay en el sitio",
    sameAsOthers: "Todo lo que igualemos de otros sitios (ver la comparación)",
    account: "Cuenta con tu lista de alertas en todos tus dispositivos",
    csv: "Exportar a CSV (rankings, catálogo, historiales y movimiento)",
    badge: "Insignia VIP en tu cuenta",
    early: "Acceso anticipado a las funciones nuevas",
  } satisfies Record<PlanFeatureKey, string>,
  compareTitle: "Stats frente a SecureHabbo",
  compareIntro:
    "Revisamos lo que ofrece SecureHabbo (25 de octubre de 2026). Lo informativo lo igualamos y es gratis; lo que maneja dinero o billeteras no lo hacemos, a propósito.",
  colTheirs: "En SecureHabbo",
  colOurs: "En Stats",
  status: { yes: "Sí", partial: "En parte", soon: "En camino", no: "No, a propósito" } satisfies Record<FeatureStatus, string>,
  rows: {
    creditPrices: ["Precios de furnis con créditos", "Hoy en .es, .com y .com.br; SecureHabbo cubre 9 hoteles."],
    trends: ["Más comerciados, que suben y que bajan", "Rankings y ofertas detectadas."],
    watchlist: ["Lista de seguimiento", "Con alertas de precio y avisos en el navegador."],
    nftPrices: ["Precios NFT: piso, ventas y rankings", "De las cinco colecciones oficiales."],
    nftListings: ["Publicaciones más baratas de cada NFT", "Con el próximo precio si se compra la más barata."],
    burns: ["Quemas y movimiento de las colecciones", "Vendidas, acuñadas, quemadas y cuántas existen, por día."],
    wallet: ["Inspector de billeteras", "Qué NFT tiene una billetera y cuánto valen al precio piso."],
    onlines: ["Usuarios conectados", "Habbo Origins en vivo. Los hoteles comunes no publican esta cifra."],
    emeralds: ["Esmeraldas: circulación, emisión y tienda", ""],
    ethAvatars: ["Crafted Avatars, Galaxy Habbos y Portraits (Ethereum)", ""],
    levels: ["Niveles y XP de las colecciones", ""],
    crafting: ["Recetas y simulador de crafteo", ""],
    traders: ["Rankings de traders y coleccionistas", ""],
    recycler: ["Estadísticas del reciclador", ""],
    trading: ["Comprar y vender con billetera", "No manejamos dinero ni billeteras de nadie."],
    rewards: ["Tienda de premios, sorteos y airdrops", "Nada de sorteos ni premios en criptomonedas."],
    approvals: ["Administrar permisos de la billetera", "Hace falta conectar la billetera: no lo pedimos."],
  } satisfies Record<ComparisonKey, [string, string]>,
  extrasTitle: "Además, en Stats",
  extras: [
    "En español, portugués e inglés.",
    "Cuentas con usuario y email (sin billetera): tu lista en todos tus dispositivos.",
    "Alertas de precio con avisos en el navegador y un canal de Discord con las mejores ofertas.",
    "Catálogo por categorías, con imágenes grandes, medianas, chicas o en lista.",
    "Precios en vivo en las listas y en cada ficha.",
    "Historial de precios de más de 30 días y movimiento del mercado por día.",
  ],
  vipOnly: "Función VIP",
  vipOnlyHint: "Exportar es una función VIP. Mirá los planes.",
  export: "Exportar CSV",
  seePlans: "Ver planes",
};

export type PlansText = typeof es;

const pt: PlansText = {
  metaTitle: "Planos: Standard e VIP",
  metaDesc: "O Stats é grátis. Compare os planos Standard e VIP, e tudo o que oferecemos frente ao SecureHabbo.",
  title: "Planos",
  intro: "Tudo o que o Stats faz é grátis com o plano Standard. O VIP soma funções novas conforme forem saindo.",
  standard: "Standard",
  standardPrice: "Grátis",
  standardHint: "O site inteiro, com ou sem conta.",
  vip: "VIP",
  vipPrice: "Por convite",
  vipHint: "Por enquanto é dado pela administração. Mais adiante vai ser possível contratar.",
  yourPlan: "Seu plano",
  createAccount: "Criar uma conta",
  colFeature: "O que inclui",
  no: "Não",
  features: {
    everything: "Preços, rankings, ofertas, catálogo, alertas, NFT e tudo o que há no site",
    sameAsOthers: "Tudo o que igualarmos de outros sites (veja a comparação)",
    account: "Conta com sua lista de alertas em todos os seus dispositivos",
    csv: "Exportar para CSV (rankings, catálogo, históricos e movimento)",
    badge: "Insígnia VIP na sua conta",
    early: "Acesso antecipado às funções novas",
  },
  compareTitle: "Stats frente ao SecureHabbo",
  compareIntro:
    "Revisamos o que o SecureHabbo oferece (25 de outubro de 2026). O informativo nós igualamos e é grátis; o que envolve dinheiro ou carteiras não fazemos, de propósito.",
  colTheirs: "No SecureHabbo",
  colOurs: "No Stats",
  status: { yes: "Sim", partial: "Em parte", soon: "A caminho", no: "Não, de propósito" },
  rows: {
    creditPrices: ["Preços de mobis com créditos", "Hoje em .es, .com e .com.br; o SecureHabbo cobre 9 hotéis."],
    trends: ["Mais negociados, que sobem e que caem", "Rankings e ofertas detectadas."],
    watchlist: ["Lista de acompanhamento", "Com alertas de preço e avisos no navegador."],
    nftPrices: ["Preços NFT: piso, vendas e rankings", "Das cinco coleções oficiais."],
    nftListings: ["Anúncios mais baratos de cada NFT", "Com o próximo preço se comprarem o mais barato."],
    burns: ["Queimas e movimento das coleções", "Vendidas, cunhadas, queimadas e quantas existem, por dia."],
    wallet: ["Inspetor de carteiras", "Que NFT uma carteira tem e quanto valem pelo preço piso."],
    onlines: ["Usuários conectados", "Habbo Origins ao vivo. Os hotéis comuns não publicam esse número."],
    emeralds: ["Esmeraldas: circulação, emissão e loja", ""],
    ethAvatars: ["Crafted Avatars, Galaxy Habbos e Portraits (Ethereum)", ""],
    levels: ["Níveis e XP das coleções", ""],
    crafting: ["Receitas e simulador de criação", ""],
    traders: ["Rankings de traders e colecionadores", ""],
    recycler: ["Estatísticas do reciclador", ""],
    trading: ["Comprar e vender com carteira", "Não lidamos com dinheiro nem com carteiras de ninguém."],
    rewards: ["Loja de prêmios, sorteios e airdrops", "Nada de sorteios nem prêmios em criptomoedas."],
    approvals: ["Gerenciar permissões da carteira", "É preciso conectar a carteira: não pedimos isso."],
  },
  extrasTitle: "Além disso, no Stats",
  extras: [
    "Em espanhol, português e inglês.",
    "Contas com usuário e e-mail (sem carteira): sua lista em todos os seus dispositivos.",
    "Alertas de preço com avisos no navegador e um canal no Discord com as melhores ofertas.",
    "Catálogo por categorias, com imagens grandes, médias, pequenas ou em lista.",
    "Preços ao vivo nas listas e em cada ficha.",
    "Histórico de preços de mais de 30 dias e movimento do mercado por dia.",
  ],
  vipOnly: "Função VIP",
  vipOnlyHint: "Exportar é uma função VIP. Veja os planos.",
  export: "Exportar CSV",
  seePlans: "Ver planos",
};

const en: PlansText = {
  metaTitle: "Plans: Standard and VIP",
  metaDesc: "Stats is free. Compare the Standard and VIP plans, and everything we offer next to SecureHabbo.",
  title: "Plans",
  intro: "Everything Stats does is free on the Standard plan. VIP adds new features as they come out.",
  standard: "Standard",
  standardPrice: "Free",
  standardHint: "The whole site, with or without an account.",
  vip: "VIP",
  vipPrice: "Invite only",
  vipHint: "For now it's granted by the admins. Later on it'll be possible to subscribe.",
  yourPlan: "Your plan",
  createAccount: "Create an account",
  colFeature: "What's included",
  no: "No",
  features: {
    everything: "Prices, rankings, deals, catalog, alerts, NFTs and everything on the site",
    sameAsOthers: "Everything we match from other sites (see the comparison)",
    account: "An account with your alert list on all your devices",
    csv: "Export to CSV (rankings, catalog, histories and activity)",
    badge: "VIP badge on your account",
    early: "Early access to new features",
  },
  compareTitle: "Stats next to SecureHabbo",
  compareIntro:
    "We reviewed what SecureHabbo offers (October 25, 2026). The informational part we match, for free; anything that handles money or wallets we don't do, on purpose.",
  colTheirs: "On SecureHabbo",
  colOurs: "On Stats",
  status: { yes: "Yes", partial: "Partly", soon: "Coming", no: "No, on purpose" },
  rows: {
    creditPrices: ["Credit furni prices", "Today on .es, .com and .com.br; SecureHabbo covers 9 hotels."],
    trends: ["Most traded, rising and falling", "Rankings and detected deals."],
    watchlist: ["Watchlist", "With price alerts and browser notifications."],
    nftPrices: ["NFT prices: floor, sales and rankings", "For the five official collections."],
    nftListings: ["Cheapest listings of each NFT", "With the next price if the cheapest one is bought."],
    burns: ["Burns and collection activity", "Sold, minted, burned and how many exist, per day."],
    wallet: ["Wallet inspector", "Which NFTs a wallet holds and what they're worth at floor price."],
    onlines: ["Users online", "Habbo Origins live. The regular hotels don't publish this number."],
    emeralds: ["Emeralds: circulation, emission and shop", ""],
    ethAvatars: ["Crafted Avatars, Galaxy Habbos and Portraits (Ethereum)", ""],
    levels: ["Collection levels and XP", ""],
    crafting: ["Crafting recipes and simulator", ""],
    traders: ["Trader and collector rankings", ""],
    recycler: ["Recycler stats", ""],
    trading: ["Buy and sell with a wallet", "We don't handle anyone's money or wallets."],
    rewards: ["Reward shop, raffles and airdrops", "No raffles or crypto prizes."],
    approvals: ["Manage wallet approvals", "It requires connecting the wallet: we don't ask for that."],
  },
  extrasTitle: "Also on Stats",
  extras: [
    "In Spanish, Portuguese and English.",
    "Accounts with username and email (no wallet): your list on all your devices.",
    "Price alerts with browser notifications and a Discord channel with the best deals.",
    "Catalog by category, with large, medium or small images, or a list.",
    "Live prices in lists and on every item page.",
    "Price history beyond 30 days and daily market activity.",
  ],
  vipOnly: "VIP feature",
  vipOnlyHint: "Exporting is a VIP feature. See the plans.",
  export: "Export CSV",
  seePlans: "See plans",
};

export const PLANS_TEXT: Record<Lang, PlansText> = { es, pt, en };
