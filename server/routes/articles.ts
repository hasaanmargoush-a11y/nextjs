import { Router, type IRouter } from "express";
import { db, articlesTable, platformSettingsTable } from "../../lib/db/src/index";
import { eq, ilike, and, type SQL, sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAdmin } from "./admin";
import OpenAI from "openai";

const router: IRouter = Router();

// ── AI client (reads from DB first, falls back to env vars) ─────────────────
async function getAiClient(): Promise<OpenAI | null> {
  try {
    // Try DB-stored settings first
    const rows = await db.select().from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "ai_api_key"));
    if (rows[0]?.value) {
      const baseUrlRow = await db.select().from(platformSettingsTable)
        .where(eq(platformSettingsTable.key, "ai_base_url"));
      return new OpenAI({
        apiKey: rows[0].value,
        baseURL: baseUrlRow[0]?.value || "https://api.groq.com/openai/v1",
      });
    }
  } catch { /* fall through to env */ }

  // Fall back to env vars
  if (process.env.GROQ_API_KEY) {
    return new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return null;
}

async function getAiModel(): Promise<string> {
  try {
    const rows = await db.select().from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "ai_model"));
    if (rows[0]?.value) return rows[0].value;
  } catch { /* fall through */ }
  return process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-4o-mini";
}

// ── Image upload for articles ──────────────────────────────────────────────
const ARTICLE_UPLOAD_DIR = path.join(process.cwd(), "uploads", "articles");
if (!fs.existsSync(ARTICLE_UPLOAD_DIR)) fs.mkdirSync(ARTICLE_UPLOAD_DIR, { recursive: true });

