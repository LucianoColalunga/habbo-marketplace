import type { Pages } from "./es";

export const en: Pages = {
  meta: {
    title: "Bomhams Market — Marketplace prices",
    template: "%s · Bomhams Market",
    description:
      "Prices, open offers, averages and history of the furni Marketplace, using data from Habbo's public API. Created by the BOMHAMS community; unofficial.",
    nftTitle: "Habbo NFTs — prices and sales",
    nftTemplate: "%s · NFT · Bomhams Market",
    nftDescription:
      "Floor prices, sales and trends of Habbo's official NFT collectibles on the Immutable blockchain. A section separate from the credits Marketplace.",
  },
  seo: {
    ogAltMarket: "Bomhams Market: Habbo Marketplace prices",
    ogAltNft: "Bomhams Market: prices of Habbo's official NFTs",
    home: (label) => `Habbo ${label} Marketplace prices`,
    homeDesc: (label, region) =>
      `Lowest price, open offers, averages and history for every furni on the Habbo ${label} Marketplace (${region}). Daily rankings and deals.`,
    rankings: (kind, label) => `${kind} on the Habbo ${label} Marketplace`,
    rankingsDesc: (hint, label) => `${hint} Furni ranking for the Habbo ${label} Marketplace, updated with every scan.`,
    deals: (label) => `Furni deals on Habbo ${label}`,
    dealsDesc: (label) => `Furni listed well below what people usually pay on the Habbo ${label} Marketplace, with live checks.`,
    alerts: (label) => `Furni price alerts for Habbo ${label}`,
    alertsDesc: "Pick furni and get notified when someone lists them cheap on the Habbo Marketplace. Free, no account needed.",
    about: (label) => `Habbo ${label} Marketplace data and limits`,
    aboutDesc: "Where the prices come from (Habbo's public API), how fresh they are and what their limits are.",
    furni: (name, label) => `${name}: price on Habbo ${label}`,
    categories: (label) => `Habbo ${label} furni categories`,
    categoriesDesc: (label) =>
      `Habbo ${label} Marketplace furni by type, use or collection: seating, floors, lighting, rares, wired and more, with prices.`,
    category: (cat, label) => `${cat}: prices on Habbo ${label}`,
    categoryDesc: (cat, label, n) => `Lowest price, open offers and sales of ${n} «${cat}» furni on the Habbo ${label} Marketplace.`,
    nftHome: "Prices of Habbo's official NFTs",
    nftCollection: (name) => `${name}: prices and sales`,
    nftCollectionDesc: (name) => `Floor price, weekly sales and rankings of Habbo ${name} on the Immutable blockchain, in dollars.`,
    nftRanking: (kind) => `Habbo NFTs: ${kind}`,
    nftRankingDesc: (hint) => `${hint} Habbo's official NFTs on the Immutable blockchain.`,
    nftAboutDesc: "Where Habbo NFT prices come from (Immutable's public API), how fresh they are and what their limits are.",
  },
  header: { homeAria: "Bomhams Market, home", nftHomeAria: "Bomhams Market NFT, home" },
  footer: {
    about: (
      <>
        Created by the <strong className="text-text">BOMHAMS</strong> community, non-commercial.{" "}
        <strong className="text-text">Bomhams Market</strong> is not official and is not affiliated with, sponsored or
        endorsed by Sulake Oy or Azerion. Habbo is a registered trademark of Sulake Oy.
      </>
    ),
    data: "Prices and stats: Habbo's public API. Furni icons: served directly by Habbo's CDN. Data may be delayed or wrong; don't use it as your only reference for buying or selling.",
    linkAbout: "Which data is real and its limits",
    linkAlerts: "Price alerts",
    linkSource: "Source code",
    linkPrivacy: "Privacy & cookies",
    linkX: "Bomhams on X",
    builtBy: "Built by",
  },
  notFound: {
    title: "We couldn't find that page",
    body: "The furni may not be tradable, or the link may be mistyped.",
    back: "Back to home",
  },
  loading: "Loading",
  channels: {
    title: "Get the deals on your phone",
    note: "Join with one tap: we post the strongest deals each scan finds there.",
    aria: "Alert channels",
    discord: "Join the Discord",
    telegram: "Join the Telegram channel",
    whatsapp: "Follow the WhatsApp channel",
  },
  home: {
    kicker: (label, region) => `Marketplace · ${label} hotel (${region})`,
    title: "Furni prices, deals and Marketplace trends",
    intro: "Search any tradable furni to see its lowest listed price, how many are for sale, its average and how its price has moved.",
    lastScan: "Rankings: last scan",
    consulted: (n) => ` (${n} furni checked)`,
    liveNote: ". Each furni page: live lookup to the Habbo API.",
    howFresh: "How fresh is the data?",
    noScans: "No scans saved for this hotel yet.",
    noData:
      "This hotel has no collector data yet, so there are no rankings. Search and each furni page still work with live data once the catalog is downloaded.",
    summaryAria: "Market summary",
    active: "Active furni",
    activeSub: "sales in 30 days or offers",
    withOffers: "With open offers",
    sold: "Units sold",
    last7: "last 7 days",
    credits: "Credits traded",
    bestSellers: "Best sellers",
    bestSellersHint: "Units in the last 7 days",
    noSales: "No sales recorded yet.",
    deals: "Deals found",
    dealsHint: "Lowest price well below the average",
    seeDeals: "See deals",
    noDeals: "No strong deals in the last scan.",
    ups: "Biggest risers",
    downs: "Biggest fallers",
    changeHint: "7-day average vs. previous week",
    noUps: "No risers with enough volume.",
    noDowns: "No fallers with enough volume.",
  },
  list: {
    metric: {
      s7: "Sold 7 d",
      c7: "Credits 7 d",
      change: "Change",
      ref: "Average",
      oo: "For sale",
      pct: "Below average",
    },
    empty: "Not enough data for this list yet.",
    colFurni: "Furni",
    colMin: "Lowest price",
    colForSale: "For sale",
    colAvg7: "7 d average",
    col30: "30 days",
  },
  categories: {
    title: (label) => `${label} categories`,
    intro: "Browse furni by type, use or collection. Each category has subcategories: Seating, for example, has sofas, chairs and thrones.",
    count: (n) => `${n} furni`,
    all: "All",
    index: "Categories",
    breadcrumb: "Breadcrumb",
    subsAria: "Subcategories",
    limited: (shown, total) => `Showing the ${shown} best sellers out of ${total}. Pick a subcategory or use search to see the rest.`,
    empty: "No furni in this category yet.",
    pending: "This hotel's catalog hasn't been downloaded yet. Check back soon.",
    collectionsHint: "Each furni line in the game, like Pura, Iced or Mode.",
    homeTitle: "Browse by category",
    homeHint: "Seating, floors, lighting, rares, wired and more",
  },
  rankings: {
    metaTitle: "Rankings",
    title: (label) => `${label} rankings`,
    computedA: "Based on the last scan (",
    computedB: "). Each furni shows the data from its own latest scan.",
    noScans: "No scans saved yet.",
    kindAria: "Ranking type",
    noData: "This hotel has no collector data yet.",
    kinds: {
      vendidos: { title: "Best sellers", hint: "Units sold in the last 7 days." },
      volumen: { title: "Most credits traded", hint: "Credits spent on sales in the last 7 days." },
      subas: { title: "Biggest risers", hint: "Average of the last 7 days vs. the 7 before (at least 5 sales each week)." },
      bajas: { title: "Biggest fallers", hint: "Average of the last 7 days vs. the 7 before (at least 5 sales each week)." },
      caros: { title: "Most expensive", hint: "Highest average sale price (with at least 1 sale in 30 days)." },
      ofertados: { title: "Most listed", hint: "Number of open offers at scan time." },
    },
  },
  deals: {
    metaTitle: "Deals found",
    title: (label) => `Deals found on ${label}`,
    intro: (o) =>
      `Furni whose lowest listed price was at least ${o.pct}% below what was paid over the last week. Only furni with recent sales count (${o.sold7} or more in 7 days and ${o.sold30} or more in 30), worth ${o.ref} credits or more, and without too many offers (if more are listed than sold, a low price isn't a bargain: nobody is buying).`,
    notice: (
      <>
        The Habbo API reports the lowest price and the number of offers at the time of the lookup, not each listing separately.
        A deal on this list may have sold after the scan: use <strong>Check live</strong> before you go into the game.
      </>
    ),
    channelsTitle: "Get these deals sent to you",
    forYourList: "Found for your list",
    configure: "Set up alerts",
  },
  alerts: {
    metaTitle: "Price alerts",
    title: "Price alerts",
    intro:
      "Pick the furni you care about and we'll let you know when someone lists one cheap: below what people usually pay, or at the price you set.",
    how: (
      <>
        <strong className="text-text">How it works.</strong> Every few minutes we look at the cheapest listing of each furni on
        your list. If it meets your condition, we let you know. If someone lists it cheap and someone else buys it before we
        look again, that alert won&apos;t arrive.
      </>
    ),
    channelsTitle: "Prefer Discord, Telegram or WhatsApp?",
    channelsNote: "Join with one tap. We post the strongest deals from each scan there for everyone (not your personal list).",
  },
  item: {
    notFoundTitle: "Furni not found",
    metaDesc: (name, label) => `Lowest price, open offers, average and history of ${name} on the ${label} Marketplace.`,
    catalogPending: "This hotel's catalog hasn't been downloaded yet. Check back soon.",
    breadcrumb: "Breadcrumb",
    home: "Home",
    wall: "Wall item",
    floor: "Floor item",
    line: (l) => `Line: ${l}`,
    hotel: (label) => `${label} hotel`,
    otherHotels: "See on other hotels:",
    ownEconomy: "(each hotel has its own economy)",
    loadingAria: "Loading furni",
    category: {
      chair: "Seat",
      table: "Table",
      lighting: "Lighting",
      divider: "Divider",
      gate: "Gate",
      bed: "Bed",
      rug: "Rug",
      shelf: "Shelf",
      wired: "Wired",
      games: "Games",
      pets: "Pets",
      trophy: "Trophy",
      music: "Music",
      floor: "Floor",
      wall_decoration: "Wall decoration",
      other: "Other",
    },
  },
  search: {
    metaTitle: "Search furni",
    title: "Search furni",
    nftMetaTitle: "Search NFTs",
    nftTitle: "Search NFTs",
    min2: "Type at least 2 letters.",
    none: (q) => `No tradable furni found for «${q}».`,
    noneNft: (q) => `No NFTs found for «${q}».`,
    first60: "First 60 results",
    results: (n) => `${n} results`,
    forQ: (q) => ` for «${q}»`,
    noOpenOffers: "no open offers",
    noMarket: "no market data yet",
    floor: (v) => `floor ${v}`,
    noListings: "no listings",
    sales7: (n) => `${n} sales in 7 d`,
  },
  about: {
    metaTitle: "Data & limits",
    title: "Which data is real and what its limits are",
    sourcesTitle: "Where the data comes from",
    sources: (
      <>
        <p>
          Everything comes from <strong>Habbo&apos;s public, documented API</strong> (the Marketplace stats endpoint, documented
          in its official Swagger) and each hotel&apos;s public <strong>furnidata</strong>, which has the names and the list of
          tradable furni. No accounts, passwords or user data are used, and the game website isn&apos;t scraped.
        </p>
        <p>Furni icons are shown straight from Habbo&apos;s image server; this site doesn&apos;t copy or host them.</p>
      </>
    ),
    freshTitle: "How fresh each piece of data is",
    fresh: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Furni page:</strong> your browser queries the API right then (lowest listed price, open offers and the last 30
          days of sales). The response is reused for 1 minute.
        </li>
        <li>
          <strong>Daily history:</strong> Habbo provides it grouped by day up to yesterday; today doesn&apos;t show up yet.
        </li>
        <li>
          <strong>Rankings and deals:</strong> they come from the collector, which goes through the catalog in parts. Each furni
          shows the data from its latest scan; the most active ones are refreshed more often. The collector runs every 3 hours
          on each hotel and, in lists, the lowest price and offers of what&apos;s on screen are checked live with Habbo (marked
          with a green dot).
        </li>
        <li>
          <strong>History beyond 30 days and of the lowest listed price:</strong> this site has been saving it since it started
          collecting; there&apos;s no data before that.
        </li>
      </ul>
    ),
    scanLine: (label, ago, scanned, requests, catalog) => (
      <>
        {label} hotel: last run {ago}, with {scanned} furni checked in {requests} requests. Catalog: {catalog} tradable furni.
      </>
    ),
    limitsTitle: "Limits worth knowing",
    limits: (label) => (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>It isn&apos;t real time for each listing.</strong> The API reports the lowest listed price and how many offers
          exist at lookup time. It doesn&apos;t show each offer, who listed it, or when.
        </li>
        <li>
          <strong>The API rate-limits requests</strong> (we measured about 15 to 20 per minute per connection, with up to 25 +
          25 furni per request). That&apos;s why the collector goes slowly and covers the catalog in parts.
        </li>
        <li>
          <strong>Averages:</strong> the 7-day average is weighted by units sold. With few sales, one odd price can move it a
          lot; risers and fallers require at least 5 sales per week.
        </li>
        <li>Each hotel has its own economy: {label} prices can&apos;t be compared with other hotels.</li>
        <li>Data may be wrong or delayed. Don&apos;t use it as your only reference for buying or selling.</li>
      </ul>
    ),
    privacyTitle: "Privacy",
    privacy:
      "Your alert list is saved in your browser and, if you create an account, in your account too. No ads and no tracking cookies. Live lookups go from your browser straight to the Habbo API, without sending cookies. Details in «Privacy & cookies».",
    legalTitle: "Legal notice",
    legal:
      "Bomhams Market was created by the BOMHAMS community and is free and non-commercial. It is not official and is not affiliated with, sponsored or endorsed by Sulake Oy or Azerion. Habbo and the furni names and images are property of Sulake Oy. If Sulake asks for any content to be removed, it will be removed.",
  },
  privacy: {
    metaTitle: "Privacy & cookies",
    metaDesc: "What Bomhams Market stores, where, and how to delete it. No ads, no tracking.",
    title: "Privacy & cookies",
    intro: "Bomhams Market has no ads or tracking, doesn't sell data and only asks for your email if you create an account. This is everything that gets stored and where.",
    sections: [
      {
        title: "In your browser (necessary)",
        items: [
          "Your alert list, the deals found and their settings. They stay saved even if you close the tab or turn off your computer, and they're deleted if you clear this site's data in your browser.",
          "A log of the last few minutes of live lookups to Habbo, so we stay under Habbo's limit.",
          "Your cookie choice.",
        ],
      },
      {
        title: "Preferences (only if you accept)",
        items: [
          "The fm_lang cookie, with the language you picked, so the home page opens in that language. It lasts 1 year.",
          "If you turn off the star background or pick the catalog image size, it's remembered for your next visit.",
        ],
      },
      {
        title: "If you create an account",
        items: [
          "We store your username, your email, your encrypted password (nobody can read it, not even the site admin), your alert list and the creation and last sign-in dates. Nothing else.",
          "The bm_session session cookie, needed to keep you signed in. The page can't read it, and it lasts 30 days or until you sign out.",
          "You can delete your account and all its data at any time from «My account».",
          "Your email is only used to confirm it's yours and to send you your username and a link if you forget your password. We don't send ads or share it with anyone. The site admin only sees part of it (for example lu***@gmail.com).",
          "Don't reuse your Habbo password or any other site's password.",
        ],
      },
      {
        title: "Services involved",
        items: [
          "Vercel hosts the site: like any server, it receives your IP address and logs requests for security for a short time.",
          "Upstash stores the accounts (a database connected through Vercel).",
          "Account emails (confirming your email and recovering your account) go out through the site's email service, which receives your address only to deliver them.",
          "Your browser checks live prices directly with Habbo and Immutable, without sending them cookies. Furni images come from Habbo's servers.",
        ],
      },
    ],
    change: "To change your cookie choice, tap «Cookies» in the footer.",
  },
  nft: {
    banner: (marketLink) => (
      <>
        <strong className="text-text">NFT section</strong>: Habbo&apos;s official collectibles on the Immutable blockchain,
        bought with cryptocurrency (prices in dollars). These are not the in-game Marketplace furni: for that, go to{" "}
        {marketLink}.
      </>
    ),
    marketLink: "Marketplace (credits)",
    footerData:
      "Data from the public Immutable zkEVM API; images served by Habbo (nft-tokens.habbo.com). Bomhams Market is not official or affiliated with Sulake Oy, Azerion or Immutable.",
    footerRisk:
      "This is not financial advice. NFT prices change fast and can drop to zero; dollar amounts are approximate, based on the exchange rate at the time.",
    collections: {
      furni: "Furni NFTs",
      ropa: "Clothes NFTs",
      mascotas: "Pet NFTs",
      tokens: "Token NFTs",
      addons: "Add-on NFTs",
    },
    home: {
      kicker: "NFT · Immutable zkEVM blockchain",
      title: "Prices and sales of Habbo's official NFTs",
      intro:
        "Collectible furni, clothes, pets, tokens and add-ons: floor price (the cheapest listing), best buy offer, weekly sales and price history, in dollars.",
      lastScan: "Last scan",
      rate: (v) => `Rate used: 1 ETH ≈ ${v}.`,
      liveNote: "Each NFT page is checked live.",
      where: "Where does the data come from?",
      noScans: "No scans saved for the NFT section yet.",
      noData: "The NFT section has no collector data yet.",
      summaryAria: "NFT summary",
      listed: "Models for sale",
      sales: "Sales",
      last7: "last 7 days",
      volume: "Dollars traded",
      models: "Models with data",
      modelsSub: "for sale or sold in 30 days",
      collectionsTitle: "Collections",
      collectionsHint: "Habbo's 5 official collections on Immutable",
      colListed: (n, floor) => `${n} for sale · from ${floor}`,
      colSales: (n, v) => `${n} sales · ${v} in 7 days`,
      bestSellers: "Best sellers",
      bestSellersHint: "Units in the last 7 days",
      noSales: "No sales recorded yet.",
      deals: "Deals",
      dealsHint: "Floor well below the weekly average",
      noDeals: "No strong deals in the last scan.",
      ups: "Biggest risers",
      downs: "Biggest fallers",
      changeHint: "7-day average vs. previous week",
      needWeek: "One more week of data is needed.",
    },
    list: {
      metric: {
        s7: "Sold 7 d",
        v7: "USD 7 d",
        change: "Change",
        floor: "Floor price",
        discount: "Below average",
        a30: "30 d average",
      },
      floor: (v) => `floor ${v}`,
      noListings: "no listings",
      empty: "Not enough data for this list yet.",
      colFloor: "Floor price",
      colAvg7: "7 d average",
      colSold7: "Sold 7 d",
      col30: "30 days",
    },
    rankings: {
      metaTitle: "Rankings",
      title: "NFT rankings",
      collectionMeta: "Collection",
      lastScan: "Last scan",
      prices: ". Prices in dollars (approximate).",
      noScans: "No scans saved yet.",
      kindAria: "Ranking type",
      kinds: {
        vendidos: { title: "Best sellers", hint: "Units sold in the last 7 days." },
        volumen: { title: "Most dollars traded", hint: "Total paid in sales over the last 7 days (USD)." },
        subas: { title: "Biggest risers", hint: "7-day average sale price vs. the 7 days before (at least 3 sales each week)." },
        bajas: { title: "Biggest fallers", hint: "7-day average sale price vs. the 7 days before (at least 3 sales each week)." },
        ofertas: {
          title: "Deals",
          hint: "Floor price at least 30% below what was paid on average this week (with 3 or more sales).",
        },
        caros: {
          title: "Most expensive",
          hint: "Highest average sale price in 30 days (with 2 or more sales). Real sales are used instead of the floor, because some listings have absurd prices nobody pays.",
        },
      },
    },
    item: {
      notFoundTitle: "NFT not found",
      metaDesc: (name) => `Floor price, sales and history of the Habbo NFT ${name} on Immutable.`,
      origin: (s) => `Source: ${s}`,
      set: (s) => `Set: ${s}`,
      supply: (n) => `${n} exist`,
      buy: (link) => (
        <>
          This NFT is bought and sold with cryptocurrency on the Immutable marketplace (for example through {link}). You
          can&apos;t get it with in-game credits.
        </>
      ),
    },
    about: {
      metaTitle: "Data & limits",
      title: "NFT section: where the data comes from",
      whatTitle: "What this section is",
      what: (marketLink) => (
        <p>
          It shows <strong>Habbo&apos;s official NFT collectibles</strong>, which live on the <strong>Immutable zkEVM</strong>{" "}
          blockchain and are bought and sold with cryptocurrency. It is separate from the {marketLink}, where furni are paid for
          with credits. Prices in one section can&apos;t be compared with the other.
        </p>
      ),
      marketLink: "in-game Marketplace",
      sourcesTitle: "Sources",
      sources: (eth) => (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Public Immutable zkEVM API</strong> (no keys or accounts): models for sale, floor price, best buy offers,
            last sale and each collection&apos;s sales history. We respect its published limit of 5 requests per second.
          </li>
          <li>
            <strong>Exchange rates</strong> for ETH, IMX and USDC to dollars: Immutable&apos;s conversion service.
            {eth ? ` At the last scan, 1 ETH ≈ ${eth}.` : ""}
          </li>
          <li>
            <strong>Images</strong>: served directly by Habbo from nft-tokens.habbo.com.
          </li>
        </ul>
      ),
      included: "Collections included:",
      freshTitle: "How fresh each piece of data is",
      fresh: (ago) => (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>NFT page:</strong> the floor price, best offer and listings are checked live from your browser.
          </li>
          <li>
            <strong>Rankings and sales per day:</strong> they come from the collector{ago ? <> (last scan {ago})</> : null}. Sales
            are saved since it started running; the first scan loaded the previous 14 days.
          </li>
          <li>
            <strong>Dollars:</strong> sales are paid in ETH (or IMX/USDC) and converted to dollars at the rate at scan time, so
            they are approximate.
          </li>
        </ul>
      ),
      limitsTitle: "Limits",
      limits: (
        <ul className="list-disc space-y-1 pl-5">
          <li>Only Immutable zkEVM collections. Those on the previous network (Immutable X) are no longer available in its API.</li>
          <li>Habbo&apos;s NFT avatars on Ethereum aren&apos;t included: their data requires services with access keys.</li>
          <li>Some listings have absurd prices nobody pays: that&apos;s why «Most expensive» uses real sales, not the floor.</li>
          <li>Sales between wallets of the same person or at odd prices also count toward the averages.</li>
        </ul>
      ),
      noticeTitle: "Notice",
      notice:
        "This is not financial advice. NFTs are volatile assets: their price can change a lot or drop to zero. Bomhams Market doesn't sell, buy or hold anything; it only shows public data. It is not an official site of Habbo, Sulake, Azerion or Immutable.",
    },
  },
};
