import {
  detectFvg,
  hasStrongRejection,
  pipSize,
  recentHigh,
  recentLow,
  roundPrice
} from "./indicators";
import type { AppConfig } from "./config";
import type { Candle, Direction, MarketBias, TradingSignal } from "./types";

export function detectMarketBias(candles: Candle[]): MarketBias {
  if (candles.length < 40) {
    return { direction: "neutral", reason: "Not enough bias candles" };
  }

  const previous = candles.slice(-40, -20);
  const current = candles.slice(-20);
  const previousHigh = Math.max(...previous.map((candle) => candle.high));
  const previousLow = Math.min(...previous.map((candle) => candle.low));
  const currentHigh = Math.max(...current.map((candle) => candle.high));
  const currentLow = Math.min(...current.map((candle) => candle.low));

  if (currentHigh > previousHigh && currentLow > previousLow) {
    return { direction: "buy", reason: "M15 structure is making higher high and higher low" };
  }

  if (currentHigh < previousHigh && currentLow < previousLow) {
    return { direction: "sell", reason: "M15 structure is making lower high and lower low" };
  }

  return { direction: "neutral", reason: "M15 structure is mixed" };
}

export function findTradingSignal(params: {
  symbol: string;
  entryTimeframe: string;
  entryCandles: Candle[];
  biasCandles: Candle[];
  config: AppConfig;
}): TradingSignal | null {
  const { symbol, entryTimeframe, entryCandles, biasCandles, config } = params;
  if (entryCandles.length < 30) return null;

  const bias = detectMarketBias(biasCandles);
  if (bias.direction === "neutral") return null;

  const closedCandles = entryCandles.slice(0, -1);
  const signalCandle = closedCandles.at(-1);
  if (!signalCandle) return null;

  const sweepSignal = detectLiquiditySweep({
    candles: closedCandles,
    direction: bias.direction,
    symbol,
    config
  });

  if (sweepSignal) {
    return buildSignal({
      symbol,
      timeframe: entryTimeframe,
      setup: "Liquidity Sweep + PA Rejection",
      direction: sweepSignal.direction,
      entry: signalCandle.close,
      stopLoss: sweepSignal.stopLoss,
      candle: signalCandle,
      bias,
      config,
      notes: sweepSignal.notes
    });
  }

  const fvgSignal = detectFvgPullback({
    candles: closedCandles,
    direction: bias.direction,
    symbol,
    config
  });

  if (fvgSignal) {
    return buildSignal({
      symbol,
      timeframe: entryTimeframe,
      setup: "FVG Pullback + PA Rejection",
      direction: fvgSignal.direction,
      entry: signalCandle.close,
      stopLoss: fvgSignal.stopLoss,
      candle: signalCandle,
      bias,
      config,
      notes: fvgSignal.notes
    });
  }

  return null;
}

function detectLiquiditySweep(params: {
  candles: Candle[];
  direction: Direction;
  symbol: string;
  config: AppConfig;
}): { direction: Direction; stopLoss: number; notes: string[] } | null {
  const { candles, direction, symbol, config } = params;
  const signal = candles.at(-1);
  if (!signal) return null;

  const lookback = candles.slice(-22, -1);
  if (lookback.length < 12) return null;

  const buffer = pipSize(symbol) * config.slBufferPips;
  const high = recentHigh(lookback, lookback.length);
  const low = recentLow(lookback, lookback.length);

  if (direction === "buy") {
    const sweptLow = signal.low < low - buffer;
    const closedBackInside = signal.close > low;
    if (sweptLow && closedBackInside && hasStrongRejection(signal, "buy")) {
      return {
        direction: "buy",
        stopLoss: roundPrice(signal.low - buffer, symbol),
        notes: ["Price swept recent low liquidity", "Candle closed back inside range", "Bullish rejection confirmed"]
      };
    }
  }

  if (direction === "sell") {
    const sweptHigh = signal.high > high + buffer;
    const closedBackInside = signal.close < high;
    if (sweptHigh && closedBackInside && hasStrongRejection(signal, "sell")) {
      return {
        direction: "sell",
        stopLoss: roundPrice(signal.high + buffer, symbol),
        notes: ["Price swept recent high liquidity", "Candle closed back inside range", "Bearish rejection confirmed"]
      };
    }
  }

  return null;
}

function detectFvgPullback(params: {
  candles: Candle[];
  direction: Direction;
  symbol: string;
  config: AppConfig;
}): { direction: Direction; stopLoss: number; notes: string[] } | null {
  const { candles, direction, symbol, config } = params;
  const signal = candles.at(-1);
  if (!signal) return null;

  const buffer = pipSize(symbol) * config.slBufferPips;
  const fvg = detectFvg(candles.slice(-8, -5));
  if (!fvg || fvg.direction !== direction) return null;

  const touchedZone = signal.low <= fvg.top && signal.high >= fvg.bottom;
  if (!touchedZone || !hasStrongRejection(signal, direction)) return null;

  if (direction === "buy") {
    return {
      direction,
      stopLoss: roundPrice(Math.min(signal.low, fvg.bottom) - buffer, symbol),
      notes: ["Price pulled back into bullish FVG", "Bullish rejection confirmed"]
    };
  }

  return {
    direction,
    stopLoss: roundPrice(Math.max(signal.high, fvg.top) + buffer, symbol),
    notes: ["Price pulled back into bearish FVG", "Bearish rejection confirmed"]
  };
}

function buildSignal(params: {
  symbol: string;
  timeframe: string;
  setup: string;
  direction: Direction;
  entry: number;
  stopLoss: number;
  candle: Candle;
  bias: MarketBias;
  config: AppConfig;
  notes: string[];
}): TradingSignal | null {
  const risk = Math.abs(params.entry - params.stopLoss);
  if (risk <= 0) return null;

  const reward = risk * params.config.riskRewardTarget;
  const takeProfit2 =
    params.direction === "buy" ? params.entry + reward : params.entry - reward;
  const takeProfit1 =
    params.direction === "buy" ? params.entry + risk : params.entry - risk;

  return {
    id: [
      params.symbol.replace("/", ""),
      params.timeframe,
      params.candle.time,
      params.direction,
      params.setup.replaceAll(" ", "-")
    ].join(":"),
    symbol: params.symbol,
    timeframe: params.timeframe,
    direction: params.direction,
    setup: params.setup,
    bias: params.bias,
    entry: roundPrice(params.entry, params.symbol),
    stopLoss: roundPrice(params.stopLoss, params.symbol),
    takeProfit1: roundPrice(takeProfit1, params.symbol),
    takeProfit2: roundPrice(takeProfit2, params.symbol),
    riskReward: params.config.riskRewardTarget,
    candleTime: params.candle.time,
    notes: params.notes
  };
}
