
export interface SeoForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  noIndex: boolean;
  noFollow: boolean;
  thumbnail: string;
  featuredImageAlt: string;
  tags: string[];
  authorName: string;
}

export interface SeoBlock {
  id: string;
  type: string;
  text?: string;
  level?: 1 | 2 | 3;
  src?: string;
  alt?: string;
  language?: string;
  code?: string;
  author?: string;
  listStyle?: "ordered" | "unordered";
  items?: string[];
  videoUrl?: string;
  linkUrl?: string;
  linkText?: string;
}

export interface ContentAnalysis {
  wordCount: number;
  readTimeMinutes: number;
  paragraphCount: number;
  imageCount: number;
  codeBlockCount: number;
  videoCount: number;
  listCount: number;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  headings: Array<{ level: 1 | 2 | 3; text: string }>;
  firstParagraph: string;
  plainText: string;
  blocks: SeoBlock[];
  isBlockBased: boolean;
  internalLinkCount: number;
  externalLinkCount: number;
  hasQuote: boolean;
}

export type CheckStatus = "pass" | "fail" | "warn";
export type CheckCategory = "critical" | "important" | "optional";

export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  category: CheckCategory;
  detail?: string;
}

export interface SeoSuggestion {
  priority: "high" | "medium" | "low";
  icon: string;
  title: string;
  description: string;
  field?: string;
}

export interface SeoAnalysisResult {
  score: number;
  successProbability: number;
  verdict: "excellent" | "good" | "needs-work" | "poor";
  checks: SeoCheck[];
  suggestions: SeoSuggestion[];
  content: ContentAnalysis;
  passCount: number;
  warnCount: number;
  failCount: number;
  criticalFails: number;
}

// ── Content extraction ──────────────────────────────────────────────────────

export function extractContent(rawContent: string): ContentAnalysis {
  let blocks: SeoBlock[] = [];
  let isBlockBased = false;

  try {
    const parsed = JSON.parse(rawContent);
    if (Array.isArray(parsed)) {
      blocks = parsed as SeoBlock[];
      isBlockBased = true;
    }
  } catch {
    // not JSON
  }

  if (!isBlockBased) {
    const text = rawContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const wc = text ? text.split(/\s+/).filter(Boolean).length : 0;
    return {
      wordCount: wc,
      readTimeMinutes: Math.max(1, Math.ceil(wc / 200)),
      paragraphCount: 0,
      imageCount: 0,
      codeBlockCount: 0,
      videoCount: 0,
      listCount: 0,
      h1Count: 0,
      h2Count: 0,
      h3Count: 0,
      headings: [],
      firstParagraph: text.slice(0, 200),
      plainText: text,
      blocks: [],
      isBlockBased: false,
      internalLinkCount: 0,
      externalLinkCount: 0,
      hasQuote: false,
    };
  }

  const textParts: string[] = [];
  let paragraphCount = 0;
  let imageCount = 0;
  let codeBlockCount = 0;
  let videoCount = 0;
  let listCount = 0;
  let h1Count = 0;
  let h2Count = 0;
  let h3Count = 0;
  const headings: Array<{ level: 1 | 2 | 3; text: string }> = [];
  let firstParagraph = "";
  let internalLinkCount = 0;
  let externalLinkCount = 0;
  let hasQuote = false;

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        if (block.text) {
          textParts.push(block.text);
          paragraphCount++;
          if (!firstParagraph) firstParagraph = block.text;
        }
        break;
      case "heading":
        if (block.text) {
          textParts.push(block.text);
          const lvl = (block.level ?? 2) as 1 | 2 | 3;
          headings.push({ level: lvl, text: block.text });
          if (lvl === 1) h1Count++;
          else if (lvl === 2) h2Count++;
          else if (lvl === 3) h3Count++;
        }
        break;
      case "image":
        imageCount++;
        if (block.alt) textParts.push(block.alt);
        break;
      case "code":
        codeBlockCount++;
        break;
      case "video":
        videoCount++;
        break;
      case "list":
        listCount++;
        if (block.items) textParts.push(...block.items.filter(Boolean));
        break;
      case "quote":
        hasQuote = true;
        if (block.text) textParts.push(block.text);
        break;
      case "link":
        if (block.linkUrl) {
          if (block.linkUrl.includes("nouvil.com") || block.linkUrl.startsWith("/")) {
            internalLinkCount++;
          } else {
            externalLinkCount++;
          }
        }
        break;
    }
  }

  const plainText = textParts.join(" ").replace(/\s+/g, " ").trim();
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

  return {
    wordCount,
    readTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)),
    paragraphCount,
    imageCount,
    codeBlockCount,
    videoCount,
    listCount,
    h1Count,
    h2Count,
    h3Count,
    headings,
    firstParagraph,
    plainText,
    blocks,
    isBlockBased,
    internalLinkCount,
    externalLinkCount,
    hasQuote,
  };
}

