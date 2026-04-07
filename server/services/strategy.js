import { getMarketQuotes, getPositions, placeOrder, getHistoricalCandlesDaily } from "./upstoxClient.js";

// Risk Management Constants to minimize loss & secure minimal profits
const STOP_LOSS_PCT = 0.02;        // Strict 0.5% max loss per trade
const MINIMAL_PROFIT_PCT = 0.02;    // 1% profit lock-in
const STOCK_QUANTITY_BUY_LIMIT = 2;       // Stock quantity to buy

function getDelta(buyPrice, sellPrice, quantity) {
    return calculateNetPnL(buyPrice, sellPrice, quantity)/100;
}
/**
 * Calculates Net P&L after Upstox Intraday charges
 * Based on 2026 standard fee structure
 */
function calculateNetPnL(buyPrice, sellPrice, quantity) {
    const turnover = (buyPrice + sellPrice) * quantity;
    
    // 1. Brokerage: ₹20 per leg or 0.05% (whichever is lower)
    const buyBrokerage = Math.min(20, buyPrice * quantity * 0.0005);
    const sellBrokerage = Math.min(20, sellPrice * quantity * 0.0005);
    const totalBrokerage = buyBrokerage + sellBrokerage;

    // 2. STT (Securities Transaction Tax): 0.025% on Sell Side only
    const stt = sellPrice * quantity * 0.00025;

    // 3. Transaction Charges (NSE): ~0.00322% of turnover
    const txnCharges = turnover * 0.0000322;

    // 4. SEBI Charges: ₹10 per crore (0.0001%)
    const sebiCharges = turnover * 0.000001;

    // 5. Stamp Duty: 0.003% on Buy Side only
    const stampDuty = buyPrice * quantity * 0.00003;

    // 6. GST: 18% on (Brokerage + Transaction Charges + SEBI Charges)
    const gst = (totalBrokerage + txnCharges + sebiCharges) * 0.18;

    const totalFees = totalBrokerage + stt + txnCharges + sebiCharges + stampDuty + gst;
    const grossPnL = (sellPrice - buyPrice) * quantity;
    return grossPnL - totalFees;
}

function evaluateSells(positions, quotes, companies, options) {
  const sells = [];

  for (const pos of positions) {
    if (pos.quantity <= 0) continue; // Skip closed or short positions

    const instrument = companies.find(c => c.instrument_key === pos.instrument_token);
    if (!instrument) continue;

    const quote = quotes[pos.instrument_token];
    if (!quote) continue;

    const currentPrice = quote.last_price;
    const averagePrice = pos.average_price;
    
    // Net PnL securely calculated after taking an estimated 0.2% round-trip tax/brokerage hit
    const {delta, netPnL, sellPrice} = calculateNetPnL(averagePrice, currentPrice, pos.quantity);

    if (delta <= -STOP_LOSS_PCT) {
      sells.push({
        trading_symbol: instrument.trading_symbol,
        instrument_token: instrument.instrument_key,
        quantity: pos.quantity,
        transaction_type: "SELL",
        reason: `Strict Stop-loss trigger. Net: ${(netPnLPct * 100).toFixed(2)}%`
      });
    } else if (delta >= MINIMAL_PROFIT_PCT) {
      sells.push({
        trading_symbol: instrument.trading_symbol,
        instrument_token: instrument.instrument_key,
        quantity: pos.quantity,
        transaction_type: "SELL",
        reason: `Securing minimal profit. Net: ${(netPnLPct * 100).toFixed(2)}%`
      });
    }
  }

  return sells;
}

async function evaluateBuys(accessToken, positions, quotes, companies, options) {
  const buys = [];
  const activePositions = positions.filter(p => p.quantity > 0);

  const candidates = [];
  for (const company of companies) {
    if (activePositions.some(p => p.instrument_token === company.instrument_key)) continue;

    const quote = quotes[company.instrument_key];
    if (!quote || !quote.ohlc) continue;

    const open = quote.ohlc.open;
    const current = quote.last_price;
    const funds = await getFunds(accessToken);
    
    // Intraday pre-filter: Wait for a small confirmed momentum (>0.5% over today's open price)
    if (open > 0 && current > open * 1.005 && current * STOCK_QUANTITY_BUY_LIMIT < funds.available_funds) {
      candidates.push({
        company,
        current,
        intradayPct: ((current - open) / open) * 100,
      });
    }
  }

  // Sort by momentum (highest first)
  candidates.sort((a, b) => b.intradayPct - a.intradayPct);

  // Prepare date window for historical data check (last 30 days to ensure we hit trading days)
  const toDate = new Date().toISOString().split('T')[0];
  const fromDateObj = new Date();
  fromDateObj.setDate(fromDateObj.getDate() - 20);
  const fromDate = fromDateObj.toISOString().split('T')[0];

  for (const cand of candidates) {
    if (buys.length >= 1) break; // Pick ONLY the safest one to jump into

    try {
      const candles = await getHistoricalCandlesDaily(accessToken, cand.company.instrument_key, fromDate, toDate);
      
      if (candles && candles.length > 0) {
        // Upstox v3 format: [timestamp, open, high, low, close, volume, oi]
        // Index 0 is most recent. We check index 1 (previous day's candle) if available.
        const prevCandle = candles.length > 1 ? candles[1] : candles[0];
        const prevClose = prevCandle[4]; 

        // Historical Confirmation: Current price must also be higher than yesterday's close
        if (cand.current > prevClose) {
          buys.push({
            trading_symbol: cand.company.trading_symbol,
            instrument_token: cand.company.instrument_key,
            quantity: STOCK_QUANTITY_BUY_LIMIT, // Buying 1 qty to preserve Upstox wallet money
            transaction_type: "BUY",
            intradayPct: cand.intradayPct,
            reason: "Risk-averse momentum confirmed with historical uptrend"
          });
        }
      }
    } catch (err) {
      console.warn(`Historical data check failed for ${cand.company.trading_symbol}:`, err.message);
    }
  }

  return buys;
}

export async function computeStrategySignals(accessToken, companies, options = {}) {
  const keys = companies.map(c => c.instrument_key);
  const quotes = await getMarketQuotes(accessToken, keys);
  const positions = await getPositions(accessToken);

  const sells = evaluateSells(positions, quotes, companies, options);
  const buys = await evaluateBuys(accessToken, positions, quotes, companies, options);

  return { buys, sells };
}

export async function executeStrategyOrders(accessToken, companies, options = {}) {
  const signals = await computeStrategySignals(accessToken, companies, options);
  const executed = [];
  const errors = [];

  // Action ALL sells first so Upstox wallet limits are replenished before buying
  const ordersToPlace = [...signals.sells, ...signals.buys];
  
  for (const order of ordersToPlace) {
    try {
      const res = await placeOrder(accessToken, {
        instrument_token: order.instrument_token,
        quantity: order.quantity,
        transaction_type: order.transaction_type,
        order_type: "MARKET", // Market orders to guarantee strict Stop-Loss execution
        product: "I", // 'I' for intraday margins
      });
      executed.push({ ...order, order_id: res.order_id });
    } catch (e) {
      errors.push({ symbol: order.trading_symbol, error: e.message });
    }
  }

  return { executed, errors, signals };
}
