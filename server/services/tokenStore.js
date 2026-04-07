import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

const FILE = "access-token.enc";

function getKey() {
  const raw = config.encryptionKey;
  if (!raw || raw.length < 32) {
    throw new Error(
      "Set TOKEN_ENCRYPTION_KEY to a random string of at least 32 characters (used to encrypt stored tokens)."
    );
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export async function saveAccessToken(accessToken) {
  await fs.mkdir(config.dataDir, { recursive: true });
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(accessToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]);
  await fs.writeFile(path.join(config.dataDir, FILE), payload, { mode: 0o600 });
}

export async function loadAccessToken() {
  try {
    const buf = await fs.readFile(path.join(config.dataDir, FILE));
    if (buf.length < 12 + 16) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const key = getKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

export async function clearAccessToken() {
  try {
    await fs.unlink(path.join(config.dataDir, FILE));
  } catch {
    /* noop */
  }
}
