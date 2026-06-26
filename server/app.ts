import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { CHAT_UPLOAD_DIR } from "./lib/chatConfig";
import { isIpBanned, isEmailBanned, refreshBanCache, recordSecurityEvent } from "./routes/security";
import { initSettings } from "./lib/initSettings";
import { verifyToken } from "./lib/tokenSigning";
import { pool } from "../lib/db/src/index";
import path from "path";
import fs from "fs";

const PgSession = connectPgSimple(session);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const rawAllowed = process.env.ALLOWED_ORIGINS ?? "";
const allowedOrigins = rawAllowed
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    const ok = allowedOrigins.some((o) =>
      o.startsWith("*.") ? origin.endsWith(o.slice(1)) : origin === o,
    );
    callback(null, ok);
  },
  credentials: true,
}));

app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true, limit: "6mb" }));

const sessionSecret = process.env.SESSION_SECRET ?? "nouvil-secret-key-2024";
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  logger.warn("SESSION_SECRET env var not set — using insecure fallback in production!");
}

app.use(session({
  store: new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
}));

app.use("/api/uploads", express.static(CHAT_UPLOAD_DIR, {
  maxAge: "7d",
  setHeaders: (res) => { res.setHeader("Access-Control-Allow-Origin", "*"); },
}));

const ARTICLE_UPLOAD_DIR = path.join(process.cwd(), "uploads", "articles");
if (!fs.existsSync(ARTICLE_UPLOAD_DIR)) fs.mkdirSync(ARTICLE_UPLOAD_DIR, { recursive: true });
app.use("/api/article-images", express.static(ARTICLE_UPLOAD_DIR, {
  maxAge: "30d",
  setHeaders: (res) => { res.setHeader("Access-Control-Allow-Origin", "*"); },
}));

const COURSE_UPLOAD_DIR = path.join(process.cwd(), "uploads", "courses");
if (!fs.existsSync(COURSE_UPLOAD_DIR)) fs.mkdirSync(COURSE_UPLOAD_DIR, { recursive: true });
app.use("/api/course-images", express.static(COURSE_UPLOAD_DIR, {
  maxAge: "30d",
  setHeaders: (res) => { res.setHeader("Access-Control-Allow-Origin", "*"); },
}));

// ── Settings initialization ───────────────────────────────────────────────────
initSettings().catch(() => {});

// ── API-level body attack scanner ─────────────────────────────────────────────
// Scans request body + URL for injection/XSS/traversal patterns.
// Runs AFTER body parsing so the full body is available.
const BODY_ATTACK_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /union\s+[\w(]+\s*select/i,
  /drop\s+table/i,
  /exec\s*\(/i,
  /xp_cmdshell/i,
  /';\s*(delete|insert|update|drop|truncate)/i,
  /\.\.\//,
  /\/etc\/passwd/i,
  /\x00/,
  /\{\{.*\}\}/,
  /\$\{.*\}/,
  /sleep\s*\(\s*\d+\s*\)/i,
  /load_file\s*\(/i,
  /into\s+outfile/i,
];

const BODY_SCAN_SKIP = [
  "/api/articles",
  "/api/admin",
  "/api/chat",
  "/api/school",
  "/api/projects",
];

function scanForAttacks(value: unknown, depth = 0): boolean {
  if (depth > 5) return false;
  if (typeof value === "string") {
    let decoded = value;
    try { decoded = decodeURIComponent(value); } catch { /* skip */ }
    return BODY_ATTACK_PATTERNS.some((p) => p.test(value) || p.test(decoded));
  }
  if (Array.isArray(value)) return value.some((v) => scanForAttacks(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((v) => scanForAttacks(v, depth + 1));
  }
  return false;
}

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const skipPath = BODY_SCAN_SKIP.some((p) => req.path.startsWith(p.replace("/api", "")));
  if (skipPath) return next();

  const urlTarget = req.url ?? "";
  const hasUrlAttack = BODY_ATTACK_PATTERNS.some((p) => {
    try { return p.test(decodeURIComponent(urlTarget)) || p.test(urlTarget); }
    catch { return p.test(urlTarget); }
  });

  const hasBodyAttack = req.body && typeof req.body === "object" && scanForAttacks(req.body);

  if (hasUrlAttack || hasBodyAttack) {
    const fwd = req.headers["x-forwarded-for"];
    const ip  = typeof fwd === "string" ? fwd.split(",")[0].trim() : (req.socket?.remoteAddress ?? "unknown");
    recordSecurityEvent({
      ip,
      type:     "api_injection_attempt",
      severity: "high",
      details:  { url: req.url, method: req.method, source: "api-body-scanner" },
      autoBan:  true,
    }).catch(() => {});
  }

  next();
});

// ── Ban check middleware ───────────────────────────────────────────────────────
refreshBanCache().catch(() => {});

// ── Rate-abuse detector (separate from IDE rate limiter) ─────────────────────
// Tracks API requests per IP/user over a 1-minute window.
// If a single IP exceeds RATE_ABUSE_LIMIT, it logs a security event (once per window).
const RATE_ABUSE_LIMIT  = 300;        // requests per minute per IP
const RATE_ABUSE_WINDOW = 60_000;     // 1 minute
const abuseIpBuckets = new Map<string, { count: number; resetAt: number; alerted: boolean }>();

function checkRateAbuse(ip: string): boolean {
  const now = Date.now();
  let b = abuseIpBuckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + RATE_ABUSE_WINDOW, alerted: false };
    abuseIpBuckets.set(ip, b);
  }
  b.count++;
  if (b.count > RATE_ABUSE_LIMIT && !b.alerted) {
    b.alerted = true;
    return true; // trigger alert
  }
  return false;
}

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const fwd = req.headers["x-forwarded-for"];
  const ip  = typeof fwd === "string" ? fwd.split(",")[0].trim() : (req.socket?.remoteAddress ?? "unknown");

  if (isIpBanned(ip)) {
    res.status(403).json({ error: "تم حظرك من الوصول لهذه المنصة.", banned: true });
    return;
  }

  let tokenEmail: string | null = null;
  let tokenUserId: number | null = null;
  const token = req.headers.authorization;
  if (token?.startsWith("Bearer ")) {
    const verified = verifyToken(token.slice(7));
    if (verified) {
      tokenUserId = verified.userId;
      tokenEmail  = verified.email;
      if (isEmailBanned(tokenEmail)) {
        res.status(403).json({ error: "تم حظر حسابك من الوصول لهذه المنصة.", banned: true });
        return;
      }
    }
  }

  // Rate abuse check (fire-and-forget — never blocks the request)
  if (checkRateAbuse(ip)) {
    import("./routes/security").then(({ recordSecurityEvent }) => {
      recordSecurityEvent({
        userId:   tokenUserId,
        ip,
        email:    tokenEmail,
        type:     "rate_abuse",
        severity: "high",
        details:  { requestsPerMinute: RATE_ABUSE_LIMIT, url: req.url?.split("?")[0] ?? "/" },
        autoBan:  true,
      }).catch(() => {});
    }).catch(() => {});
  }

  next();
});

app.use("/api", router);

export default app;
