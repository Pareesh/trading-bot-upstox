import 'dotenv/config';
import path from "path";

export default {
  host: process.env.HOST || "localhost",
  port: Number(process.env.PORT) || 4000,
  environment: process.env.ENVIRONMENT || "development",
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
