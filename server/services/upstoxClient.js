import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import config from "../config.js";

const AUTH_BASE = "https://api.upstox.com/v2";
const API_BASE = "https://api.upstox.com/v2";
const API_V3 = "https://api.upstox.com/v3";
const ORDER_BASE = "https://api-hft.upstox.com/v2";

function headers(accessToken, extra = {}) {
  const h = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra,
  };
  if (config.upstox.algoName) {
    h["X-Algo-Name"] = config.upstox.algoName;
  }
  return h;
}

export function buildAuthorizationUrl(state) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.upstox.apiKey,
    redirect_uri: config.upstox.redirectUri,
    state: state || cryptoRandomState(),
  });
  return `${AUTH_BASE}/login/authorization/dialog?${params.toString()}`;
}

function cryptoRandomState() {
  return crypto.randomBytes(16).toString("hex");
}

export async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    code,
    client_id: config.upstox.apiKey,
    client_secret: config.upstox.apiSecret,
    redirect_uri: config.upstox.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(`${AUTH_BASE}/login/authorization/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.error || `Token exchange failed: ${res.status}`);
  }
  return json.access_token;
}

export async function getUserProfile(accessToken) {
  const res = await fetch(`${API_BASE}/user/profile`, {
    headers: headers(accessToken),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.errors?.[0]?.message || `Profile failed: ${res.status}`);
  }
  return json;
}

/**
 * Daily candles (v3). Path: .../days/1/{to_date}/{from_date} (YYYY-MM-DD).
 * See https://upstox.com/developer/api-documentation/v3/get-historical-candle-data
 */
export async function getHistoricalCandlesDaily(accessToken, instrumentKey, fromDate, toDate) {
  const enc = encodeURIComponent(instrumentKey);
  const url = `${API_V3}/historical-candle/${enc}/days/1/${toDate}/${fromDate}`;
  const res = await fetch(url, { headers: headers(accessToken) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.errors?.[0]?.message || `Historical candles failed: ${res.status}`);
  }
  return json.data?.candles || [];
}

export async function getMarketQuotes(accessToken, instrumentKeys) {
  const keys = Array.isArray(instrumentKeys) ? instrumentKeys.join(",") : instrumentKeys;
  const url = `${API_BASE}/market-quote/quotes?${new URLSearchParams({ instrument_key: keys })}`;
  const res = await fetch(url, { headers: headers(accessToken) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.errors?.[0]?.message || `Quotes failed: ${res.status}`);
  }
  return json.data || {};
}

export async function getPositions(accessToken) {
  const res = await fetch(`${API_BASE}/portfolio/short-term-positions`, {
    headers: headers(accessToken),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.errors?.[0]?.message || `Positions failed: ${res.status}`);
  }
  return json.data || [];
}

export async function getFunds(accessToken) {
  const res = await fetch(`${API_BASE}/user/get-funds-and-margin`, {
    headers: headers(accessToken),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.errors?.[0]?.message || `Positions failed: ${res.status}`);
  }
  return json.data || [];
}

async function logOrderToFile(body, responseData, errorMsg = null) {
  try {
    await fs.mkdir(config.dataDir, { recursive: true });
    const now = new Date();
    // Formats date accurately into YYYY-MM-DD strictly for the Indian timezone
    const istDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const logFile = path.join(config.dataDir, `orders-${istDateStr}.log`);
    const logEntry = JSON.stringify({
      timestamp: now.toISOString(),
      request: body,
      response: responseData,
      error: errorMsg
    });
    await fs.appendFile(logFile, logEntry + "\n", "utf8");
  } catch (err) {
    console.error("Failed to write to order log file:", err);
  }
}

export async function placeOrder(accessToken, order) {
  const body = {
    quantity: order.quantity,
    product: order.product,
    validity: order.validity || "DAY",
    price: order.price ?? 0,
    tag: order.tag || "stockbroker",
    tag: order.tag || "personalstock",
    instrument_token: order.instrument_token,
    order_type: order.order_type || "MARKET",
    transaction_type: order.transaction_type,
    disclosed_quantity: order.disclosed_quantity ?? 0,
    trigger_price: order.trigger_price ?? 0,
    is_amo: order.is_amo ?? false,
    market_protection: order.market_protection ?? -1,
  };
  const res = await fetch(`${ORDER_BASE}/order/place`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.errors?.[0]?.message || `Order failed: ${res.status}`);
  }
  await logOrderToFile(body, json);
  return json.data;
}
