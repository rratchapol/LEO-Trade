import { detectFvg, hasStrongRejection, pipSize, recentHigh, recentLow, roundPrice } from "./indicators";
import { detectMarketBias } from "./signal-engine";
import type { AppConfig } from "./config";
import type { Candle, ChecklistItem, Direction, MarketReport } from "./types";

export function buildMarketReport(params: {
  symbol: string;
  entryCandles: Candle[];
  biasCandles: Candle[];
  config: AppConfig;
}): MarketReport {
  const { symbol, entryCandles, biasCandles, config } = params;
  const closedEntryCandles = entryCandles.slice(0, -1);
  const latest = closedEntryCandles.at(-1);
  if (!latest) {
    throw new Error("Not enough entry candles for report");
  }

  const bias = detectMarketBias(biasCandles);
  const trend = bias.direction === "buy" ? "uptrend" : bias.direction === "sell" ? "downtrend" : "sideway";
  const trendLabel = trend === "uptrend" ? "ขาขึ้น" : trend === "downtrend" ? "ขาลง" : "sideway / ยังไม่ชัด";

  const rangeCandles = closedEntryCandles.slice(-48);
  const rangeHigh = recentHigh(rangeCandles, rangeCandles.length);
  const rangeLow = recentLow(rangeCandles, rangeCandles.length);
  const pip = pipSize(symbol);
  const rangePips = (rangeHigh - rangeLow) / pip;

  const checklist = buildChecklist({
    symbol,
    closedEntryCandles,
    latest,
    rangeHigh,
    rangeLow,
    biasDirection: bias.direction,
    config
  });

  const checklistPassed = checklist.filter((item) => item.passed).length;
  const notes = buildReportNotes(checklist, trend);

  return {
    symbol,
    generatedAt: formatInTimezone(new Date(), config.reportTimezone),
    timezone: config.reportTimezone,
    trend,
    trendLabel,
    bias,
    currentPrice: roundPrice(latest.close, symbol),
    rangeHigh: roundPrice(rangeHigh, symbol),
    rangeLow: roundPrice(rangeLow, symbol),
    rangePips: Number(rangePips.toFixed(1)),
    checklistPassed,
    checklistTotal: checklist.length,
    checklist,
    notes
  };
}

function buildChecklist(params: {
  symbol: string;
  closedEntryCandles: Candle[];
  latest: Candle;
  rangeHigh: number;
  rangeLow: number;
  biasDirection: Direction | "neutral";
  config: AppConfig;
}): ChecklistItem[] {
  const { symbol, closedEntryCandles, latest, rangeHigh, rangeLow, biasDirection, config } = params;
  const range = rangeHigh - rangeLow;
  const pip = pipSize(symbol);
  const buffer = pip * config.slBufferPips;
  const recent = closedEntryCandles.slice(-22, -1);
  const recentHighValue = recentHigh(recent, recent.length);
  const recentLowValue = recentLow(recent, recent.length);
  const fvg = detectRecentFvg(closedEntryCandles);
  const alignedFvg = fvg && biasDirection !== "neutral" && fvg.direction === biasDirection;
  const nearRangeEdge =
    range > 0 &&
    (Math.abs(latest.close - rangeHigh) / range <= 0.2 || Math.abs(latest.close - rangeLow) / range <= 0.2);

  const sweptLow = latest.low < recentLowValue - buffer && latest.close > recentLowValue;
  const sweptHigh = latest.high > recentHighValue + buffer && latest.close < recentHighValue;
  const hasSweep = sweptLow || sweptHigh;
  const triggerDirection = biasDirection === "neutral" ? inferDirectionFromCandle(latest) : biasDirection;
  const hasTrigger = triggerDirection ? hasStrongRejection(latest, triggerDirection) : false;

  const riskRoom = estimateRiskRoom({
    latest,
    symbol,
    direction: biasDirection,
    rangeHigh,
    rangeLow,
    buffer,
    targetR: config.riskRewardTarget
  });

  return [
    {
      name: "Bias",
      passed: biasDirection !== "neutral",
      detail:
        biasDirection === "buy"
          ? "M15 เอนเอียงฝั่ง buy"
          : biasDirection === "sell"
            ? "M15 เอนเอียงฝั่ง sell"
            : "M15 ยัง mixed"
    },
    {
      name: "Zone",
      passed: Boolean(alignedFvg || hasSweep || nearRangeEdge),
      detail: alignedFvg
        ? "มี FVG ล่าสุดที่ตรงกับ bias"
        : hasSweep
          ? "แท่งล่าสุดมี sweep liquidity"
          : nearRangeEdge
            ? "ราคาอยู่ใกล้ขอบกรอบ"
            : "ยังไม่ชิด FVG/liquidity/range edge"
    },
    {
      name: "Trigger",
      passed: hasTrigger,
      detail: hasTrigger ? "แท่งล่าสุดมี PA rejection" : "ยังไม่มี PA rejection ชัด"
    },
    {
      name: "Risk/RR",
      passed: riskRoom.passed,
      detail: riskRoom.detail
    },
    {
      name: "Execute",
      passed: biasDirection !== "neutral" && Boolean(alignedFvg || hasSweep || nearRangeEdge) && hasTrigger && riskRoom.passed,
      detail: "ผ่านเมื่อ Bias + Zone + Trigger + Risk/RR ครบ"
    }
  ];
}

function detectRecentFvg(candles: Candle[]): { direction: Direction; top: number; bottom: number } | null {
  for (let end = candles.length; end >= Math.max(3, candles.length - 10); end -= 1) {
    const fvg = detectFvg(candles.slice(end - 3, end));
    if (fvg) return fvg;
  }
  return null;
}

function inferDirectionFromCandle(candle: Candle): Direction | null {
  if (candle.close > candle.open) return "buy";
  if (candle.close < candle.open) return "sell";
  return null;
}

function estimateRiskRoom(params: {
  latest: Candle;
  symbol: string;
  direction: Direction | "neutral";
  rangeHigh: number;
  rangeLow: number;
  buffer: number;
  targetR: number;
}): { passed: boolean; detail: string } {
  const { latest, symbol, direction, rangeHigh, rangeLow, buffer, targetR } = params;
  const pip = pipSize(symbol);
  if (direction === "neutral") {
    return { passed: false, detail: "ยังไม่มี bias จึงยังประเมิน RR ไม่ได้" };
  }

  const entry = latest.close;
  const stop = direction === "buy" ? latest.low - buffer : latest.high + buffer;
  const target = direction === "buy" ? rangeHigh : rangeLow;
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  const rr = risk > 0 ? reward / risk : 0;

  return {
    passed: rr >= Math.min(targetR, 1.5),
    detail: `พื้นที่ถึงขอบกรอบประมาณ ${rr.toFixed(2)}R (${(risk / pip).toFixed(1)} pips risk)`
  };
}

function buildReportNotes(checklist: ChecklistItem[], trend: MarketReport["trend"]): string[] {
  const execute = checklist.find((item) => item.name === "Execute");
  if (execute?.passed) {
    return ["Checklist ครบพอให้เริ่มมองหา entry ตามแผน แต่ยังต้องดูแท่งปิดและคุม risk"];
  }

  const missing = checklist.filter((item) => !item.passed && item.name !== "Execute").map((item) => item.name);
  return [
    `ยังไม่ครบสำหรับเข้าเทรด ขาด: ${missing.join(", ") || "none"}`,
    trend === "sideway" ? "ถ้าตลาด sideway ให้รอ sweep ขอบกรอบก่อน" : "รอราคาเข้า zone และรอ trigger ชัดก่อน"
  ];
}

function formatInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}
