import fs from "node:fs";
import type { Candle } from "./types";

export function readCandlesFromCsv(filePath: string): Candle[] {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];

  const [headerLine, ...lines] = raw.split(/\r?\n/);
  const delimiter = headerLine.includes("\t") ? "\t" : ",";
  const headers = splitCsvLine(headerLine, delimiter).map((header) => normalizeHeader(header));
  const timeIndex = findIndex(headers, ["time", "datetime", "date", "timestamp", "etcutc"]);
  const dateIndex = findIndex(headers, ["date"]);
  const openIndex = findIndex(headers, ["open"]);
  const highIndex = findIndex(headers, ["high"]);
  const lowIndex = findIndex(headers, ["low"]);
  const closeIndex = findIndex(headers, ["close"]);

  if ([openIndex, highIndex, lowIndex, closeIndex].some((index) => index === -1) || (timeIndex === -1 && dateIndex === -1)) {
    throw new Error(`CSV must include time or date+time, plus open/high/low/close columns: ${filePath}`);
  }

  return lines
    .map((line) => splitCsvLine(line, delimiter))
    .filter((columns) => columns.length >= headers.length)
    .map((columns) => ({
      time: buildTime(columns, timeIndex, dateIndex, headers),
      open: Number(columns[openIndex]),
      high: Number(columns[highIndex]),
      low: Number(columns[lowIndex]),
      close: Number(columns[closeIndex])
    }))
    .filter((candle) => [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite))
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[<>]/g, "").replace(/[^a-z]/g, "");
}

function findIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

function buildTime(columns: string[], timeIndex: number, dateIndex: number, headers: string[]): string {
  if (dateIndex !== -1 && timeIndex !== -1 && dateIndex !== timeIndex && headers[timeIndex] === "time") {
    return `${columns[dateIndex].replaceAll(".", "-")}T${columns[timeIndex]}`;
  }

  return columns[timeIndex !== -1 ? timeIndex : dateIndex].replaceAll(".", "-");
}

function splitCsvLine(line: string, delimiter: "," | "\t"): string[] {
  if (delimiter === "\t") {
    return line.split("\t").map((column) => column.trim());
  }

  const columns: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      columns.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  columns.push(current.trim());
  return columns;
}
