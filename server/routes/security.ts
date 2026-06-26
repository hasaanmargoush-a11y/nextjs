import { Router, type IRouter, type Request, type Response } from "express";
import { db, securityEventsTable, securityBansTable, securityWhitelistTable, usersTable } from "../../lib/db/src/index";
import { eq, desc, and, isNull, or, count, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "./admin";
import { emitToAdmins, kickBannedUser } from "../socket";
import { sendEmail, securityAlertEmailTemplate } from "../lib/email";

const ADMIN_ROLES = ["admin", "super_admin", "content_admin", "users_admin", "articles_admin"];

async function notifyAdminsByEmail(opts: {
  type: string;
  severity: string;
  ip: string;
  details: Record<string, unknown>;
  userName?: string | null;
  userEmail?: string | null;
  autoBanned: boolean;
  eventId: number;
  createdAt: string;
}): Promise<void> {
  try {
    const admins = await db
      .select({ email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.role, ADMIN_ROLES));

    const html = securityAlertEmailTemplate({
      type:      opts.type,
      severity:  opts.severity,
      ip:        opts.ip,
      path:      String(opts.details["path"] ?? ""),
      query:     String(opts.details["query"] ?? ""),
      userAgent: String(opts.details["userAgent"] ?? ""),
      userName:  opts.userName,
      userEmail: opts.userEmail,
      autoBanned: opts.autoBanned,
      eventId:   opts.eventId,
      createdAt: opts.createdAt,
    });

    const sevAr: Record<string, string> = { critical: "حرج", high: "عالي", medium: "متوسط", low: "منخفض" };
    const subject = `🚨 تنبيه أمني ${sevAr[opts.severity] ?? opts.severity} — ${opts.type} | نوفيل`;

    for (const admin of admins) {
      sendEmail({ to: admin.email, subject, html }).catch(() => {});
    }
  } catch { /* silent — never break event recording */ }
}

const router: IRouter = Router();

function getIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

// ── Auto-ban Duration Settings ────────────────────────────────────────────────
interface AutoBanDurationSettings {
  defaultMinutes: number;
  perSeverity: { critical: number; high: number; medium: number; low: number };
}

let autoBanSettings: AutoBanDurationSettings = {
  defaultMinutes: 60,
  perSeverity: { critical: 1440, high: 240, medium: 60, low: 30 },
};

export function getAutoBanDurationMs(severity?: string): number {
  const mins =
    severity && severity in autoBanSettings.perSeverity
      ? autoBanSettings.perSeverity[severity as keyof AutoBanDurationSettings["perSeverity"]]
      : autoBanSettings.defaultMinutes;
  return mins * 60 * 1000;
}

// ── Testing Mode (pauses all auto-bans for a set duration) ───────────────────
interface TestingModeState {
  active: boolean;
  expiresAt: number | null;   // ms timestamp, null = forever
  activatedBy: number | null;
  durationLabel: string;
}
let testingMode: TestingModeState = { active: false, expiresAt: null, activatedBy: null, durationLabel: "" };

export function isTestingModeActive(): boolean {
  if (!testingMode.active) return false;
  if (testingMode.expiresAt !== null && Date.now() > testingMode.expiresAt) {
    testingMode = { active: false, expiresAt: null, activatedBy: null, durationLabel: "" };
    return false;
  }
  return true;
}

export function getTestingMode(): TestingModeState & { remainingMs: number | null } {
  const active = isTestingModeActive();
  const remainingMs = active && testingMode.expiresAt ? testingMode.expiresAt - Date.now() : null;
  return { ...testingMode, active, remainingMs };
}

// ── In-memory ban + whitelist cache (refreshed every 5 min) ──────────────────
let bannedIps    = new Set<string>();
let bannedEmails = new Set<string>();
let whitelistedIps = new Set<string>();
let cacheBuiltAt = 0;

export async function refreshBanCache(): Promise<void> {
  try {
    const [bans, wl] = await Promise.all([
      db
        .select({ ip: securityBansTable.ip, email: securityBansTable.email, expiresAt: securityBansTable.expiresAt })
        .from(securityBansTable)
        .where(
          and(
            eq(securityBansTable.active, true),
            or(isNull(securityBansTable.expiresAt), sql`${securityBansTable.expiresAt} > NOW()`),
          ),
        ),
      db.select({ ip: securityWhitelistTable.ip }).from(securityWhitelistTable),
    ]);
    bannedIps      = new Set(bans.filter(b => b.ip).map(b => b.ip!));
    bannedEmails   = new Set(bans.filter(b => b.email).map(b => b.email!));
    whitelistedIps = new Set(wl.map(w => w.ip));
    cacheBuiltAt   = Date.now();
  } catch { /* ignore */ }
}

export function isIpBanned(ip: string): boolean {
  if (Date.now() - cacheBuiltAt > 5 * 60 * 1000) { refreshBanCache().catch(() => {}); }
  if (whitelistedIps.has(ip)) return false;
  return bannedIps.has(ip);
}

export function isEmailBanned(email: string): boolean {
  return bannedEmails.has(email.toLowerCase());
}

export function isIpWhitelisted(ip: string): boolean {
  return whitelistedIps.has(ip);
}

// IPs that should never be auto-banned (internal/loopback addresses)
const EXEMPT_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"]);

// ── Internal: record a security event and optionally auto-ban ─────────────────
export async function recordSecurityEvent(opts: {
  userId?: number | null;
  ip: string;
  email?: string | null;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  details: Record<string, unknown>;
  autoBan?: boolean;
}): Promise<void> {
  try {
    const [evt] = await db.insert(securityEventsTable).values({
      userId:     opts.userId ?? null,
      ip:         opts.ip,
      email:      opts.email ?? null,
      type:       opts.type,
      severity:   opts.severity,
      details:    opts.details,
      autoBanned: opts.autoBan ?? false,
    }).returning({ id: securityEventsTable.id });

    let autoBanId: number | null = null;
    const shouldBan = opts.autoBan && !EXEMPT_IPS.has(opts.ip) && !whitelistedIps.has(opts.ip) && !isTestingModeActive();
    const AUTO_BAN_EXPIRES = new Date(Date.now() + getAutoBanDurationMs(opts.severity));
    if (shouldBan) {
      const [ban] = await db.insert(securityBansTable).values({
        ip:        opts.ip !== "unknown" ? opts.ip : null,
        email:     opts.email?.toLowerCase() ?? null,
        userId:    opts.userId ?? null,
        reason:    `حظر تلقائي — ${opts.type} (${opts.severity})`,
        bannedBy:  null,
        eventId:   evt.id,
        active:    true,
        expiresAt: AUTO_BAN_EXPIRES,
      }).returning({ id: securityBansTable.id });
      autoBanId = ban?.id ?? null;
      await refreshBanCache();
    }

    const createdAt = new Date().toISOString();
    const alertPayload = {
      id:         evt.id,
      type:       opts.type,
      severity:   opts.severity,
      ip:         opts.ip,
      email:      opts.email ?? null,
      userId:     opts.userId ?? null,
      autoBanned: shouldBan,
      banId:      autoBanId,
      details:    opts.details,
      createdAt,
    };

    // Real-time alert to all connected admins for critical/high threats
    if (opts.severity === "critical" || opts.severity === "high") {
      emitToAdmins("security_alert", alertPayload);
      // Email all admins (fire-and-forget)
      notifyAdminsByEmail({
        type:       opts.type,
        severity:   opts.severity,
        ip:         opts.ip,
        details:    opts.details,
        userEmail:  opts.email ?? null,
        autoBanned: shouldBan ?? false,
        eventId:    evt.id,
        createdAt,
      }).catch(() => {});
    }
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Route — called by Next.js middleware to check banned IPs
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/security/report-attack (internal — called by Next.js middleware on pattern detection)
router.post("/security/report-attack", async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.INTERNAL_SECRET ?? "nouvil-internal";
  if (req.headers["x-internal-key"] !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { ip, path: urlPath, userAgent } = req.body as { ip?: string; path?: string; userAgent?: string };
  if (!ip) { res.json({ ok: true }); return; }

  recordSecurityEvent({
    ip: ip ?? "unknown",
    type:     "intrusion_attempt",
    severity: "high",
    details:  { path: urlPath ?? "/", query: (req.body as Record<string, unknown>).query ?? "", userAgent: userAgent ?? "unknown", source: "middleware" },
    autoBan:  true,
  }).catch(() => {});

  res.json({ ok: true });
});

// GET /api/security/blocked-ips-list (internal only, guarded by x-internal-key)
router.get("/security/blocked-ips-list", async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.INTERNAL_SECRET ?? "nouvil-internal";
  if (req.headers["x-internal-key"] !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const bans = await db
      .select({ ip: securityBansTable.ip })
      .from(securityBansTable)
      .where(
        and(
          eq(securityBansTable.active, true),
          or(isNull(securityBansTable.expiresAt), sql`${securityBansTable.expiresAt} > NOW()`),
        ),
      );
    const ips = bans.filter((b) => b.ip).map((b) => b.ip!);
    res.json(ips);
  } catch {
    res.json([]);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin Routes (all require admin role)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/security/stats
router.get("/admin/security/stats", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const [totalEvts]  = await db.select({ c: count() }).from(securityEventsTable);
  const [openEvts]   = await db.select({ c: count() }).from(securityEventsTable).where(eq(securityEventsTable.resolved, false));
  const [totalBans]  = await db.select({ c: count() }).from(securityBansTable).where(eq(securityBansTable.active, true));
  const [critEvts]   = await db.select({ c: count() }).from(securityEventsTable)
    .where(and(eq(securityEventsTable.severity, "critical"), eq(securityEventsTable.resolved, false)));
  res.json({
    totalEvents:  totalEvts.c,
    openEvents:   openEvts.c,
    activeBans:   totalBans.c,
    criticalOpen: critEvts.c,
  });
});

// GET /api/admin/security/events
router.get("/admin/security/events", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const page     = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit    = 20;
  const offset   = (page - 1) * limit;
  const severity = req.query.severity as string | undefined;
  const resolved = req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : undefined;

  const conditions = [];
  if (severity) conditions.push(eq(securityEventsTable.severity, severity));
  if (resolved !== undefined) conditions.push(eq(securityEventsTable.resolved, resolved));

  const [{ total }] = await db.select({ total: count() }).from(securityEventsTable)
    .where(conditions.length ? and(...conditions as Parameters<typeof and>) : undefined);

  const events = await db
    .select({
      id:         securityEventsTable.id,
      userId:     securityEventsTable.userId,
      ip:         securityEventsTable.ip,
      email:      securityEventsTable.email,
      type:       securityEventsTable.type,
      severity:   securityEventsTable.severity,
      autoBanned: securityEventsTable.autoBanned,
      resolved:   securityEventsTable.resolved,
      createdAt:  securityEventsTable.createdAt,
      userName:   usersTable.name,
      userEmail:  usersTable.email,
    })
    .from(securityEventsTable)
    .leftJoin(usersTable, eq(securityEventsTable.userId, usersTable.id))
    .where(conditions.length ? and(...conditions as Parameters<typeof and>) : undefined)
    .orderBy(desc(securityEventsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ events, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/admin/security/events/:id
router.get("/admin/security/events/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }

  const [event] = await db
    .select({
      id:         securityEventsTable.id,
      userId:     securityEventsTable.userId,
      ip:         securityEventsTable.ip,
      email:      securityEventsTable.email,
      type:       securityEventsTable.type,
      severity:   securityEventsTable.severity,
      details:    securityEventsTable.details,
      autoBanned: securityEventsTable.autoBanned,
      resolved:   securityEventsTable.resolved,
      resolvedBy: securityEventsTable.resolvedBy,
      createdAt:  securityEventsTable.createdAt,
      userName:   usersTable.name,
      userEmail:  usersTable.email,
    })
    .from(securityEventsTable)
    .leftJoin(usersTable, eq(securityEventsTable.userId, usersTable.id))
    .where(eq(securityEventsTable.id, id))
    .limit(1);

  if (!event) { res.status(404).json({ error: "الحدث غير موجود" }); return; }
  res.json(event);
});

// POST /api/admin/security/events/:id/resolve
router.post("/admin/security/events/:id/resolve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const adminId = req.session.userId!;
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }
  await db.update(securityEventsTable)
    .set({ resolved: true, resolvedBy: adminId })
    .where(eq(securityEventsTable.id, id));
  res.json({ ok: true });
});

// GET /api/admin/security/bans
router.get("/admin/security/bans", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const activeOnly = req.query.active !== "false";
  const bans = await db
    .select({
      id:        securityBansTable.id,
      ip:        securityBansTable.ip,
      email:     securityBansTable.email,
      userId:    securityBansTable.userId,
      reason:    securityBansTable.reason,
      active:    securityBansTable.active,
      eventId:   securityBansTable.eventId,
      createdAt: securityBansTable.createdAt,
      expiresAt: securityBansTable.expiresAt,
      userName:  usersTable.name,
    })
    .from(securityBansTable)
    .leftJoin(usersTable, eq(securityBansTable.userId, usersTable.id))
    .where(activeOnly ? eq(securityBansTable.active, true) : undefined)
    .orderBy(desc(securityBansTable.createdAt))
    .limit(100);
  res.json(bans);
});

// POST /api/admin/security/bans
router.post("/admin/security/bans", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminId = req.session.userId!;
  const { ip, email, userId, reason, eventId, expiresAt } = req.body as {
    ip?: string; email?: string; userId?: number; reason?: string; eventId?: number; expiresAt?: string;
  };
  if (!reason?.trim()) { res.status(400).json({ error: "سبب الحظر مطلوب" }); return; }
  if (!ip && !email && !userId) { res.status(400).json({ error: "يجب تحديد IP أو بريد إلكتروني أو مستخدم" }); return; }

  await db.insert(securityBansTable).values({
    ip:        ip?.trim() || null,
    email:     email?.trim().toLowerCase() || null,
    userId:    userId ?? null,
    reason:    reason.trim(),
    bannedBy:  adminId,
    eventId:   eventId ?? null,
    active:    true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });
  await refreshBanCache();
  // Kick the banned user from all active socket connections immediately
  kickBannedUser({ userId: userId ?? null, email: email?.trim().toLowerCase() ?? null, ip: ip?.trim() ?? null });
  res.json({ ok: true });
});

// POST /api/admin/security/events/:id/lift-ban — lift an auto-ban by event ID
router.post("/admin/security/events/:id/lift-ban", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const eventId = parseInt(String(req.params.id), 10);
  if (isNaN(eventId)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }

  // Deactivate all bans linked to this event
  await db.update(securityBansTable)
    .set({ active: false })
    .where(eq(securityBansTable.eventId, eventId));

  await refreshBanCache();
  res.json({ ok: true });
});

// POST /api/admin/security/events/:id/quick-ban — ban from alert in one click
router.post("/admin/security/events/:id/quick-ban", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const eventId = parseInt(String(req.params.id), 10);
  const adminId = req.session.userId!;
  if (isNaN(eventId)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }

  const [evt] = await db
    .select({ userId: securityEventsTable.userId, ip: securityEventsTable.ip, email: securityEventsTable.email, type: securityEventsTable.type })
    .from(securityEventsTable).where(eq(securityEventsTable.id, eventId)).limit(1);
  if (!evt) { res.status(404).json({ error: "الحدث غير موجود" }); return; }

  await db.insert(securityBansTable).values({
    ip:        evt.ip !== "unknown" ? evt.ip : null,
    email:     evt.email?.toLowerCase() ?? null,
    userId:    evt.userId ?? null,
    reason:    `حظر يدوي من مركز الأمان — ${evt.type}`,
    bannedBy:  adminId,
    eventId,
    active:    true,
    expiresAt: new Date(Date.now() + autoBanSettings.perSeverity.high * 60 * 1000),
  });

  // Mark event as resolved
  await db.update(securityEventsTable).set({ resolved: true, resolvedBy: adminId }).where(eq(securityEventsTable.id, eventId));

  await refreshBanCache();
  kickBannedUser({ userId: evt.userId, email: evt.email, ip: evt.ip });
  res.json({ ok: true });
});

