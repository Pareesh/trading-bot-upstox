import zlib from "zlib";
import { promisify } from "util";

const gunzip = promisify(zlib.gunzip);

const NSE_JSON = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";

let cache = { at: 0, instruments: null };
const CACHE_MS = 6 * 60 * 60 * 1000;

export async function loadNseInstruments() {
  const now = Date.now();
  if (cache.instruments && now - cache.at < CACHE_MS) {
    return cache.instruments;
  }
  const res = await fetch(NSE_JSON);
  if (!res.ok) {
    throw new Error(`Failed to download NSE instruments: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const json = JSON.parse((await gunzip(buf)).toString("utf8"));
  cache = { at: now, instruments: json };
  return json;
}

export function pickEquityBySymbols(instruments, symbols) {
  const set = new Set(symbols.map((s) => s.toUpperCase()));
  const out = [];
  for (const row of instruments) {
    if (row.segment !== "NSE_EQ" || row.instrument_type !== "EQ") continue;
    const sym = (row.trading_symbol || "").toUpperCase();
    if (set.has(sym)) {
      out.push({
        trading_symbol: row.trading_symbol,
        name: row.name,
        instrument_key: row.instrument_key,
        segment: row.segment,
        isin: row.isin,
      });
      set.delete(sym);
    }
  }
  return { resolved: out, missing: [...set] };
}
