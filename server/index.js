import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import 'dotenv/config';
import config from "./config.js";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";
import { startMarketScheduler } from "./services/scheduler.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "32kb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.environment === "production" ? 200 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api", apiRouter);

app.use((err, _req, res, _next) => {
  console.error(err); // Log full error server-side
  const message = config.environment === 'production' 
    ? 'Internal server error'
    : err.message;
  res.status(500).json({ error: message });
});

app.use(express.static(path.join(__dirname, "ui")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "ui/index.html"));
});

app.listen(config.port, config.host, () => {
  console.log(`API http://${config.host}:${config.port}`);
  try {
    startMarketScheduler();
  } catch (e) {
    console.warn("Scheduler not started:", e.message);
  }
});