// DELETE /api/admin/security/bans/:id  (unban)
router.delete("/admin/security/bans/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }
  await db.update(securityBansTable).set({ active: false }).where(eq(securityBansTable.id, id));
  await refreshBanCache();
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Whitelist Routes
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/security/whitelist
router.get("/admin/security/whitelist", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      id: securityWhitelistTable.id,
      ip: securityWhitelistTable.ip,
      label: securityWhitelistTable.label,
      addedBy: securityWhitelistTable.addedBy,
      createdAt: securityWhitelistTable.createdAt,
      addedByName: usersTable.name,
    })
    .from(securityWhitelistTable)
    .leftJoin(usersTable, eq(securityWhitelistTable.addedBy, usersTable.id))
    .orderBy(desc(securityWhitelistTable.createdAt));
  res.json(rows);
});

// POST /api/admin/security/whitelist
router.post("/admin/security/whitelist", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { ip, label } = req.body as { ip?: string; label?: string };
  if (!ip || typeof ip !== "string") { res.status(400).json({ error: "الـ IP مطلوب" }); return; }
  const adminId = (req.session as { userId?: number }).userId ?? null;
  try {
    const [row] = await db.insert(securityWhitelistTable).values({
      ip: ip.trim(),
      label: (label ?? "").trim(),
      addedBy: adminId,
    }).returning();
    await refreshBanCache();
    res.json(row);
  } catch {
    res.status(409).json({ error: "هذا الـ IP موجود بالفعل في القائمة البيضاء" });
  }
});

