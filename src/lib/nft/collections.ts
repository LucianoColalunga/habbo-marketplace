/**
 * Colecciones oficiales de Habbo en la blockchain Immutable zkEVM (verificadas el
 * 17/10/2026 con la API pública de Immutable; sus imágenes se sirven desde
 * nft-tokens.habbo.com). Son NFT: se compran y venden con criptomonedas, no con
 * los créditos del Marketplace del juego.
 */
export const NFT_COLLECTIONS = [
  { slug: "furni", address: "0x33976ee1477c75171b2b34814d75ebc37413e589", name: "Furnis NFT", official: "Habbo Furni" },
  { slug: "ropa", address: "0xdbf185750d135ea5581f9853db9f9657fb843a62", name: "Ropa NFT", official: "Habbo Clothes" },
  { slug: "mascotas", address: "0xb7727da90019d072a5f8fdd58ff4522f796a20c5", name: "Mascotas NFT", official: "Habbo Pets" },
  { slug: "tokens", address: "0xe06f06a4128373ecc5444881a6a26fc18723487a", name: "Tokens NFT", official: "Habbo Tokens" },
  { slug: "addons", address: "0x2da5094f8c6cd42f5b3b24803f998a28b40a398f", name: "Add-ons NFT", official: "Habbo Addons" },
] as const;

export type NftCollection = (typeof NFT_COLLECTIONS)[number];
export type NftCollectionSlug = NftCollection["slug"];

export function isNftCollectionSlug(value: unknown): value is NftCollectionSlug {
  return NFT_COLLECTIONS.some((c) => c.slug === value);
}

export function collectionBySlug(slug: NftCollectionSlug): NftCollection {
  return NFT_COLLECTIONS.find((c) => c.slug === slug)!;
}

export function collectionByAddress(address: string): NftCollection | undefined {
  const a = address.toLowerCase();
  return NFT_COLLECTIONS.find((c) => c.address === a);
}

/** Monedas en las que se pagan los NFT en Immutable zkEVM. */
export const PAYMENT_TOKENS: Record<string, { symbol: string; decimals: number; rateId: string }> = {
  "0x52a6c53869ce09a731cd772f245b97a4401d3348": { symbol: "ETH", decimals: 18, rateId: "ethereum" },
  "0x6de8acc0d406837030ce4dd28e7c08c5a96a30d2": { symbol: "USDC", decimals: 6, rateId: "usd-coin" },
  "0x68bcc7f1190af20e7b572bcfb431c3ac10a936ab": { symbol: "USDT", decimals: 6, rateId: "tether" },
  native: { symbol: "IMX", decimals: 18, rateId: "immutable-x" },
};
