import type { Candle } from "./types";

type TwelveDataValue = {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
};

type TwelveDataResponse = {
  values?: TwelveDataValue[];
  status?: string;
  message?: string;
  code?: number;
};

export async function fetchForexCandles(params: {
  apiKey: string;
  symbol: string;
  interval: string;
  outputSize?: number;
}): Promise<Candle[]> {
  if (!params.apiKey) {
    throw new Error("TWELVE_DATA_API_KEY is not configured");
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", params.symbol);
  url.searchParams.set("interval", params.interval);
  url.searchParams.set("outputsize", String(params.outputSize ?? 200));
  url.searchParams.set("apikey", params.apiKey);
  url.searchParams.set("format", "JSON");

  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(`Twelve Data request failed: ${response.status}`);
  }

  const data = (await response.json()) as TwelveDataResponse;
  if (!data.values?.length) {
    throw new Error(data.message ?? "Twelve Data returned no candles");
  }

  return data.values
    .map((value) => ({
      time: value.datetime,
      open: Number(value.open),
      high: Number(value.high),
      low: Number(value.low),
      close: Number(value.close)
    }))
    .filter((candle) => [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite))
    .reverse();
}
