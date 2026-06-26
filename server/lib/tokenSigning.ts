import crypto from "crypto";

const SECRET =
  process.env.TOKEN_SECRET ??
  process.env.SESSION_SECRET ??
  "nouvil-token-secret-fallback-2024";

export function signToken(userId: number, email: string): string {
  const ts = Date.now();
  const payload = `${userId}:${email}:${ts}`;
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 32);
  return Buffer.from(`${payload}:${sig}`).toString("base64");
}

export function verifyToken(
  token: string,
): { userId: number; email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return null;

    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);

    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("hex")
      .slice(0, 32);

    if (sig !== expected) return null;

    const parts = payload.split(":");
    if (parts.length < 3) return null;

    const userId = parseInt(parts[0], 10);
    const email = parts[1];
    if (isNaN(userId) || !email) return null;

    return { userId, email };
  } catch {
    return null;
  }
}