const articleStorage = multer.diskStorage({
  destination: ARTICLE_UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const articleUpload = multer({
  storage: articleStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

router.post("/articles/upload-image", requireAdmin, articleUpload.single("image"), (req, res): void => {
  if (!req.file) { res.status(400).json({ error: "لم يتم رفع صورة" }); return; }
  res.json({ url: `/api/article-images/${req.file.filename}` });
});

// ── AI SEO suggestions ──────────────────────────────────────────────────────
router.post("/articles/ai-seo", requireAdmin, async (req, res): Promise<void> => {
  const openai = await getAiClient();
  if (!openai) {
    res.status(503).json({ error: "خدمة الذكاء الاصطناعي غير متاحة — أضف API key من إعدادات الذكاء الاصطناعي" });
    return;
  }

  const { title, excerpt, content, focusKeyword, category, currentMetaTitle, currentMetaDescription } = req.body as {
    title?: string;
    excerpt?: string;
    content?: string;
    focusKeyword?: string;
    category?: string;
    currentMetaTitle?: string;
    currentMetaDescription?: string;
  };

  if (!title && !excerpt) {
    res.status(400).json({ error: "يجب توفير العنوان أو المقتطف على الأقل" });
    return;
  }

  // Extract plain text from block content
  let plainContent = "";
  if (content) {
    try {
      const blocks = JSON.parse(content) as Array<{ type: string; text?: string; items?: string[] }>;
      if (Array.isArray(blocks)) {
        plainContent = blocks
          .map(b => b.text || (b.items ? b.items.join(" ") : ""))
          .filter(Boolean)
          .join(" ")
          .slice(0, 2000);
      }
    } catch {
      plainContent = content.slice(0, 2000);
    }
  }

  const prompt = `أنت خبير SEO متخصص في المحتوى العربي. بناءً على المعلومات التالية، قدم اقتراحات SEO احترافية بالعربية.

عنوان المقال: ${title || "—"}
المقتطف: ${excerpt || "—"}
التصنيف: ${category || "—"}
الكلمة المفتاحية: ${focusKeyword || "—"}
مقتطف من المحتوى: ${plainContent || "—"}
عنوان SEO الحالي: ${currentMetaTitle || "—"}
وصف SEO الحالي: ${currentMetaDescription || "—"}

قدم الاقتراحات بصيغة JSON بالضبط بهذا الشكل (لا تضف أي نص خارج JSON):
{
  "titleSuggestions": [
    {"text": "عنوان SEO مقترح 1 (30-60 حرف)", "score": 85, "reason": "سبب قصير"},
    {"text": "عنوان SEO مقترح 2 (30-60 حرف)", "score": 78, "reason": "سبب قصير"},
    {"text": "عنوان SEO مقترح 3 (30-60 حرف)", "score": 72, "reason": "سبب قصير"}
  ],
  "descriptionSuggestions": [
    {"text": "وصف SEO مقترح 1 (120-160 حرف يجب أن يكون واضحاً ويحتوي الكلمة المفتاحية)", "score": 90, "reason": "سبب قصير"},
    {"text": "وصف SEO مقترح 2 (120-160 حرف)", "score": 82, "reason": "سبب قصير"}
  ],
  "keywordSuggestions": ["كلمة مفتاحية 1", "كلمة مفتاحية 2", "كلمة مفتاحية 3", "كلمة مفتاحية 4"],
  "titleAnalysis": "تحليل قصير للعنوان الحالي وكيفية تحسينه",
  "generalTips": ["نصيحة SEO مهمة 1", "نصيحة SEO مهمة 2", "نصيحة SEO مهمة 3"]
}`;

  try {
    const model = await getAiModel();
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "تعذّر تحليل الرد" });
      return;
    }
    const suggestions = JSON.parse(jsonMatch[0]);
    res.json(suggestions);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(500).json({ error: `فشل الذكاء الاصطناعي: ${msg}` });
  }
});

// ── Helper ─────────────────────────────────────────────────────────────────
function formatArticle(a: typeof articlesTable.$inferSelect, full = false) {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    ...(full ? { content: a.content } : {}),
    category: a.category,
    authorName: a.authorName,
    readTime: a.readTime,
    views: a.views,
    tags: a.tags,
    isFeatured: a.isFeatured,
    thumbnail: a.thumbnail ?? null,
    featuredImageAlt: a.featuredImageAlt ?? null,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    ...(full ? {
      metaTitle: a.metaTitle ?? null,
      metaDescription: a.metaDescription ?? null,
      ogTitle: a.ogTitle ?? null,
      ogDescription: a.ogDescription ?? null,
      ogImage: a.ogImage ?? null,
      twitterTitle: a.twitterTitle ?? null,
      twitterDescription: a.twitterDescription ?? null,
      twitterImage: a.twitterImage ?? null,
      focusKeyword: a.focusKeyword ?? null,
      canonicalUrl: a.canonicalUrl ?? null,
      noIndex: a.noIndex ?? false,
      noFollow: a.noFollow ?? false,
      wordCount: a.wordCount ?? 0,
    } : {}),
  };
}

// GET /articles
router.get("/articles", async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const category = req.query.category as string | undefined;

  const conditions: SQL[] = [eq(articlesTable.isPublished, true)];
  if (search) conditions.push(ilike(articlesTable.title, `%${search}%`));
  if (category) conditions.push(eq(articlesTable.category, category));

  const articles = await db.select().from(articlesTable)
    .where(and(...conditions))
    .orderBy(sql`${articlesTable.createdAt} DESC`);

  res.json(articles.map((a) => formatArticle(a, false)));
});

// GET /articles/:slugOrId  — supports both slug (string) and id (number)
router.get("/articles/:slugOrId", async (req, res): Promise<void> => {
  const param = req.params.slugOrId as string;
  const numId = parseInt(param, 10);
  const isNumeric = !isNaN(numId) && String(numId) === param;

  const conditions: SQL[] = isNumeric
    ? [eq(articlesTable.id, numId), eq(articlesTable.isPublished, true)]
    : [eq(articlesTable.slug, param), eq(articlesTable.isPublished, true)];

  const [article] = await db.select().from(articlesTable)
    .where(and(...conditions))
    .limit(1);

  if (!article) {
    res.status(404).json({ error: "المقال غير موجود" });
    return;
  }

  // increment views in background
  db.update(articlesTable)
    .set({ views: article.views + 1 })
    .where(eq(articlesTable.id, article.id))
    .catch(() => {});

  res.json(formatArticle(article, true));
});

export default router;
