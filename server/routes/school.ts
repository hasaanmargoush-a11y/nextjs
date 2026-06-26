import { Router, type IRouter, type Request, type Response } from "express";
import { db, schoolLanguagesTable, schoolChaptersTable, schoolTopicsTable } from "../../lib/db/src/index";
import { eq, asc, and, desc, sql } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

// ─── Public Routes (no auth required) ──────────────────────────────────────

router.get("/school/languages", async (req: Request, res: Response) => {
  const langs = await db
    .select()
    .from(schoolLanguagesTable)
    .where(eq(schoolLanguagesTable.isPublished, true))
    .orderBy(asc(schoolLanguagesTable.order));

  const withCounts = await Promise.all(
    langs.map(async (lang) => {
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(schoolTopicsTable)
        .where(and(eq(schoolTopicsTable.languageId, lang.id), eq(schoolTopicsTable.isPublished, true)));
      return { ...lang, topicsCount: total };
    })
  );

  res.json(withCounts);
});

router.get("/school/languages/:lang", async (req: Request, res: Response) => {
  const { lang } = req.params;

  const [language] = await db
    .select()
    .from(schoolLanguagesTable)
    .where(and(eq(schoolLanguagesTable.slug, lang), eq(schoolLanguagesTable.isPublished, true)));

  if (!language) {
    res.status(404).json({ error: "اللغة غير موجودة" });
    return;
  }

  const chapters = await db
    .select()
    .from(schoolChaptersTable)
    .where(eq(schoolChaptersTable.languageId, language.id))
    .orderBy(asc(schoolChaptersTable.order));

  const topics = await db
    .select({
      id: schoolTopicsTable.id,
      slug: schoolTopicsTable.slug,
      titleAr: schoolTopicsTable.titleAr,
      chapterId: schoolTopicsTable.chapterId,
      order: schoolTopicsTable.order,
    })
    .from(schoolTopicsTable)
    .where(and(eq(schoolTopicsTable.languageId, language.id), eq(schoolTopicsTable.isPublished, true)))
    .orderBy(asc(schoolTopicsTable.order));

  const chaptersWithTopics = chapters.map((ch) => ({
    ...ch,
    topics: topics.filter((t) => t.chapterId === ch.id),
  }));

  const uncategorized = topics.filter((t) => !t.chapterId);

  res.json({ language, chapters: chaptersWithTopics, uncategorized });
});

router.get("/school/languages/:lang/topics/:slug", async (req: Request, res: Response) => {
  const { lang, slug } = req.params;

  const [language] = await db
    .select()
    .from(schoolLanguagesTable)
    .where(and(eq(schoolLanguagesTable.slug, lang), eq(schoolLanguagesTable.isPublished, true)));

  if (!language) {
    res.status(404).json({ error: "اللغة غير موجودة" });
    return;
  }

  const [topic] = await db
    .select()
    .from(schoolTopicsTable)
    .where(and(eq(schoolTopicsTable.slug, slug), eq(schoolTopicsTable.languageId, language.id), eq(schoolTopicsTable.isPublished, true)));

  if (!topic) {
    res.status(404).json({ error: "الموضوع غير موجود" });
    return;
  }

  const allTopics = await db
    .select({ id: schoolTopicsTable.id, slug: schoolTopicsTable.slug, titleAr: schoolTopicsTable.titleAr, order: schoolTopicsTable.order })
    .from(schoolTopicsTable)
    .where(and(eq(schoolTopicsTable.languageId, language.id), eq(schoolTopicsTable.isPublished, true)))
    .orderBy(asc(schoolTopicsTable.order));

  const idx = allTopics.findIndex((t) => t.id === topic.id);
  const prev = idx > 0 ? allTopics[idx - 1] : null;
  const next = idx < allTopics.length - 1 ? allTopics[idx + 1] : null;

  res.json({ topic, language, prev, next });
});

// ─── Admin Routes ───────────────────────────────────────────────────────────

router.get("/admin/school/languages", requireAdmin, async (req: Request, res: Response) => {
  const langs = await db
    .select()
    .from(schoolLanguagesTable)
    .orderBy(asc(schoolLanguagesTable.order));

  const withCounts = await Promise.all(
    langs.map(async (lang) => {
      const [{ topics }] = await db
        .select({ topics: sql<number>`count(*)::int` })
        .from(schoolTopicsTable)
        .where(eq(schoolTopicsTable.languageId, lang.id));
      const [{ chapters }] = await db
        .select({ chapters: sql<number>`count(*)::int` })
        .from(schoolChaptersTable)
        .where(eq(schoolChaptersTable.languageId, lang.id));
      return { ...lang, topicsCount: topics, chaptersCount: chapters };
    })
  );

  res.json(withCounts);
});

