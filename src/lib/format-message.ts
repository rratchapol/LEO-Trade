import type { MarketReport, TradingSignal } from "./types";

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

export function formatMarketReportMessage(report: MarketReport): string {
  return [
    `${report.symbol} Market Report`,
    `เวลา: ${report.generatedAt} (${report.timezone})`,
    "",
    `Trend: ${report.trendLabel}`,
    `Bias: ${report.bias.direction.toUpperCase()} - ${report.bias.reason}`,
    `Current: ${report.currentPrice}`,
    `Range: ${report.rangeLow} - ${report.rangeHigh} (${report.rangePips} pips)`,
    "",
    `Grade: ${report.setupScore.grade}`,
    `Score: ${report.setupScore.score}/100`,
    `Action: ${report.setupScore.action.toUpperCase()}`,
    "",
    `Checklist: ${report.checklistPassed}/${report.checklistTotal}`,
    ...report.checklist.map((item) => `${item.passed ? "ผ่าน" : "ยังไม่ผ่าน"} - ${item.name}: ${item.detail}`),
    "",
    "Score breakdown:",
    ...report.setupScore.breakdown.map((item) => `${item.name}: ${item.points}/${item.maxPoints}`),
    "",
    ...report.notes,
    "",
    "สูตรอ่าน: Bias -> Zone -> Trigger -> Risk -> Execute"
  ].join("\n");
}
