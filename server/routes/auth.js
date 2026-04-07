import { Router } from "express";
import { config, assertUpstoxConfigured } from "../config.js";
import { buildAuthorizationUrl, exchangeCodeForToken, getUserProfile } from "../services/upstoxClient.js";
import { saveAccessToken, loadAccessToken, clearAccessToken } from "../services/tokenStore.js";

export const authRouter = Router();

authRouter.get("/upstox", (req, res) => {
  try {
    assertUpstoxConfigured();
  } catch (e) {
    return res.status(500).json({ error: String(e.message) });
  }
  const url = buildAuthorizationUrl(req.query.state);
  res.redirect(url);
});

authRouter.get("/upstox/callback", async (req, res) => {
  const code = req.query.code;
  const err = req.query.error;
  if (err) {
    return res.redirect(`${config.frontendOrigin}/?error=${encodeURIComponent(err)}`);
  }
  if (!code || typeof code !== "string") {
    return res.redirect(`${config.frontendOrigin}/?error=${encodeURIComponent("missing_code")}`);
  }
  try {
    assertUpstoxConfigured();
    const token = await exchangeCodeForToken(code);
    await saveAccessToken(token);
    return res.redirect(`${config.frontendOrigin}/?connected=1`);
  } catch (e) {
    return res.redirect(`${config.frontendOrigin}/?error=${encodeURIComponent(e.message)}`);
  }
});

authRouter.get("/status", async (_req, res) => {
  const token = await loadAccessToken();
  if (!token) {
    return res.json({ connected: false });
  }
  try {
    const profile = await getUserProfile(token);
    return res.json({ connected: true, profile: profile.data ?? profile });
  } catch {
    return res.json({ connected: true, profile: null, stale: true });
  }
});

authRouter.post("/logout", async (_req, res) => {
  await clearAccessToken();
  res.json({ ok: true });
});
