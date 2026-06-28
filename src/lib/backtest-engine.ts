import { findTradingSignal } from "./signal-engine";
import type { AppConfig } from "./config";
import type { Candle, TradingSignal } from "./types";

export type BacktestTrade = {
  signal: TradingSignal;
  exitTime: string;
  exitPrice: number;
  result: "win" | "loss" | "timeout";
  rMultiple: number;
  barsHeld: number;
};

export type BacktestResult = {
  trades: BacktestTrade[];
  stats: {
    trades: number;
    wins: number;
    losses: number;
    timeouts: number;
    winRate: number;
    netR: number;
    averageR: number;
    maxLosingStreak: number;
  };
};

export function runBacktest(params: {
  symbol: string;
  entryTimeframe: string;
  entryCandles: Candle[];
  biasCandles: Candle[];
  config: AppConfig;
  maxBarsHeld?: number;
}): BacktestResult {
  const { symbol, entryTimeframe, entryCandles, biasCandles, config } = params;
  const maxBarsHeld = params.maxBarsHeld ?? 36;
  const trades: BacktestTrade[] = [];
  const seenSignals = new Set<string>();

  for (let index = 50; index < entryCandles.length - 2; index += 1) {
    const signalTime = Date.parse(entryCandles[index].time);
    const biasSlice = biasCandles.filter((candle) => Date.parse(candle.time) <= signalTime);
    if (biasSlice.length < 40) continue;

    const signal = findTradingSignal({
      symbol,
      entryTimeframe,
      entryCandles: entryCandles.slice(0, index + 2),
      biasCandles: biasSlice,
      config
    });

    if (!signal || seenSignals.has(signal.id)) continue;
    seenSignals.add(signal.id);

    const trade = simulateTrade({
      signal,
      futureCandles: entryCandles.slice(index + 1),
      maxBarsHeld
    });
    trades.push(trade);
  }

  return {
    trades,
    stats: summarizeTrades(trades)
  };
}

function simulateTrade(params: {
  signal: TradingSignal;
  futureCandles: Candle[];
  maxBarsHeld: number;
}): BacktestTrade {
  const { signal, futureCandles, maxBarsHeld } = params;
  const risk = Math.abs(signal.entry - signal.stopLoss);
  const direction = signal.direction;
  const candlesToCheck = futureCandles.slice(0, maxBarsHeld);

  for (let index = 0; index < candlesToCheck.length; index += 1) {
    const candle = candlesToCheck[index];
    const hitStop = direction === "buy" ? candle.low <= signal.stopLoss : candle.high >= signal.stopLoss;
    const hitTarget = direction === "buy" ? candle.high >= signal.takeProfit2 : candle.low <= signal.takeProfit2;

    if (hitStop && hitTarget) {
      return {
        signal,
        exitTime: candle.time,
        exitPrice: signal.stopLoss,
        result: "loss",
        rMultiple: -1,
        barsHeld: index + 1
      };
    }

    if (hitTarget) {
      return {
        signal,
        exitTime: candle.time,
        exitPrice: signal.takeProfit2,
        result: "win",
        rMultiple: signal.riskReward,
        barsHeld: index + 1
      };
    }

    if (hitStop) {
      return {
        signal,
        exitTime: candle.time,
        exitPrice: signal.stopLoss,
        result: "loss",
        rMultiple: -1,
        barsHeld: index + 1
      };
    }
  }

  const last = candlesToCheck.at(-1) ?? futureCandles[0];
  const exitPrice = last?.close ?? signal.entry;
  const signedMove = direction === "buy" ? exitPrice - signal.entry : signal.entry - exitPrice;

  return {
    signal,
    exitTime: last?.time ?? signal.candleTime,
    exitPrice,
    result: "timeout",
    rMultiple: risk > 0 ? signedMove / risk : 0,
    barsHeld: candlesToCheck.length
  };
}

function summarizeTrades(trades: BacktestTrade[]): BacktestResult["stats"] {
  const wins = trades.filter((trade) => trade.result === "win").length;
  const losses = trades.filter((trade) => trade.result === "loss").length;
  const timeouts = trades.filter((trade) => trade.result === "timeout").length;
  const netR = trades.reduce((sum, trade) => sum + trade.rMultiple, 0);
  let currentLosingStreak = 0;
  let maxLosingStreak = 0;

  for (const trade of trades) {
    if (trade.rMultiple < 0) {
      currentLosingStreak += 1;
      maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
    } else {
      currentLosingStreak = 0;
    }
  }

  return {
    trades: trades.length,
    wins,
    losses,
    timeouts,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    netR,
    averageR: trades.length ? netR / trades.length : 0,
    maxLosingStreak
  };
}