// DELETE /api/admin/security/whitelist/:id
router.delete("/admin/security/whitelist/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }
  await db.delete(securityWhitelistTable).where(eq(securityWhitelistTable.id, id));
  await refreshBanCache();
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testing Mode Routes
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/security/testing-mode
router.get("/admin/security/testing-mode", requireAdmin, (_req: Request, res: Response): void => {
  res.json(getTestingMode());
});

// POST /api/admin/security/testing-mode  (activate)
router.post("/admin/security/testing-mode", requireAdmin, (req: Request, res: Response): void => {
  const { durationMinutes, label } = req.body as { durationMinutes?: number; label?: string };
  const adminId = (req.session as { userId?: number }).userId ?? null;
  const expiresAt = durationMinutes && durationMinutes > 0
    ? Date.now() + durationMinutes * 60 * 1000
    : null;
  testingMode = {
    active: true,
    expiresAt,
    activatedBy: adminId,
    durationLabel: label ?? (durationMinutes ? `${durationMinutes} دقيقة` : "غير محدد"),
  };
  res.json(getTestingMode());
});

// DELETE /api/admin/security/testing-mode  (deactivate)
router.delete("/admin/security/testing-mode", requireAdmin, (_req: Request, res: Response): void => {
  testingMode = { active: false, expiresAt: null, activatedBy: null, durationLabel: "" };
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auto-ban Duration Settings Routes
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/security/ban-settings
router.get("/admin/security/ban-settings", requireAdmin, (_req: Request, res: Response): void => {
  res.json(autoBanSettings);
});

// POST /api/admin/security/ban-settings
router.post("/admin/security/ban-settings", requireAdmin, (req: Request, res: Response): void => {
  const { defaultMinutes, perSeverity } = req.body as {
    defaultMinutes?: number;
    perSeverity?: { critical?: number; high?: number; medium?: number; low?: number };
  };
  const MAX_MINUTES = 10080; // 1 week
  if (typeof defaultMinutes === "number" && defaultMinutes > 0) {
    autoBanSettings.defaultMinutes = Math.min(Math.round(defaultMinutes), MAX_MINUTES);
  }
  if (perSeverity && typeof perSeverity === "object") {
    for (const sev of ["critical", "high", "medium", "low"] as const) {
      const v = perSeverity[sev];
      if (typeof v === "number" && v > 0) {
        autoBanSettings.perSeverity[sev] = Math.min(Math.round(v), MAX_MINUTES);
      }
    }
  }
  res.json(autoBanSettings);
});

// Export helper for ban-check middleware
export { getIp };

export default router;
