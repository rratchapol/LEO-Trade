export type AppConfig = {
  lineChannelAccessToken: string;
  lineTargetId: string;
  twelveDataApiKey: string;
  scanSecret: string;
  symbol: string;
  entryTimeframe: string;
  biasTimeframe: string;
  riskRewardTarget: number;
  slBufferPips: number;
  reportTimezone: string;
};

export function getConfig(): AppConfig {
  return {
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
    lineTargetId: process.env.LINE_TARGET_ID ?? "",
    twelveDataApiKey: process.env.TWELVE_DATA_API_KEY ?? "",
    scanSecret: process.env.SCAN_SECRET ?? "",
    symbol: process.env.SYMBOL ?? "EUR/USD",
    entryTimeframe: process.env.ENTRY_TIMEFRAME ?? "5min",
    biasTimeframe: process.env.BIAS_TIMEFRAME ?? "15min",
    riskRewardTarget: Number(process.env.RISK_REWARD_TARGET ?? 2),
    slBufferPips: Number(process.env.SL_BUFFER_PIPS ?? 1),
    reportTimezone: process.env.REPORT_TIMEZONE ?? "Asia/Bangkok"
  };
}

export function requireSecret(request: Request, configuredSecret: string): Response | null {
  if (!configuredSecret) {
    return Response.json({ error: "SCAN_SECRET is not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const providedSecret = url.searchParams.get("secret") ?? request.headers.get("x-scan-secret") ?? bearerSecret;
  if (providedSecret !== configuredSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
