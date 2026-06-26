import { Router, type IRouter } from "express";
import { db, pagesTable, pageBlocksTable } from "../../lib/db/src/index";
import { eq, sql, and, ne } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

// ── System routes that cannot be used as page slugs ──────────────────────────
const SYSTEM_ROUTES = new Set([
  "admin", "api", "articles", "auth", "certificates", "courses",
  "dashboard", "leaderboard", "login", "my-courses", "og", "p",
  "problems", "profile", "register", "tools", "verify",
  "_next", "favicon.ico", "robots.txt", "sitemap.xml",
]);

function isSystemRoute(slug: string): boolean {
  const first = slug.split("/")[0].toLowerCase();
  return SYSTEM_ROUTES.has(first);
}

// ── Admin: List all pages ────────────────────────────────────────────────────
router.get("/admin/pages", requireAdmin, async (_req, res): Promise<void> => {
  const pages = await db.select().from(pagesTable).orderBy(sql`${pagesTable.updatedAt} DESC`);
  const withCounts = await Promise.all(pages.map(async (p) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(pageBlocksTable).where(eq(pageBlocksTable.pageId, p.id));
    return { ...p, blockCount: count };
  }));
  res.json(withCounts);
});

// ── Admin: Create page ───────────────────────────────────────────────────────
router.post("/admin/pages", requireAdmin, async (req, res): Promise<void> => {
  const { title, slug, description, isPublished } = req.body as {
    title: string; slug: string; description?: string; isPublished?: boolean;
  };
  if (!title?.trim() || !slug?.trim()) {
    res.status(400).json({ error: "العنوان والـ slug مطلوبان" });
    return;
  }
  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-/]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (isSystemRoute(cleanSlug)) {
    res.status(409).json({ error: "هذا الرابط محجوز للنظام ولا يمكن استخدامه، يرجى اختيار رابط آخر" });
    return;
  }
  const existing = await db.select({ id: pagesTable.id }).from(pagesTable).where(eq(pagesTable.slug, cleanSlug)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "هذا الرابط مستخدم بالفعل، يرجى اختيار رابط فريد آخر" });
    return;
  }
  try {
    const [page] = await db.insert(pagesTable).values({
      title: title.trim(),
      slug: cleanSlug,
      description: description?.trim() ?? null,
      isPublished: isPublished ?? false,
    }).returning();
    res.status(201).json(page);
  } catch {
    res.status(409).json({ error: "هذا الرابط مستخدم بالفعل، يرجى اختيار رابط فريد آخر" });
  }
});

// ── Admin: Get single page with blocks ──────────────────────────────────────
router.get("/admin/pages/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, id));
  if (!page) { res.status(404).json({ error: "الصفحة غير موجودة" }); return; }
  const blocks = await db.select().from(pageBlocksTable)
    .where(eq(pageBlocksTable.pageId, id))
    .orderBy(pageBlocksTable.order);
  res.json({ ...page, blocks });
});

// ── Admin: Update page settings ──────────────────────────────────────────────
router.put("/admin/pages/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const { title, slug, description, isPublished, seoTitle, seoDescription, ogImage } = req.body as {
    title?: string; slug?: string; description?: string; isPublished?: boolean;
    seoTitle?: string; seoDescription?: string; ogImage?: string;
  };
  const updates: Partial<typeof pagesTable.$inferInsert> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title.trim();
  if (slug !== undefined) {
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-/]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (isSystemRoute(cleanSlug)) {
      res.status(409).json({ error: "هذا الرابط محجوز للنظام ولا يمكن استخدامه، يرجى اختيار رابط آخر" });
      return;
    }
    const existing = await db.select({ id: pagesTable.id }).from(pagesTable)
      .where(and(eq(pagesTable.slug, cleanSlug), ne(pagesTable.id, id))).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "هذا الرابط مستخدم بالفعل، يرجى اختيار رابط فريد آخر" });
      return;
    }
    updates.slug = cleanSlug;
  }
  if (description !== undefined) updates.description = description?.trim() || null;
  if (isPublished !== undefined) updates.isPublished = isPublished;
  if (seoTitle !== undefined) updates.seoTitle = seoTitle?.trim() || null;
  if (seoDescription !== undefined) updates.seoDescription = seoDescription?.trim() || null;
  if (ogImage !== undefined) updates.ogImage = ogImage?.trim() || null;
  try {
    const [updated] = await db.update(pagesTable).set(updates).where(eq(pagesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "الصفحة غير موجودة" }); return; }
    res.json(updated);
  } catch {
    res.status(409).json({ error: "هذا الرابط مستخدم بالفعل، يرجى اختيار رابط فريد آخر" });
  }
});

