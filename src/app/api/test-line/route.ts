import { getConfig, requireSecret } from "@/lib/config";
import { pushLineMessage } from "@/lib/line";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getConfig();
  const unauthorized = requireSecret(request, config.scanSecret);
  if (unauthorized) return unauthorized;

  await pushLineMessage({
    accessToken: config.lineChannelAccessToken,
    targetId: config.lineTargetId,
    message: `LEO Alert test message\nSymbol: ${config.symbol}\nStatus: connected`
  });

  return Response.json({ ok: true, sent: true });
}
