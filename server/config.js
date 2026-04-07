import dotenv from "dotenv";
import path from "path";

dotenv.config();

function required(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  upstox: {
    apiKey: process.env.UPSTOX_API_KEY || "",
    apiSecret: process.env.UPSTOX_API_SECRET || "",
    redirectUri: process.env.UPSTOX_REDIRECT_URI || "http://localhost:4000/api/auth/upstox/callback",
    algoName: process.env.UPSTOX_ALGO_NAME || "",
  },
  encryptionKey: process.env.TOKEN_ENCRYPTION_KEY || "",
  dataDir: process.env.DATA_DIR || path.join("..", ".data"),
  tradingEnabled: process.env.LIVE_TRADING_ENABLED === "true"
};

export function assertUpstoxConfigured() {
  required("UPSTOX_API_KEY", config.upstox.apiKey);
  required("UPSTOX_API_SECRET", config.upstox.apiSecret);
}