// ── Keyword utilities ───────────────────────────────────────────────────────

function containsKeyword(text: string, keyword: string): boolean {
  if (!keyword || !text) return false;
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function keywordDensity(plainText: string, keyword: string): number {
  if (!keyword || !plainText) return 0;
  const words = plainText.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const kwWords = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  let occurrences = 0;
  for (let i = 0; i <= words.length - kwWords.length; i++) {
    if (kwWords.every((w, j) => words[i + j] === w)) occurrences++;
  }
  return (occurrences / words.length) * 100;
}

function slugQualityOk(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !slug.includes("--") && slug.length <= 75;
}

// ── Main analyzer ───────────────────────────────────────────────────────────

export function analyzeSeo(form: SeoForm): SeoAnalysisResult {
  const content = extractContent(form.content);
  const kw = form.focusKeyword.trim();
  const density = keywordDensity(content.plainText, kw);

  const checks: SeoCheck[] = [];

  const add = (
    id: string,
    label: string,
    pass: boolean | "warn",
    category: CheckCategory,
    detail?: string
  ) => {
    checks.push({
      id,
      label,
      status: pass === true ? "pass" : pass === "warn" ? "warn" : "fail",
      category,
      detail,
    });
  };

  // ── Critical ──────────────────────────────────────────────────────────────

  add("focus-keyword", "كلمة مفتاحية محددة", form.focusKeyword.length > 0, "critical",
    form.focusKeyword.length === 0 ? "حدد الكلمة المفتاحية التي تريد التصدر بها في Google" : undefined);

  add("meta-title-exists", "عنوان SEO موجود", form.metaTitle.length > 0, "critical",
    form.metaTitle.length === 0 ? "أضف عنوان SEO - هذا أهم عنصر في صفحتك" : undefined);

  add("meta-desc-exists", "وصف SEO موجود", form.metaDescription.length > 0, "critical",
    form.metaDescription.length === 0 ? "الوصف يظهر تحت العنوان في نتائج Google ويؤثر على معدل النقر" : undefined);

  add("word-count-min",
    `محتوى كافٍ (${content.wordCount} / 300 كلمة كحد أدنى)`,
    content.wordCount >= 300 ? true : content.wordCount >= 150 ? "warn" : false,
    "critical",
    content.wordCount < 300 ? `المحتوى الحالي ${content.wordCount} كلمة — يُنصح بـ 600+ للتصدر` : undefined);

  add("thumbnail-exists", "صورة رئيسية موجودة", form.thumbnail.length > 0, "critical",
    !form.thumbnail ? "الصورة الرئيسية ضرورية لجذب النقرات من Google ومنصات التواصل" : undefined);

  // ── Important ─────────────────────────────────────────────────────────────

  const titleOk = form.metaTitle.length >= 30 && form.metaTitle.length <= 60;
  add("meta-title-length",
    `طول العنوان (${form.metaTitle.length}/60 حرف)`,
    form.metaTitle.length === 0 ? false
      : titleOk ? true
      : form.metaTitle.length < 30 ? "warn" : "warn",
    "important",
    !titleOk && form.metaTitle.length > 0
      ? (form.metaTitle.length > 60 ? `العنوان طويل جداً (${form.metaTitle.length} حرف) — سيُقطع في Google` : `العنوان قصير (${form.metaTitle.length} حرف) — الهدف 30-60 حرف`)
      : undefined);

  const descOk = form.metaDescription.length >= 120 && form.metaDescription.length <= 160;
  add("meta-desc-length",
    `طول الوصف (${form.metaDescription.length}/160 حرف)`,
    form.metaDescription.length === 0 ? false
      : descOk ? true
      : "warn",
    "important",
    !descOk && form.metaDescription.length > 0
      ? (form.metaDescription.length > 160 ? `الوصف طويل جداً — سيُقطع في نتائج Google` : `الوصف قصير (${form.metaDescription.length} حرف) — الهدف 120-160 حرف`)
      : undefined);

  add("keyword-in-title",
    "الكلمة المفتاحية في عنوان المقال",
    !kw ? false : containsKeyword(form.title, kw),
    "important",
    kw && !containsKeyword(form.title, kw) ? `أضف "${kw}" في عنوان المقال` : undefined);

  add("keyword-in-meta-title",
    "الكلمة المفتاحية في عنوان SEO",
    !kw ? false : containsKeyword(form.metaTitle, kw),
    "important",
    kw && !containsKeyword(form.metaTitle, kw) ? `أضف "${kw}" في عنوان SEO` : undefined);

  add("keyword-in-meta-desc",
    "الكلمة المفتاحية في وصف SEO",
    !kw ? false : containsKeyword(form.metaDescription, kw),
    "important",
    kw && !containsKeyword(form.metaDescription, kw) ? `أضف "${kw}" في وصف SEO بشكل طبيعي` : undefined);

  const slugOk = form.slug.length > 0 && slugQualityOk(form.slug);
  add("slug-quality",
    form.slug ? `الرابط (Slug) صحيح: ${form.slug}` : "رابط SEO (Slug) موجود",
    form.slug.length === 0 ? false : slugOk ? true : "warn",
    "important",
    !form.slug ? "سيُنشأ تلقائياً عند الحفظ من العنوان" : !slugOk ? "استخدم حروفاً إنجليزية صغيرة وشرطات فقط" : undefined);

  add("keyword-in-slug",
    "الكلمة المفتاحية في رابط الصفحة",
    !kw || !form.slug ? false : containsKeyword(form.slug, kw.toLowerCase().replace(/\s+/g, "-")),
    "important",
    kw && form.slug && !containsKeyword(form.slug, kw.toLowerCase().replace(/\s+/g, "-"))
      ? `حاول تضمين "${kw}" في الـ slug` : undefined);

  add("keyword-in-first-para",
    "الكلمة المفتاحية في أول فقرة",
    !kw ? false : containsKeyword(content.firstParagraph, kw),
    "important",
    kw && !containsKeyword(content.firstParagraph, kw) ? `ابدأ بذكر "${kw}" في أول فقرة في المقال` : undefined);

  add("has-h2",
    `هيكل العناوين (${content.h2Count} عنوان H2)`,
    content.h2Count >= 2 ? true : content.h2Count === 1 ? "warn" : false,
    "important",
    content.h2Count === 0 ? "أضف عناوين H2 لتنظيم المحتوى وتسهيل القراءة" : content.h2Count === 1 ? "يُنصح بإضافة 2+ عناوين H2" : undefined);

  add("keyword-in-heading",
    "الكلمة المفتاحية في أحد عناوين H2",
    !kw ? false : content.headings.filter(h => h.level === 2).some(h => containsKeyword(h.text, kw)),
    "important",
    kw && content.h2Count > 0 && !content.headings.filter(h => h.level === 2).some(h => containsKeyword(h.text, kw))
      ? `أضف "${kw}" في أحد عناوين H2` : undefined);

  // ── Optional / Nice to have ───────────────────────────────────────────────

  add("word-count-good",
    `عمق المحتوى (${content.wordCount} / 600+ كلمة مُنصح)`,
    content.wordCount >= 1000 ? true : content.wordCount >= 600 ? "warn" : false,
    "optional",
    content.wordCount < 600 ? `${600 - content.wordCount} كلمة إضافية لتصل لـ 600` : undefined);

  const densityOk = density >= 1 && density <= 3;
  const densityStr = density.toFixed(1);
  add("keyword-density",
    `كثافة الكلمة المفتاحية (${densityStr}% — المثالي 1-3%)`,
    !kw ? false : density === 0 ? false : densityOk ? true : density > 3 ? "warn" : "warn",
    "optional",
    !kw ? undefined
      : density === 0 ? "لم يُذكر الكلمة المفتاحية في المحتوى"
      : density > 3 ? `كثافة مرتفعة (${densityStr}%) — قد تُعتبر إشارة سلبية`
      : density < 1 ? `كثافة منخفضة (${densityStr}%) — اذكر الكلمة أكثر بشكل طبيعي`
      : undefined);

  add("featured-image-alt",
    "نص بديل للصورة (Alt Text)",
    form.thumbnail && form.featuredImageAlt.length > 0 ? true : form.thumbnail ? false : "warn",
    "optional",
    form.thumbnail && !form.featuredImageAlt ? "أضف نصاً بديلاً للصورة لتحسين SEO وإمكانية الوصول" : undefined);

  add("og-complete",
    "Open Graph مكتمل (للمشاركة على Facebook)",
    form.ogTitle && form.ogDescription && (form.ogImage || form.thumbnail) ? true
      : form.ogTitle || form.ogDescription ? "warn" : false,
    "optional",
    !form.ogTitle && !form.ogDescription ? "أضف عنوان ووصف OG للتحكم في مظهر المشاركة" : undefined);

  add("twitter-complete",
    "Twitter Card مكتملة",
    form.twitterTitle && form.twitterDescription ? true
      : form.twitterTitle || form.twitterDescription ? "warn" : false,
    "optional",
    !form.twitterTitle ? "أضف بيانات Twitter Card لتحسين ظهورك على X/Twitter" : undefined);

  add("has-tags",
    `وسوم (Tags) — ${form.tags.length} وسم`,
    form.tags.length >= 3 ? true : form.tags.length >= 1 ? "warn" : false,
    "optional",
    form.tags.length === 0 ? "أضف 3-5 وسوم لتصنيف المقال" : form.tags.length < 3 ? `أضف ${3 - form.tags.length} وسوم إضافية` : undefined);

  add("has-media-variety",
    "تنوع المحتوى (صور، أكواد، قوائم)",
    content.imageCount + content.codeBlockCount + content.listCount >= 3 ? true
      : content.imageCount + content.codeBlockCount + content.listCount >= 1 ? "warn" : false,
    "optional",
    content.imageCount + content.codeBlockCount + content.listCount < 2
      ? "أضف صوراً وأكواداً وقوائم لتحسين تجربة القارئ ووقت القراءة" : undefined);

  add("canonical-or-noindex",
    form.noIndex ? "noIndex مفعّل (هذه الصفحة لن تُفهرس)" : "وضع الفهرسة سليم",
    form.noIndex ? "warn" : true,
    "optional",
    form.noIndex ? "تأكد أنك تريد إخفاء هذا المقال من محركات البحث" : undefined);

  // ── Score calculation ─────────────────────────────────────────────────────

  const weights: Record<string, number> = {
    "focus-keyword": 8,
    "meta-title-exists": 10,
    "meta-desc-exists": 10,
    "word-count-min": 10,
    "thumbnail-exists": 5,
    "meta-title-length": 5,
    "meta-desc-length": 5,
    "keyword-in-title": 8,
    "keyword-in-meta-title": 8,
    "keyword-in-meta-desc": 6,
    "slug-quality": 3,
    "keyword-in-slug": 5,
    "keyword-in-first-para": 5,
    "has-h2": 5,
    "keyword-in-heading": 3,
    "word-count-good": 4,
    "keyword-density": 4,
    "featured-image-alt": 2,
    "og-complete": 3,
    "twitter-complete": 2,
    "has-tags": 2,
    "has-media-variety": 2,
    "canonical-or-noindex": 1,
  };

  let totalWeight = 0;
  let earnedWeight = 0;
  for (const check of checks) {
    const w = weights[check.id] ?? 1;
    totalWeight += w;
    if (check.status === "pass") earnedWeight += w;
    else if (check.status === "warn") earnedWeight += w * 0.5;
  }

  const score = Math.round((earnedWeight / totalWeight) * 100);

  // ── Success prediction ────────────────────────────────────────────────────

  let prob = 0;
  if (content.wordCount >= 1000) prob += 20;
  else if (content.wordCount >= 600) prob += 12;
  else if (content.wordCount >= 300) prob += 6;

  if (kw && containsKeyword(form.metaTitle, kw)) prob += 15;
  if (kw && containsKeyword(form.title, kw)) prob += 10;
  if (kw && containsKeyword(form.metaDescription, kw)) prob += 8;
  if (kw && form.slug && containsKeyword(form.slug, kw.toLowerCase())) prob += 8;
  if (kw && containsKeyword(content.firstParagraph, kw)) prob += 7;
  if (content.h2Count >= 2) prob += 8;
  if (form.thumbnail) prob += 7;
  if (form.tags.length >= 3) prob += 5;
  if (form.metaTitle.length >= 30 && form.metaTitle.length <= 60) prob += 5;
  if (form.metaDescription.length >= 120 && form.metaDescription.length <= 160) prob += 5;
  if (densityOk) prob += 5;
  if (form.ogImage || (form.ogTitle && form.thumbnail)) prob += 3;
  if (content.imageCount >= 2) prob += 4;

  const successProbability = Math.min(prob, 100);

  // ── Suggestions ───────────────────────────────────────────────────────────

  const suggestions: SeoSuggestion[] = [];

  const failedCritical = checks.filter(c => c.category === "critical" && c.status === "fail");
  const failedImportant = checks.filter(c => c.category === "important" && c.status === "fail");
  const warnChecks = checks.filter(c => c.status === "warn");

  for (const c of failedCritical) {
    suggestions.push({
      priority: "high",
      icon: "🚨",
      title: c.label,
      description: c.detail ?? c.label,
      field: c.id,
    });
  }

  for (const c of failedImportant.slice(0, 4)) {
    suggestions.push({
      priority: "medium",
      icon: "⚠️",
      title: c.label,
      description: c.detail ?? c.label,
      field: c.id,
    });
  }

  for (const c of warnChecks.slice(0, 3)) {
    suggestions.push({
      priority: "low",
      icon: "💡",
      title: c.label,
      description: c.detail ?? c.label,
      field: c.id,
    });
  }

  // ── Verdict ───────────────────────────────────────────────────────────────

  const verdict = score >= 85 ? "excellent" : score >= 65 ? "good" : score >= 40 ? "needs-work" : "poor";

  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const criticalFails = failedCritical.length;

  return {
    score,
    successProbability,
    verdict,
    checks,
    suggestions,
    content,
    passCount,
    warnCount,
    failCount,
    criticalFails,
  };
}

export function generateSlugFromTitle(title: string): string {
  const transliterationMap: Record<string, string> = {
    "ا": "a", "أ": "a", "إ": "i", "آ": "a",
    "ب": "b", "ت": "t", "ث": "th", "ج": "j",
    "ح": "h", "خ": "kh", "د": "d", "ذ": "dh",
    "ر": "r", "ز": "z", "س": "s", "ش": "sh",
    "ص": "s", "ض": "d", "ط": "t", "ظ": "z",
    "ع": "a", "غ": "gh", "ف": "f", "ق": "q",
    "ك": "k", "ل": "l", "م": "m", "ن": "n",
    "ه": "h", "و": "w", "ي": "y", "ى": "a",
    "ة": "h", "ء": "", "ئ": "y", "ؤ": "w",
    " ": "-",
  };

  const latinSlug = title
    .toLowerCase()
    .split("")
    .map(c => {
      if (transliterationMap[c] !== undefined) return transliterationMap[c];
      if (/[a-z0-9]/.test(c)) return c;
      if (c === " " || c === "-" || c === "_") return "-";
      return "";
    })
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

  return latinSlug || "article-slug";
}
