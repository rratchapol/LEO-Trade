import type { TradingSignal } from "./types";

export function formatSignalMessage(signal: TradingSignal): string {
  const side = signal.direction.toUpperCase();
  return [
    `${signal.symbol} ${signal.timeframe} - ${side} SETUP`,
    "",
    `Setup: ${signal.setup}`,
    `Bias: ${signal.bias.direction.toUpperCase()} - ${signal.bias.reason}`,
    "",
    `Entry: ${signal.entry}`,
    `SL: ${signal.stopLoss}`,
    `TP1: ${signal.takeProfit1}`,
    `TP2: ${signal.takeProfit2}`,
    `R:R: 1:${signal.riskReward}`,
    "",
    `Candle: ${signal.candleTime}`,
    "",
    ...signal.notes.map((note) => `- ${note}`),
    "",
    "รอแท่งปิดยืนยันและคุม risk ก่อนเข้าเสมอ"
  ].join("\n");
}
