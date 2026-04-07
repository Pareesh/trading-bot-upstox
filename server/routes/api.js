import { Router } from "express";
import { config } from "../config.js";
import { requireUpstoxSession, verifySameOrigin } from "../middleware/auth.js";
import { resolveNifty50Instruments } from "../services/nifty50.js";
import { computeStrategySignals, executeStrategyOrders } from "../services/strategy.js";
import { getFunds, getPositions, placeOrder } from "../services/upstoxClient.js";

export const apiRouter = Router();

apiRouter.use(verifySameOrigin);
apiRouter.use(requireUpstoxSession);

apiRouter.get("/nifty50", async (_req, res, next) => {
  try {
    const data = await resolveNifty50Instruments();
    res.json(data);
  } catch (e) {
    next(e);
  }
});

apiRouter.get("/funds", async (req, res, next) => {
  try {
    const funds = await getFunds(req.upstoxAccessToken);
    res.json(funds);
  } catch (e) {
    next(e);
  }
});

apiRouter.get("/strategy", async (req, res, next) => {
  try {
    const data = await resolveNifty50Instruments();
    const signals = await computeStrategySignals(req.upstoxAccessToken, data.companies);
    res.json({ ...signals, nifty: { count: data.count, missingSymbols: data.missingSymbols } });
  } catch (e) {
    next(e);
  }
});

apiRouter.post("/strategy/run", async (req, res, next) => {
  try {
    if (!config.tradingEnabled) {
      return res.status(403).json({
        error: "Live trading is disabled. Set TRADING_ENABLED=true in server .env (you accept execution risk).",
      });
    }
    const data = await resolveNifty50Instruments();
    const result = await executeStrategyOrders(req.upstoxAccessToken, data.companies);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

apiRouter.post("/orders", async (req, res, next) => {
  try {
    const { instrument_token, quantity, transaction_type, product, order_type, price } = req.body || {};
    if (!instrument_token || !quantity || !transaction_type) {
      return res.status(400).json({ error: "instrument_token, quantity, transaction_type required" });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: "quantity must be a positive integer" });
    }
    if (!config.tradingEnabled) {
      return res.status(403).json({
        error: "Live trading is disabled. Set TRADING_ENABLED=true in server .env.",
      });
    }
    const data = await placeOrder(req.upstoxAccessToken, {
      instrument_token,
      quantity: qty,
      transaction_type: String(transaction_type).toUpperCase(),
      product: product || config.strategy.product,
      order_type: order_type || "MARKET",
      price: price != null ? Number(price) : 0,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

apiRouter.get("/positions", async (req, res, next) => {
  try {
    const positions = await getPositions(req.upstoxAccessToken);  
    res.json(positions);
  } catch (e) {
    next(e);
  }
});
