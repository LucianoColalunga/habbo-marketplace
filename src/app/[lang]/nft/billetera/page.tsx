import type { Metadata } from "next";
import { WalletInspector } from "@/components/nft/WalletInspector";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, p, t } = await getI18n();
  return pageMeta({ lang, p, section: "nft", path: "/nft/billetera", title: t.wallet.title, description: t.wallet.intro });
}

export default async function BilleteraPage() {
  const { t } = await getI18n();
  return (
    <div className="space-y-5">
      <header className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-text">{t.wallet.title}</h1>
        <p className="mt-2 text-text-2">{t.wallet.intro}</p>
      </header>
      <WalletInspector />
    </div>
  );
}