router.post("/admin/school/languages", requireAdmin, async (req: Request, res: Response) => {
  const { slug, nameAr, nameEn, icon, color, description, metaTitle, metaDescription, order } = req.body;
  if (!slug || !nameAr || !nameEn) {
    res.status(400).json({ error: "slug و nameAr و nameEn مطلوبة" });
    return;
  }
  const [lang] = await db.insert(schoolLanguagesTable).values({ slug, nameAr, nameEn, icon, color: color ?? "#3b82f6", description, metaTitle, metaDescription, order: order ?? 0 }).returning();
  res.json(lang);
});

router.put("/admin/school/languages/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { slug, nameAr, nameEn, icon, color, description, metaTitle, metaDescription, order, isPublished } = req.body;
  const [lang] = await db.update(schoolLanguagesTable).set({ slug, nameAr, nameEn, icon, color, description, metaTitle, metaDescription, order, isPublished, updatedAt: new Date() }).where(eq(schoolLanguagesTable.id, id)).returning();
  res.json(lang);
});

router.delete("/admin/school/languages/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  await db.delete(schoolLanguagesTable).where(eq(schoolLanguagesTable.id, id));
  res.json({ ok: true });
});

router.get("/admin/school/languages/:langId/chapters", requireAdmin, async (req: Request, res: Response) => {
  const langId = parseInt(req.params.langId as string);
  const chapters = await db.select().from(schoolChaptersTable).where(eq(schoolChaptersTable.languageId, langId)).orderBy(asc(schoolChaptersTable.order));
  res.json(chapters);
});

router.post("/admin/school/chapters", requireAdmin, async (req: Request, res: Response) => {
  const { languageId, slug, titleAr, order } = req.body;
  if (!languageId || !slug || !titleAr) {
    res.status(400).json({ error: "languageId و slug و titleAr مطلوبة" });
    return;
  }
  const [ch] = await db.insert(schoolChaptersTable).values({ languageId, slug, titleAr, order: order ?? 0 }).returning();
  res.json(ch);
});

router.put("/admin/school/chapters/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { slug, titleAr, order } = req.body;
  const [ch] = await db.update(schoolChaptersTable).set({ slug, titleAr, order }).where(eq(schoolChaptersTable.id, id)).returning();
  res.json(ch);
});

router.delete("/admin/school/chapters/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  await db.delete(schoolChaptersTable).where(eq(schoolChaptersTable.id, id));
  res.json({ ok: true });
});

router.get("/admin/school/topics", requireAdmin, async (req: Request, res: Response) => {
  const { langId } = req.query;
  const cond = langId ? eq(schoolTopicsTable.languageId, parseInt(langId as string)) : undefined;
  const topics = await db.select().from(schoolTopicsTable).where(cond).orderBy(asc(schoolTopicsTable.order));
  res.json(topics);
});

router.post("/admin/school/topics", requireAdmin, async (req: Request, res: Response) => {
  const { languageId, chapterId, slug, titleAr, conceptExplanationAr, syntaxCode, codeExamples, proTipsAr, seoKeywords, order } = req.body;
  if (!languageId || !slug || !titleAr) {
    res.status(400).json({ error: "languageId و slug و titleAr مطلوبة" });
    return;
  }
  const [topic] = await db.insert(schoolTopicsTable).values({
    languageId, chapterId: chapterId ?? null, slug, titleAr,
    conceptExplanationAr: conceptExplanationAr ?? "",
    syntaxCode: syntaxCode ?? null,
    codeExamples: codeExamples ?? [],
    proTipsAr: proTipsAr ?? null,
    seoKeywords: seoKeywords ?? [],
    order: order ?? 0,
  }).returning();
  res.json(topic);
});

router.get("/admin/school/topics/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [topic] = await db.select().from(schoolTopicsTable).where(eq(schoolTopicsTable.id, id));
  if (!topic) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(topic);
});

router.put("/admin/school/topics/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { slug, titleAr, conceptExplanationAr, syntaxCode, codeExamples, proTipsAr, seoKeywords, order, isPublished, chapterId } = req.body;
  const [topic] = await db.update(schoolTopicsTable).set({
    slug, titleAr, conceptExplanationAr, syntaxCode, codeExamples, proTipsAr, seoKeywords, order, isPublished, chapterId: chapterId ?? null, updatedAt: new Date(),
  }).where(eq(schoolTopicsTable.id, id)).returning();
  res.json(topic);
});

router.delete("/admin/school/topics/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  await db.delete(schoolTopicsTable).where(eq(schoolTopicsTable.id, id));
  res.json({ ok: true });
});

export default router;
