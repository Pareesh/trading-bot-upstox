import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import 'dotenv/config';
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";
import { startMarketScheduler } from "./services/scheduler.js";

const clientStaticDir = path.resolve(process.cwd(), "./ui");
const domain = process.env.NODE_ENV === "PRODUCTION" ? "0.0.0.0" : "localhost";

const app = express();
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
    max: config.nodeEnv === "production" ? 200 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.static(clientStaticDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(clientStaticDir, "index.html"));
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api", apiRouter);

app.use((err, _req, res, _next) => {
  console.error(err); // Log full error server-side
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : err.message;
  res.status(500).json({ error: message });
});

app.listen(config.port, domain, () => {
  console.log(`API http://${domain}:${config.port}`);
  try {
    startMarketScheduler();
  } catch (e) {
    console.warn("Scheduler not started:", e.message);
  }
});
