import { loadAccessToken } from "../services/tokenStore.js";

export async function requireUpstoxSession(req, res, next) {
  try {
    const token = await loadAccessToken();
    if (!token) {
      return res.status(401).json({ error: "Not connected to Upstox. Complete OAuth first." });
    }
    req.upstoxAccessToken = token;
    next();
  } catch (e) {
    next(e);
  }
}

export function verifySameOrigin(req, res, next) {
  const origin = req.get("Origin");
  const referer = req.get("Referer");
  const allowed = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  const ok =
    (origin && origin === allowed) ||
    (referer && referer.startsWith(allowed)) ||
    process.env.NODE_ENV !== "production";
  if (!ok) {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  next();
}
