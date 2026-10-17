import { revalidateTag } from "next/cache";
import { runNftScan } from "@/lib/nft/scan";
import { forgetNft } from "@/lib/nft/views";
import { isAuthorizedCron } from "@/lib/server/cron-auth";

// La corrida diaria tarda ~30-60 s; la primera puede tardar más (carga 7 días de ventas).
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return Response.json({ error: "no autorizado" }, { status: 401 });
  const started = Date.now();
  try {
    const summary = await runNftScan({
      deadline: started + 270_000,
      maxSalePages: 60,
      log: (m) => console.log(`[nft] ${m}`),
    });
    forgetNft();
    revalidateTag("nft", "max");
    return Response.json({ status: "done", seconds: Math.round((Date.now() - started) / 1000), scan: summary.scan });
  } catch (error) {
    console.error("[nft]", error);
    return Response.json({ status: "error", error: (error as Error).message }, { status: 500 });
  }
}
