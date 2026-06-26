export type Direction = "buy" | "sell";

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type MarketBias = {
  direction: Direction | "neutral";
  reason: string;
};

export type TradingSignal = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: Direction;
  setup: string;
  bias: MarketBias;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: number;
  candleTime: string;
  notes: string[];
};

export type ChecklistItem = {
  name: string;
  passed: boolean;
  detail: string;
};

export type MarketReport = {
  symbol: string;
  generatedAt: string;
  timezone: string;
  trend: "uptrend" | "downtrend" | "sideway";
  trendLabel: string;
  bias: MarketBias;
  currentPrice: number;
  rangeHigh: number;
  rangeLow: number;
  rangePips: number;
  checklistPassed: number;
  checklistTotal: number;
  checklist: ChecklistItem[];
  notes: string[];
};
