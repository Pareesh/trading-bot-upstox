import cron from "node-cron";
import { loadAccessToken } from "./tokenStore.js";
import { resolveNifty50Instruments } from "./nifty50.js";
import { executeStrategyOrders } from "./strategy.js";

export function startMarketScheduler() {
  // Runs continuously every minute during market hours (09:15 to 15:14 IST)
  cron.schedule("* 9-15 * * 1-5", async () => {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const timeVal = istTime.getHours() * 100 + istTime.getMinutes();

    // Only run between 09:15 AM and 03:14 PM IST
    if (timeVal >= 915 && timeVal < 1515) {
      console.log(`[${istTime.toLocaleTimeString('en-IN')}] Intraday check: Evaluating strategy...`);
      await runStrategy({ eodSquaroff: false });
    }
  }, { timezone: "Asia/Kolkata" });

  // Stops/Squares off at 03:15 PM IST, Monday through Friday (15 mins prior to close)
  cron.schedule("15 15 * * 1-5", async () => {
    console.log("Market EOD Close: Squaring off to minimize overnight risk...");
    await runStrategy({ eodSquaroff: true });
  }, { timezone: "Asia/Kolkata" });
}

async function runStrategy(options = {}) {
  // Ensure trading is explicitly enabled via environment variable
  if (process.env.TRADING_ENABLED !== "true") {
    console.log("Live trading disabled (TRADING_ENABLED != true). Scheduled run skipped.");
    return;
  }

  try {
    const token = await loadAccessToken();
    if (!token) {
      console.warn("No Upstox token found. Cannot run scheduled strategy.");
      return;
    }
    const data = await resolveNifty50Instruments();
    await executeStrategyOrders(token, data.companies, options);
  } catch (err) {
    console.error("Scheduled strategy execution failed:", err);
  }
}