// ── Admin: Delete page ───────────────────────────────────────────────────────
router.delete("/admin/pages/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  await db.delete(pagesTable).where(eq(pagesTable.id, id));
  res.json({ success: true });
});

// ── Admin: Add block ─────────────────────────────────────────────────────────
router.post("/admin/pages/:id/blocks", requireAdmin, async (req, res): Promise<void> => {
  const pageId = parseInt(String(req.params.id ?? ""), 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const { type, settings } = req.body as { type: string; settings?: Record<string, unknown> };
  if (!type) { res.status(400).json({ error: "نوع البلوك مطلوب" }); return; }
  // Get max order
  const [{ maxOrder }] = await db.select({ maxOrder: sql<number>`COALESCE(MAX("order"), -1)::int` })
    .from(pageBlocksTable).where(eq(pageBlocksTable.pageId, pageId));
  const [block] = await db.insert(pageBlocksTable).values({
    pageId,
    type,
    order: maxOrder + 1,
    settings: settings ?? getDefaultSettings(type),
    isVisible: true,
  }).returning();
  res.status(201).json(block);
});

// ── Admin: Reorder blocks (must be BEFORE /:blockId to avoid route conflict) ──
router.put("/admin/pages/:id/blocks/reorder", requireAdmin, async (req, res): Promise<void> => {
  const { items } = req.body as { items: Array<{ id: number; order: number }> };
  if (!Array.isArray(items)) { res.status(400).json({ error: "items مطلوب" }); return; }
  await Promise.all(items.map(({ id, order }) =>
    db.update(pageBlocksTable).set({ order }).where(eq(pageBlocksTable.id, id))
  ));
  res.json({ success: true });
});

// ── Admin: Update block ──────────────────────────────────────────────────────
router.put("/admin/pages/:id/blocks/:blockId", requireAdmin, async (req, res): Promise<void> => {
  const blockId = parseInt(String(req.params.blockId ?? ""), 10);
  if (isNaN(blockId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const { settings, isVisible } = req.body as { settings?: Record<string, unknown>; isVisible?: boolean };
  const updates: Partial<typeof pageBlocksTable.$inferInsert> = {};
  if (settings !== undefined) updates.settings = settings;
  if (isVisible !== undefined) updates.isVisible = isVisible;
  const [updated] = await db.update(pageBlocksTable).set(updates).where(eq(pageBlocksTable.id, blockId)).returning();
  if (!updated) { res.status(404).json({ error: "البلوك غير موجود" }); return; }
  res.json(updated);
});

// ── Admin: Delete block ──────────────────────────────────────────────────────
router.delete("/admin/pages/:id/blocks/:blockId", requireAdmin, async (req, res): Promise<void> => {
  const blockId = parseInt(String(req.params.blockId ?? ""), 10);
  if (isNaN(blockId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  await db.delete(pageBlocksTable).where(eq(pageBlocksTable.id, blockId));
  res.json({ success: true });
});

// ── Public: Render page by slug ──────────────────────────────────────────────
router.get("/pages/render/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const [page] = await db.select().from(pagesTable)
    .where(eq(pagesTable.slug, slug));
  if (!page || !page.isPublished) {
    res.status(404).json({ error: "الصفحة غير موجودة" });
    return;
  }
  const blocks = await db.select().from(pageBlocksTable)
    .where(eq(pageBlocksTable.pageId, page.id))
    .orderBy(pageBlocksTable.order);
  res.json({ ...page, blocks: blocks.filter(b => b.isVisible) });
});

// ── Public: Preview (admin can preview unpublished) ──────────────────────────
router.get("/pages/preview/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, id));
  if (!page) { res.status(404).json({ error: "الصفحة غير موجودة" }); return; }
  const blocks = await db.select().from(pageBlocksTable)
    .where(eq(pageBlocksTable.pageId, id))
    .orderBy(pageBlocksTable.order);
  res.json({ ...page, blocks });
});

// ── Admin: Seed legacy page from template ────────────────────────────────────
router.post("/admin/pages/seed-legacy", requireAdmin, async (req, res): Promise<void> => {
  const { template } = req.body as { template: string };
  const validTemplates = ["home", "courses", "articles", "problems"];
  if (!validTemplates.includes(template)) {
    res.status(400).json({ error: "قالب غير صالح" });
    return;
  }

  const templateMeta: Record<string, { title: string; slug: string; description: string }> = {
    home:     { title: "الصفحة الرئيسية", slug: "home",     description: "الصفحة الرئيسية للموقع" },
    courses:  { title: "الكورسات",         slug: "courses",  description: "صفحة استعراض الكورسات" },
    articles: { title: "المقالات",          slug: "articles", description: "صفحة المقالات التقنية" },
    problems: { title: "التحديات",          slug: "problems", description: "صفحة التحديات البرمجية" },
  };

  const blocks: Array<{ type: string; order: number; settings: Record<string, unknown> }> = {
    home: [
      { type: "hero",         order: 0, settings: { title: "تعلم البرمجة بالعربي", subtitle: "ابدأ رحلتك في عالم البرمجة", description: "منصة نوفيل — أكبر منصة تعليمية عربية للبرمجة مع كورسات احترافية وتحديات يومية وشهادات معتمدة", primaryBtn: { text: "ابدأ الآن مجاناً", href: "/auth/register" }, secondaryBtn: { text: "استعرض الكورسات", href: "/courses" }, bgType: "gradient", bgFrom: "#0a0f1e", bgTo: "#1a0a2e", gradientDir: "135deg", textColor: "#ffffff", animation: "particles", animColor: "#06b6d4", animCount: 20, animSpeed: "normal", badge: "🚀 منصة نوفيل", showBadge: true, showMascot: true, mascotType: "robot", mascotColor: "#06b6d4" } },
      { type: "stats",        order: 1, settings: { title: "أرقام تتحدث عن نفسها", subtitle: "", autoFetch: true, items: [{ label: "كورس", value: "50+", icon: "BookOpen", color: "cyan" }, { label: "مستخدم", value: "1000+", icon: "Users", color: "violet" }, { label: "تحدي", value: "100+", icon: "Zap", color: "amber" }, { label: "شهادة", value: "500+", icon: "Trophy", color: "green" }] } },
      { type: "courses_grid", order: 2, settings: { title: "الكورسات المميزة", subtitle: "تعلم من أفضل المحتوى", count: 6, filter: "featured", showBtn: true, btnText: "عرض كل الكورسات", btnHref: "/courses" } },
      { type: "categories",   order: 3, settings: { title: "تصفح بالتصنيف", subtitle: "", items: [{ name: "Python", icon: "Code2", color: "cyan", href: "/courses?category=Python", count: "10 كورسات" }, { name: "JavaScript", icon: "Globe", color: "amber", href: "/courses?category=JavaScript", count: "8 كورسات" }, { name: "React", icon: "Layers", color: "violet", href: "/courses?category=React", count: "6 كورسات" }, { name: "Data Science", icon: "BarChart2", color: "green", href: "/courses?category=Data+Science", count: "5 كورسات" }] } },
      { type: "features",     order: 4, settings: { title: "لماذا نوفيل؟", subtitle: "كل ما تحتاجه لتتعلم البرمجة", columns: 3, items: [{ icon: "Brain", title: "محتوى عربي أصيل", description: "كورسات باللغة العربية بجودة عالمية", color: "cyan" }, { icon: "Zap", title: "تحديات يومية", description: "حسّن مهاراتك بحل مسائل برمجية يومياً", color: "violet" }, { icon: "Trophy", title: "شهادات معتمدة", description: "احصل على شهادة عند إتمام كل كورس", color: "amber" }, { icon: "Users", title: "مجتمع نشط", description: "تواصل مع آلاف المبرمجين العرب", color: "green" }, { icon: "BookOpen", title: "محتوى متجدد", description: "كورسات جديدة تُضاف أسبوعياً", color: "rose" }, { icon: "Star", title: "متعلمون متميزون", description: "منهجية تعليمية تبني مهارات حقيقية", color: "blue" }] } },
      { type: "cta",          order: 5, settings: { title: "ابدأ رحلتك في البرمجة اليوم", description: "انضم لآلاف المبرمجين العرب وتعلم من أفضل المحتوى العربي في البرمجة", primaryBtn: { text: "ابدأ مجاناً الآن", href: "/auth/register" }, secondaryBtn: { text: "استعرض الكورسات", href: "/courses" }, style: "gradient" } },
    ],
    courses: [
      { type: "courses_browser", order: 0, settings: { headerTitle: "استعرض جميع الكورسات", headerSubtitle: "اختر من مئات الكورسات في مختلف لغات وتقنيات البرمجة", badge: "📚 الكورسات", categories: ["Python", "JavaScript", "React", "C++", "Java", "Flutter", "SQL", "DevOps"], pageSize: 12, showLevelFilter: true, showSortOptions: true } },
    ],
    articles: [
      { type: "articles_browser", order: 0, settings: { headerTitle: "مقالات ونصائح تقنية", headerSubtitle: "أحدث المقالات التقنية بالعربي من خبراء البرمجة والتطوير", badge: "📰 المقالات", categories: ["Python", "JavaScript", "React", "تقنيات الويب", "DevOps", "الخوارزميات", "نصائح المبرمجين"], showFeatured: true } },
    ],
    problems: [
      { type: "problems_browser", order: 0, settings: { headerTitle: "التحديات البرمجية", headerSubtitle: "حل مئات المسائل في مختلف لغات البرمجة واكسب النقاط والشارات", badge: "💻 التحديات", languages: ["Python", "JavaScript", "C++", "Java", "Go", "Rust"], showStats: true, showAiChallenge: true } },
    ],
  }[template] ?? [];

  const meta = templateMeta[template];
  try {
    const [page] = await db.insert(pagesTable).values({
      title: meta.title,
      slug: meta.slug,
      description: meta.description,
      isPublished: true,
    }).returning();

    if (blocks.length > 0) {
      await db.insert(pageBlocksTable).values(
        blocks.map(b => ({ pageId: page.id, type: b.type, order: b.order, settings: b.settings, isVisible: true }))
      );
    }

    res.status(201).json({ ...page, blockCount: blocks.length });
  } catch {
    res.status(409).json({ error: "هذه الصفحة موجودة بالفعل — احذف القديمة أو غيّر الـ slug" });
  }
});

// ── Default block settings ───────────────────────────────────────────────────
function getDefaultSettings(type: string): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        title: "عنوان رئيسي جذاب",
        subtitle: "عنوان فرعي يوضح الفكرة",
        description: "وصف مختصر للصفحة أو القسم يجذب الزوار",
        primaryBtn: { text: "ابدأ الآن", href: "/courses" },
        secondaryBtn: { text: "اعرف أكثر", href: "#" },
        bgType: "gradient",
        bgFrom: "#0a0f1e",
        bgTo: "#1a0a2e",
        gradientDir: "135deg",
        textColor: "#ffffff",
        animation: "particles",
        animColor: "#06b6d4",
        animCount: 20,
        animSpeed: "normal",
        badge: "منصة نوفيل",
        showBadge: true,
        showMascot: false,
        mascotType: "robot",
        mascotColor: "#06b6d4",
      };
    case "stats":
      return {
        title: "أرقام تتحدث عن نفسها",
        subtitle: "",
        autoFetch: true,
        items: [
          { label: "كورس", value: "50+", icon: "BookOpen", color: "cyan" },
          { label: "مستخدم", value: "1000+", icon: "Users", color: "violet" },
          { label: "تحدي", value: "100+", icon: "Zap", color: "amber" },
          { label: "شهادة", value: "500+", icon: "Trophy", color: "green" },
        ],
      };
    case "features":
      return {
        title: "لماذا نوفيل؟",
        subtitle: "كل ما تحتاجه لتتعلم البرمجة",
        columns: 3,
        items: [
          { icon: "Brain", title: "محتوى عربي", description: "كورسات باللغة العربية بجودة عالمية", color: "cyan" },
          { icon: "Zap", title: "تحديات يومية", description: "حسّن مهاراتك بحل مسائل برمجية يومياً", color: "violet" },
          { icon: "Trophy", title: "شهادات معتمدة", description: "احصل على شهادة عند إتمام كل كورس", color: "amber" },
        ],
      };
    case "courses_grid":
      return { title: "الكورسات المميزة", subtitle: "تعلم من أفضل المحتوى", count: 6, filter: "featured", showBtn: true, btnText: "عرض كل الكورسات", btnHref: "/courses" };
    case "challenges_grid":
      return { title: "تحديات برمجية", subtitle: "اختبر مهاراتك", count: 6, filter: "all", showBtn: true, btnText: "عرض كل التحديات", btnHref: "/problems" };
    case "articles_grid":
      return { title: "أحدث المقالات", subtitle: "تابع آخر المستجدات", count: 6, filter: "recent", showBtn: true, btnText: "عرض كل المقالات", btnHref: "/articles" };
    case "users_grid":
      return { title: "مجتمع نوفيل", subtitle: "أبرز مستخدمي المنصة", count: 6, showPoints: true, showBio: false };
    case "leaderboard":
      return { title: "المتصدرون", subtitle: "أفضل المبرمجين على المنصة", count: 10 };
    case "cta":
      return {
        title: "ابدأ رحلتك في البرمجة اليوم",
        description: "انضم لآلاف المبرمجين العرب وتعلم من أفضل المحتوى",
        primaryBtn: { text: "ابدأ مجاناً", href: "/auth/register" },
        secondaryBtn: { text: "استعرض الكورسات", href: "/courses" },
        style: "gradient",
      };
    case "cards":
      return {
        title: "عنوان القسم",
        subtitle: "",
        columns: 3,
        items: [
          { title: "بطاقة 1", description: "وصف البطاقة الأولى", icon: "Star", color: "cyan", href: "#" },
          { title: "بطاقة 2", description: "وصف البطاقة الثانية", icon: "Zap", color: "violet", href: "#" },
          { title: "بطاقة 3", description: "وصف البطاقة الثالثة", icon: "Trophy", color: "amber", href: "#" },
        ],
      };
    case "categories":
      return {
        title: "تصفح بالتصنيف",
        subtitle: "",
        items: [
          { name: "Python", icon: "Code2", color: "cyan", href: "/courses?category=python", count: "10 كورس" },
          { name: "JavaScript", icon: "Globe", color: "amber", href: "/courses?category=js", count: "8 كورسات" },
          { name: "Data Science", icon: "BarChart2", color: "violet", href: "/courses?category=ds", count: "5 كورسات" },
        ],
      };
    case "testimonials":
      return {
        title: "ماذا يقول طلابنا؟",
        subtitle: "آراء حقيقية من مجتمع نوفيل",
        columns: 3,
        items: [
          { name: "أحمد محمد", role: "مطور Frontend", content: "منصة رائعة ساعدتني كثيراً في تعلم البرمجة من الصفر", rating: 5 },
          { name: "سارة علي", role: "طالبة علوم حاسب", content: "المحتوى عالي الجودة والشرح بالعربي يساعدني كثيراً", rating: 5 },
          { name: "خالد عبدالله", role: "مهندس برمجيات", content: "التحديات البرمجية ممتازة لتطوير مهاراتك يومياً", rating: 4 },
        ],
      };
    case "faq":
      return {
        title: "الأسئلة الشائعة",
        subtitle: "إجابات على أكثر الأسئلة شيوعاً",
        items: [
          { question: "هل المنصة مجانية؟", answer: "نعم، يمكنك الوصول إلى كثير من الكورسات مجاناً مع إمكانية الترقية لمحتوى إضافي." },
          { question: "ما هي اللغات التي تدعمونها؟", answer: "ندعم Python وJavaScript وTypeScript وغيرها من لغات البرمجة الأكثر طلباً." },
          { question: "كيف أحصل على الشهادة؟", answer: "أكمل الكورس وتجاوز الاختبار النهائي بنجاح وستحصل على شهادتك تلقائياً." },
        ],
      };
    case "pricing":
      return {
        title: "اختر باقتك",
        subtitle: "ابدأ مجاناً وطوّر نفسك",
        items: [
          {
            name: "مجاني", price: "0ر.س", period: "/شهر", description: "مثالي للمبتدئين",
            features: ["5 كورسات مجانية", "تحديات يومية", "شهادة الإتمام"], color: "cyan",
            isPopular: false, btnText: "ابدأ مجاناً", btnHref: "/auth/register",
          },
          {
            name: "Pro", price: "49ر.س", period: "/شهر", description: "للجادين في التعلم",
            features: ["جميع الكورسات", "تحديات متقدمة", "شهادات معتمدة", "دعم أولوية"], color: "violet",
            badge: "الأكثر شعبية", isPopular: true, btnText: "اشترك الآن", btnHref: "/auth/register",
          },
          {
            name: "مؤسسات", price: "199ر.س", period: "/شهر", description: "للفرق والشركات",
            features: ["كل مزايا Pro", "لوحة تحكم الفريق", "تقارير مفصلة", "مدير حساب خاص"], color: "amber",
            isPopular: false, btnText: "تواصل معنا", btnHref: "#",
          },
        ],
      };
    case "rich_text":
      return { textType: "h2", content: "عنوان قسم جديد", align: "center", size: "md", padding: "md" };
    case "code_block":
      return {
        language: "javascript",
        code: `// مثال على كود JavaScript\nconst greet = (name) => {\n  console.log(\`مرحباً يا \${name}!\`);\n  return true;\n};\n\ngreet('نوفيل');`,
        title: "example.js",
        theme: "dark",
        showLineNumbers: true,
        copyButton: true,
      };
    case "video_embed":
      return { url: "", title: "شاهد الفيديو", aspectRatio: "16:9", autoplay: false, controls: true };
    case "image_banner":
      return {
        imageUrl: "",
        title: "عنوان البانر",
        subtitle: "وصف مختصر ومؤثر",
        height: 400,
        overlayColor: "#000000",
        overlayOpacity: 0.5,
        primaryBtn: { text: "تصرف الآن", href: "#" },
        contentPosition: "center",
      };
    case "countdown":
      return {
        title: "ينتهي العرض خلال",
        subtitle: "لا تفوّت الفرصة",
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        color: "cyan",
      };
    case "mascot_section":
      return {
        mascotType: "robot",
        mascotColor: "#06b6d4",
        mascotSize: "md",
        mascotPosition: "right",
        animationType: "float",
        title: "تعلم البرمجة مع مساعدك الذكي",
        description: "انضم إلى آلاف المبرمجين العرب واستمتع برحلة تعلم تفاعلية ممتعة مع نظام ذكي يرافقك في كل خطوة.",
        primaryBtn: { text: "ابدأ رحلتك", href: "/auth/register" },
        bgStyle: "gradient",
      };
    case "courses_browser":
      return {
        headerTitle: "استعرض جميع الكورسات",
        headerSubtitle: "اختر من مئات الكورسات في مختلف لغات وتقنيات البرمجة",
        badge: "📚 الكورسات",
        categories: ["Python", "JavaScript", "React", "C++", "Java", "Flutter", "SQL", "DevOps"],
        pageSize: 12,
        showLevelFilter: true,
        showSortOptions: true,
      };
    case "articles_browser":
      return {
        headerTitle: "مقالات ونصائح تقنية",
        headerSubtitle: "أحدث المقالات التقنية بالعربي من خبراء البرمجة والتطوير",
        badge: "📰 المقالات",
        categories: ["Python", "JavaScript", "React", "تقنيات الويب", "DevOps", "الخوارزميات", "نصائح المبرمجين"],
        showFeatured: true,
      };
    case "problems_browser":
      return {
        headerTitle: "التحديات البرمجية",
        headerSubtitle: "حل مئات المسائل في مختلف لغات البرمجة واكسب النقاط والشارات",
        badge: "💻 التحديات",
        languages: ["Python", "JavaScript", "C++", "Java", "Go", "Rust"],
        showStats: true,
        showAiChallenge: true,
      };
    case "animation":
      return {
        backgroundType: "gradient",
        bgFrom: "#0a0f1e",
        bgTo: "#1a0a2e",
        gradientDir: "135deg",
        animationType: "particles",
        particleColor: "#06b6d4",
        particleCount: 25,
        speed: "normal",
        height: 300,
        opacity: 0.9,
        showMascot: false,
        mascotType: "robot",
        mascotColor: "#06b6d4",
        mascotPosition: "center",
        showContent: false,
        contentTitle: "",
        contentSubtitle: "",
      };
    case "divider":
      return { style: "gradient", spacing: "md" };
    case "spacer":
      return { height: 60, showLine: false };
    case "text":
      return { content: "أضف نصك هنا...", align: "right", size: "md" };
    default:
      return {};
  }
}

export default router;
