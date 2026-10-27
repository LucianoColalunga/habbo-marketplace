import type { Lang } from "./config";

/** Planes (Standard y VIP), en los tres idiomas. */

/** Qué trae cada plan. */
export const PLAN_FEATURES: { key: PlanFeatureKey; standard: boolean; vip: boolean }[] = [
  { key: "everything", standard: true, vip: true },
  { key: "account", standard: true, vip: true },
  { key: "csv", standard: false, vip: true },
  { key: "badge", standard: false, vip: true },
  { key: "early", standard: false, vip: true },
];

type PlanFeatureKey = "everything" | "account" | "csv" | "badge" | "early";

const es = {
  metaTitle: "Planes: Standard y VIP",
  metaDesc: "Stats es gratis. Mirá qué incluyen los planes Standard y VIP.",
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
  yes: "Sí",
  no: "No",
  features: {
    everything: "Precios, rankings, ofertas, catálogo, alertas, NFT y todo lo que hay en el sitio",
    account: "Cuenta con tu lista de alertas en todos tus dispositivos",
    csv: "Exportar a CSV (rankings, catálogo, historiales y movimiento)",
    badge: "Insignia VIP en tu cuenta",
    early: "Acceso anticipado a las funciones nuevas",
  } satisfies Record<PlanFeatureKey, string>,
  extrasTitle: "Todo lo que tiene Stats, gratis",
  extras: [
    "En español, portugués e inglés.",
    "Cuentas con usuario y email: tu lista en todos tus dispositivos.",
    "Alertas de precio con avisos en el navegador y un canal de Discord con las mejores ofertas.",
    "Catálogo por categorías, con imágenes grandes, medianas, chicas o en lista.",
    "Precios en vivo en las listas y en cada ficha.",
    "Historial de precios de más de 30 días y movimiento del mercado por día.",
    "NFT oficiales: precios, rankings, movimiento de las colecciones e inspector de billeteras.",
    "Usuarios conectados en Habbo Origins.",
  ],
  vipOnly: "Función VIP",
  vipOnlyHint: "Exportar es una función VIP. Mirá los planes.",
  export: "Exportar CSV",
  seePlans: "Ver planes",
};

export type PlansText = typeof es;

const pt: PlansText = {
  metaTitle: "Planos: Standard e VIP",
  metaDesc: "O Stats é grátis. Veja o que incluem os planos Standard e VIP.",
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
  yes: "Sim",
  no: "Não",
  features: {
    everything: "Preços, rankings, ofertas, catálogo, alertas, NFT e tudo o que há no site",
    account: "Conta com sua lista de alertas em todos os seus dispositivos",
    csv: "Exportar para CSV (rankings, catálogo, históricos e movimento)",
    badge: "Insígnia VIP na sua conta",
    early: "Acesso antecipado às funções novas",
  },
  extrasTitle: "Tudo o que o Stats tem, grátis",
  extras: [
    "Em espanhol, português e inglês.",
    "Contas com usuário e e-mail: sua lista em todos os seus dispositivos.",
    "Alertas de preço com avisos no navegador e um canal no Discord com as melhores ofertas.",
    "Catálogo por categorias, com imagens grandes, médias, pequenas ou em lista.",
    "Preços ao vivo nas listas e em cada ficha.",
    "Histórico de preços de mais de 30 dias e movimento do mercado por dia.",
    "NFT oficiais: preços, rankings, movimento das coleções e inspetor de carteiras.",
    "Usuários conectados no Habbo Origins.",
  ],
  vipOnly: "Função VIP",
  vipOnlyHint: "Exportar é uma função VIP. Veja os planos.",
  export: "Exportar CSV",
  seePlans: "Ver planos",
};

const en: PlansText = {
  metaTitle: "Plans: Standard and VIP",
  metaDesc: "Stats is free. See what the Standard and VIP plans include.",
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
  yes: "Yes",
  no: "No",
  features: {
    everything: "Prices, rankings, deals, catalog, alerts, NFTs and everything on the site",
    account: "An account with your alert list on all your devices",
    csv: "Export to CSV (rankings, catalog, histories and activity)",
    badge: "VIP badge on your account",
    early: "Early access to new features",
  },
  extrasTitle: "Everything Stats has, for free",
  extras: [
    "In Spanish, Portuguese and English.",
    "Accounts with username and email: your list on all your devices.",
    "Price alerts with browser notifications and a Discord channel with the best deals.",
    "Catalog by category, with large, medium or small images, or a list.",
    "Live prices in lists and on every item page.",
    "Price history beyond 30 days and daily market activity.",
    "Official NFTs: prices, rankings, collection activity and a wallet inspector.",
    "Users online on Habbo Origins.",
  ],
  vipOnly: "VIP feature",
  vipOnlyHint: "Exporting is a VIP feature. See the plans.",
  export: "Export CSV",
  seePlans: "See plans",
};

export const PLANS_TEXT: Record<Lang, PlansText> = { es, pt, en };
