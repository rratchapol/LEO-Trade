import { getConfig, requireSecret } from "@/lib/config";
import { formatMarketReportMessage } from "@/lib/format-message";
import { pushLineMessage } from "@/lib/line";
import { buildMarketReport } from "@/lib/market-report";
import { fetchForexCandles } from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = getConfig();
  const unauthorized = requireSecret(request, process.env.CRON_SECRET || config.scanSecret);
  if (unauthorized) return unauthorized;

  const [entryCandles, biasCandles] = await Promise.all([
    fetchForexCandles({
      apiKey: config.twelveDataApiKey,
      symbol: config.symbol,
      interval: config.entryTimeframe,
      outputSize: 120
    }),
    fetchForexCandles({
      apiKey: config.twelveDataApiKey,
      symbol: config.symbol,
      interval: config.biasTimeframe,
      outputSize: 120
    })
  ]);

  const report = buildMarketReport({
    symbol: config.symbol,
    entryCandles,
    biasCandles,
    config
  });

  await pushLineMessage({
    accessToken: config.lineChannelAccessToken,
    targetId: config.lineTargetId,
    message: formatMarketReportMessage(report)
  });

  return Response.json({ ok: true, sent: true, report });
}
