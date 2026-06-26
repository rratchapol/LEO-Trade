import type { Candle, Direction } from "./types";

export function pipSize(symbol: string): number {
  return symbol.includes("JPY") ? 0.01 : 0.0001;
}

export function roundPrice(price: number, symbol: string): number {
  const digits = symbol.includes("JPY") ? 3 : 5;
  return Number(price.toFixed(digits));
}

export function candleBody(candle: Candle): number {
  return Math.abs(candle.close - candle.open);
}

export function candleRange(candle: Candle): number {
  return candle.high - candle.low;
}

export function upperWick(candle: Candle): number {
  return candle.high - Math.max(candle.open, candle.close);
}

export function lowerWick(candle: Candle): number {
  return Math.min(candle.open, candle.close) - candle.low;
}

export function isBullish(candle: Candle): boolean {
  return candle.close > candle.open;
}

export function isBearish(candle: Candle): boolean {
  return candle.close < candle.open;
}

export function recentHigh(candles: Candle[], lookback: number): number {
  return Math.max(...candles.slice(-lookback).map((candle) => candle.high));
}

export function recentLow(candles: Candle[], lookback: number): number {
  return Math.min(...candles.slice(-lookback).map((candle) => candle.low));
}

export function hasStrongRejection(candle: Candle, direction: Direction): boolean {
  const range = candleRange(candle);
  if (range <= 0) return false;

  const bodyRatio = candleBody(candle) / range;
  if (bodyRatio < 0.45) return false;

  if (direction === "buy") {
    return isBullish(candle) && lowerWick(candle) / range >= 0.25;
  }

  return isBearish(candle) && upperWick(candle) / range >= 0.25;
}

export function detectFvg(candles: Candle[]): { direction: Direction; top: number; bottom: number } | null {
  if (candles.length < 3) return null;
  const [a, , c] = candles.slice(-3);

  if (a.high < c.low) {
    return { direction: "buy", top: c.low, bottom: a.high };
  }

  if (a.low > c.high) {
    return { direction: "sell", top: a.low, bottom: c.high };
  }

  return null;
}
