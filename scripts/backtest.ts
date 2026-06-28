import path from "node:path";
import fs from "node:fs";
import { getConfig } from "../src/lib/config";
import { readCandlesFromCsv } from "../src/lib/csv-candles";
import { runBacktest, type BacktestStats, type BacktestTrade } from "../src/lib/backtest-engine";

const root = process.cwd();
const options = parseArgs(process.argv.slice(2));
const entryCsv = options.files[0] ?? path.join(root, "data", "EURUSD_5min.csv");
const biasCsv = options.files[1] ?? path.join(root, "data", "EURUSD_15min.csv");

try {
  const config = getConfig();
  if (options.symbol) config.symbol = options.symbol;
  if (options.slBufferPips !== undefined) config.slBufferPips = options.slBufferPips;

  const entryCandles = readCandlesFromCsv(entryCsv);
  const biasCandles = readCandlesFromCsv(biasCsv);

  const result = runBacktest({
    symbol: config.symbol,
    entryTimeframe: config.entryTimeframe,
    entryCandles,
    biasCandles,
    config
  });

  printSummary(result, config.symbol);
  if (options.exportPath) {
    exportTradesCsv(result.trades, options.exportPath);
    console.log("");
    console.log(`Exported trades: ${options.exportPath}`);
  }
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

function parseArgs(args: string[]): { files: string[]; symbol?: string; slBufferPips?: number; exportPath?: string } {
  const files: string[] = [];
  let symbol: string | undefined;
  let slBufferPips: number | undefined;
  let exportPath: string | undefined;

  for (const arg of args) {
    if (arg.startsWith("--symbol=")) {
      symbol = arg.slice("--symbol=".length);
    } else if (arg.startsWith("--sl-buffer-pips=")) {
      slBufferPips = Number(arg.slice("--sl-buffer-pips=".length));
    } else if (arg.startsWith("--export=")) {
      exportPath = arg.slice("--export=".length);
    } else {
      files.push(arg);
    }
  }

  return { files, symbol, slBufferPips, exportPath };
}

function printSummary(result: ReturnType<typeof runBacktest>, symbol: string) {
  const { stats, trades } = result;
  console.log(`${symbol} Backtest`);
  console.log("================");
  console.log(`Trades: ${stats.trades}`);
  console.log(`Wins: ${stats.wins}`);
  console.log(`Losses: ${stats.losses}`);
  console.log(`Timeouts: ${stats.timeouts}`);
  console.log(`Win rate: ${stats.winRate.toFixed(2)}%`);
  console.log(`Net R: ${stats.netR.toFixed(2)}R`);
  console.log(`Average R: ${stats.averageR.toFixed(2)}R`);
  console.log(`Max losing streak: ${stats.maxLosingStreak}`);

  printGroupStats("By setup", result.bySetup);
  printGroupStats("By direction", result.byDirection);
  printGroupStats("By session", result.bySession);

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

function printGroupStats(title: string, groups: Record<string, BacktestStats>) {
  console.log("");
  console.log(title);
  console.log("-".repeat(title.length));
  for (const [key, stats] of Object.entries(groups).sort((a, b) => b[1].netR - a[1].netR)) {
    console.log(
      [
        key,
        `trades=${stats.trades}`,
        `WR=${stats.winRate.toFixed(2)}%`,
        `net=${stats.netR.toFixed(2)}R`,
        `avg=${stats.averageR.toFixed(2)}R`,
        `maxLS=${stats.maxLosingStreak}`
      ].join(" | ")
    );
  }
}

function exportTradesCsv(trades: BacktestTrade[], exportPath: string) {
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });
  const header = [
    "signalTime",
    "exitTime",
    "symbol",
    "direction",
    "setup",
    "session",
    "entry",
    "stopLoss",
    "takeProfit1",
    "takeProfit2",
    "exitPrice",
    "result",
    "rMultiple",
    "barsHeld",
    "bias",
    "biasReason"
  ];
  const rows = trades.map((trade) =>
    [
      trade.signal.candleTime,
      trade.exitTime,
      trade.signal.symbol,
      trade.signal.direction,
      trade.signal.setup,
      trade.session,
      trade.signal.entry,
      trade.signal.stopLoss,
      trade.signal.takeProfit1,
      trade.signal.takeProfit2,
      trade.exitPrice,
      trade.result,
      trade.rMultiple.toFixed(4),
      trade.barsHeld,
      trade.signal.bias.direction,
      trade.signal.bias.reason
    ].map(csvCell).join(",")
  );

  fs.writeFileSync(exportPath, [header.join(","), ...rows].join("\n"), "utf8");
}

function csvCell(value: unknown): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
