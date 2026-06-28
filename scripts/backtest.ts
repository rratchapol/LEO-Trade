import path from "node:path";
import { getConfig } from "../src/lib/config";
import { readCandlesFromCsv } from "../src/lib/csv-candles";
import { runBacktest } from "../src/lib/backtest-engine";

const root = process.cwd();
const entryCsv = process.argv[2] ?? path.join(root, "data", "EURUSD_5min.csv");
const biasCsv = process.argv[3] ?? path.join(root, "data", "EURUSD_15min.csv");

try {
  const config = getConfig();
  const entryCandles = readCandlesFromCsv(entryCsv);
  const biasCandles = readCandlesFromCsv(biasCsv);

  const result = runBacktest({
    symbol: config.symbol,
    entryTimeframe: config.entryTimeframe,
    entryCandles,
    biasCandles,
    config
  });

  printSummary(result);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error("");
  console.error("Expected CSV files:");
  console.error("  data/EURUSD_5min.csv");
  console.error("  data/EURUSD_15min.csv");
  console.error("");
  console.error("Required columns: time, open, high, low, close");
  process.exit(1);
}

function printSummary(result: ReturnType<typeof runBacktest>) {
  const { stats, trades } = result;
  console.log("EUR/USD Backtest");
  console.log("================");
  console.log(`Trades: ${stats.trades}`);
  console.log(`Wins: ${stats.wins}`);
  console.log(`Losses: ${stats.losses}`);
  console.log(`Timeouts: ${stats.timeouts}`);
  console.log(`Win rate: ${stats.winRate.toFixed(2)}%`);
  console.log(`Net R: ${stats.netR.toFixed(2)}R`);
  console.log(`Average R: ${stats.averageR.toFixed(2)}R`);
  console.log(`Max losing streak: ${stats.maxLosingStreak}`);

  console.log("");
  console.log("Last 10 trades");
  console.log("--------------");
  for (const trade of trades.slice(-10)) {
    console.log(
      [
        trade.signal.candleTime,
        trade.signal.direction.toUpperCase(),
        trade.signal.setup,
        `entry=${trade.signal.entry}`,
        `sl=${trade.signal.stopLoss}`,
        `tp2=${trade.signal.takeProfit2}`,
        `result=${trade.result}`,
        `R=${trade.rMultiple.toFixed(2)}`
      ].join(" | ")
    );
  }
}
