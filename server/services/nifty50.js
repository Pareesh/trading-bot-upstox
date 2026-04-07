import { readFileSync } from "fs";
import { loadNseInstruments, pickEquityBySymbols } from "./instruments.js";

const symbolsPath = new URL("../data/nifty50-symbols.json", import.meta.url);
const nifty50Symbols = JSON.parse(readFileSync(symbolsPath, "utf8"));

export function getNifty50SymbolList() {
  return [...nifty50Symbols];
}

export async function resolveNifty50Instruments() {
  const instruments = await loadNseInstruments();
  const { resolved, missing } = pickEquityBySymbols(instruments, nifty50Symbols);
  return {
    count: resolved.length,
    companies: resolved.sort((a, b) => a.trading_symbol.localeCompare(b.trading_symbol)),
    missingSymbols: missing,
  };
}
