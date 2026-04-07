# Personal Stock (React + Express + Upstox)

## Features

- **NIFTY 50**: Resolves constituents from [Upstox NSE instruments JSON](https://upstox.com/developer/api-documentation/instruments) (symbol list in `server/src/data/nifty50-symbols.json`; update when NSE rebalances).
- **Strategy**: Combines live intraday momentum with [Upstox v3 daily historical candles](https://upstox.com/developer/api-documentation/v3/get-historical-candle-data) (~20d return, SMA trend, low-volatility tilt). Open positions: **charge-aware optimal exits** (lock small **net** gains on pullback/reversal), **defensive trim** when estimated net-after-fees is negative but full stop not hit, and stop-loss on **net** or gross % (`STRATEGY_*`). Optional fixed ₹ TP only with `STRATEGY_ENABLE_HARD_TAKE_PROFIT=true`. See `server/src/services/strategy.js`. Research scaffolding only, not investment advice.
- **Orders**: Buy/sell via [Place Order API](https://upstox.com/developer/api-documentation/place-order) (`TRADING_ENABLED=true` required). The UI no longer exposes a manual order form; it is now focused on strategy-driven execution and API-first order placement.
- **Schedule**: `node-cron` runs at NSE cash open (default 09:15 IST, Mon–Fri) when `AUTO_EXECUTE_ON_OPEN=true` and trading is enabled. Optional **EOD** job (default **15:15 IST**, 15 minutes before 15:30 close) sells **all short-term positions** when **combined unrealized P&L > ₹`EOD_MIN_NET_PROFIT_INR`** (default 50). After a successful sell-all, the **EOD cron is stopped** unless `EOD_STOP_CRON_AFTER_SELL=false` (restart the process to register EOD again). Does not include delivery holdings. Holidays are not filtered.
- **Charges**: Optional **estimated** sell-side fees (`CHARGES_*` in `server/.env`) feed into EOD and strategy **net** exit logic — calibrate against your [Upstox](https://upstox.com/) tariff; not exact to the paisa.
- **Security**: OAuth `client_secret` stays on the server; access tokens are stored encrypted (`TOKEN_ENCRYPTION_KEY`); Helmet, CORS, rate limits, and same-origin checks on mutating requests.

## Setup

1. Create an app at [Upstox Developer](https://account.upstox.com/developer/apps) and set redirect URI to `http://localhost:4000/api/auth/upstox/callback` (or your deployed URL).

2. Copy `server/.env.example` to `server/.env` and fill values. Generate a long random `TOKEN_ENCRYPTION_KEY`.

3. Copy `client/.env.example` to `client/.env` if your API origin differs from `http://localhost:4000`.

4. Install and run:

```bash
npm install
npm run dev
```

- UI: http://localhost:5173  
- API: http://localhost:4000  

5. Click **Connect Upstox**, complete login, then use **Load constituents** and **Refresh signals**. The UI now focuses on strategy execution; manual order entry is not shown in the browser. Enable `TRADING_ENABLED=true` only when you intend to send real orders.

## Compliance

Registered algo apps may need the `X-Algo-Name` header (set `UPSTOX_ALGO_NAME` in `server/.env`). Confirm requirements with Upstox for your account type.
