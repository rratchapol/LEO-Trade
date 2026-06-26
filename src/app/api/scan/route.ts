import { getConfig, requireSecret } from "@/lib/config";
import { fetchForexCandles } from "@/lib/market-data";
import { findTradingSignal } from "@/lib/signal-engine";
import { formatSignalMessage } from "@/lib/format-message";
import { pushLineMessage } from "@/lib/line";
import { markSignalSent, wasSignalSent } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = getConfig();
  const unauthorized = requireSecret(request, config.scanSecret);
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

  const signal = findTradingSignal({
    symbol: config.symbol,
    entryTimeframe: config.entryTimeframe,
    entryCandles,
    biasCandles,
    config
  });

  if (!signal) {
    return Response.json({
      ok: true,
      signal: null,
      message: "No setup found"
    });
  }

  if (wasSignalSent(signal.id)) {
    return Response.json({
      ok: true,
      signal,
      sent: false,
      message: "Signal already sent"
    });
  }

  await pushLineMessage({
    accessToken: config.lineChannelAccessToken,
    targetId: config.lineTargetId,
    message: formatSignalMessage(signal)
  });
  markSignalSent(signal.id);

  return Response.json({ ok: true, signal, sent: true });
}
