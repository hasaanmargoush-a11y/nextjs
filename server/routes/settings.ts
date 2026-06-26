import { Router, type IRouter } from "express";
import { db, emailSettingsTable, seoSettingsTable, adsenseSettingsTable } from "../../lib/db/src/index";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./admin";
import { invalidateEmailCache, sendEmail, otpEmailTemplate } from "../lib/email";

const router: IRouter = Router();

// ── Email Settings ────────────────────────────────────────────────────────────

router.get("/admin/settings/email", requireAdmin, async (req, res): Promise<void> => {
  const [row] = await db.select().from(emailSettingsTable).limit(1);
  if (!row) { res.json({}); return; }
  res.json({ ...row, pass: row.pass ? "••••••••" : "" });
});

router.put("/admin/settings/email", requireAdmin, async (req, res): Promise<void> => {
  const { host, port, secure, user, pass, fromName, fromEmail, enabled } = req.body;
  const update: Partial<typeof emailSettingsTable.$inferInsert> = {
    host, port: Number(port), secure: Boolean(secure),
    user, fromName, fromEmail, enabled: Boolean(enabled),
    updatedAt: new Date(),
  };
  if (pass && pass !== "••••••••") update.pass = pass;

  const existing = await db.select().from(emailSettingsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(emailSettingsTable).values({
      host: update.host ?? "smtp.gmail.com",
      port: update.port ?? 587,
      secure: update.secure ?? false,
      user: update.user ?? "",
      pass: update.pass ?? "",
      fromName: update.fromName ?? "منصة نوفيل",
      fromEmail: update.fromEmail ?? "",
      enabled: update.enabled ?? false,
    });
  } else {
    await db.update(emailSettingsTable).set(update).where(eq(emailSettingsTable.id, existing[0].id));
  }

  invalidateEmailCache();
  res.json({ message: "تم حفظ إعدادات البريد بنجاح" });
});

router.post("/admin/settings/email/test", requireAdmin, async (req, res): Promise<void> => {
  try {
    const { to } = req.body;
    if (!to) { res.status(400).json({ error: "يرجى تحديد البريد المستهدف" }); return; }
    await sendEmail({
      to,
      subject: "اختبار البريد الإلكتروني — منصة نوفيل",
      html: otpEmailTemplate("اختبار", "123456"),
    });
    res.json({ message: "تم إرسال بريد الاختبار بنجاح" });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── SEO Settings ─────────────────────────────────────────────────────────────

router.get("/admin/settings/seo", requireAdmin, async (req, res): Promise<void> => {
  const [row] = await db.select().from(seoSettingsTable).limit(1);
  res.json(row ?? {});
});

router.put("/admin/settings/seo", requireAdmin, async (req, res): Promise<void> => {
  const {
    siteName, siteUrl, defaultDescription, defaultOgImage,
    googleVerification, bingVerification, googleAnalyticsId,
    robotsDisallow, robotsAllow, indexingEnabled,
  } = req.body;

  const data = {
    siteName, siteUrl, defaultDescription, defaultOgImage,
    googleVerification, bingVerification, googleAnalyticsId,
    robotsDisallow, robotsAllow,
    indexingEnabled: indexingEnabled !== false,
    updatedAt: new Date(),
  };

  const existing = await db.select().from(seoSettingsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(seoSettingsTable).values({
      siteName: data.siteName ?? "نوفيل | منصة تعليم البرمجة",
      siteUrl: data.siteUrl ?? "https://nouvil.com",
      defaultDescription: data.defaultDescription ?? "تعلم البرمجة بالعربي مع نوفيل",
      defaultOgImage: data.defaultOgImage,
      googleVerification: data.googleVerification,
      bingVerification: data.bingVerification,
      googleAnalyticsId: data.googleAnalyticsId,
      robotsDisallow: data.robotsDisallow ?? "/admin/,/api/,/auth/",
      robotsAllow: data.robotsAllow ?? "/,/courses/,/articles/,/problems/",
      indexingEnabled: data.indexingEnabled,
    });
  } else {
    await db.update(seoSettingsTable).set(data).where(eq(seoSettingsTable.id, existing[0].id));
  }

  res.json({ message: "تم حفظ إعدادات SEO بنجاح" });
});

// Public route — for layout metadata (no auth required)
router.get("/settings/seo", async (req, res): Promise<void> => {
  const [row] = await db.select().from(seoSettingsTable).limit(1);
  res.json(row ?? {});
});

// ── AdSense Settings ──────────────────────────────────────────────────────────

router.get("/admin/settings/adsense", requireAdmin, async (req, res): Promise<void> => {
  const [row] = await db.select().from(adsenseSettingsTable).limit(1);
  res.json(row ?? {});
});

router.put("/admin/settings/adsense", requireAdmin, async (req, res): Promise<void> => {
  const { enabled, publisherId, autoAds, adSlotTop, adSlotSide, adSlotBottom } = req.body;

  const data = {
    enabled: Boolean(enabled),
    publisherId: publisherId ?? "",
    autoAds: Boolean(autoAds),
    adSlotTop: adSlotTop ?? null,
    adSlotSide: adSlotSide ?? null,
    adSlotBottom: adSlotBottom ?? null,
    updatedAt: new Date(),
  };

  const existing = await db.select().from(adsenseSettingsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(adsenseSettingsTable).values(data);
  } else {
    await db.update(adsenseSettingsTable).set(data).where(eq(adsenseSettingsTable.id, existing[0].id));
  }

  res.json({ message: "تم حفظ إعدادات AdSense بنجاح" });
});

// Public — for frontend to read AdSense config (used by AdUnit component)
router.get("/settings/adsense", async (req, res): Promise<void> => {
  const [row] = await db.select().from(adsenseSettingsTable).limit(1);
  res.json({
    enabled: row?.enabled ?? false,
    publisherId: row?.publisherId ?? "",
    autoAds: row?.autoAds ?? false,
    adSlotTop: row?.adSlotTop ?? "",
    adSlotSide: row?.adSlotSide ?? "",
    adSlotBottom: row?.adSlotBottom ?? "",
  });
});

export default router;
