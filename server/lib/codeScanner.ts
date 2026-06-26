export interface ThreatMatch {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  evidence: string;
  file: string;
  line?: number;
}

export interface ScanResult {
  clean: boolean;
  score: number;
  threats: ThreatMatch[];
  summary: string;
}

interface ThreatPattern {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  pattern: RegExp;
}

const PATTERNS: ThreatPattern[] = [
  // ── Critical: Active Data Exfiltration ────────────────────────────────────
  {
    id: "cookie_steal",
    name: "سرقة الكوكيز",
    severity: "critical",
    description: "الكود يقرأ document.cookie ويرسلها لخادم خارجي",
    pattern: /document\.cookie[\s\S]{0,200}(fetch|XMLHttpRequest|\.open|sendBeacon|navigator\.sendBeacon)/i,
  },
  {
    id: "localstorage_exfil",
    name: "سرقة بيانات التخزين المحلي",
    severity: "critical",
    description: "الكود يقرأ localStorage/sessionStorage ويرسله خارجياً",
    pattern: /localStorage[\s\S]{0,200}(fetch|XMLHttpRequest|\.open|sendBeacon)\s*\(/i,
  },
  {
    id: "credential_harvest",
    name: "حصاد بيانات تسجيل الدخول",
    severity: "critical",
    description: "الكود يستهدف حقول كلمة المرور أو البريد الإلكتروني ليسرقها",
    pattern: /(?:password|passwd|pwd)[\s\S]{0,100}(?:fetch|XMLHttpRequest|sendBeacon|\.send)\s*\(/i,
  },
  {
    id: "iframe_phishing",
    name: "التصيد بـ iframe",
    severity: "critical",
    description: "إنشاء iframe لصفحة خارجية لسرقة بيانات المستخدم",
    pattern: /createElement\s*\(\s*['"]iframe['"]\s*\)[\s\S]{0,300}src\s*=[\s\S]{0,100}https?:\/\/(?!(?:localhost|127\.0\.0\.1))/i,
  },
  {
    id: "sendbeacon_exfil",
    name: "إرسال بيانات خفي (sendBeacon)",
    severity: "critical",
    description: "يستخدم navigator.sendBeacon لإرسال بيانات خفية",
    pattern: /navigator\.sendBeacon\s*\(\s*['"]https?:\/\/(?!(?:localhost|127\.0\.0\.1))/i,
  },

  // ── High: Surveillance / Code Injection ───────────────────────────────────
  {
    id: "keylogger",
    name: "تسجيل نقرات لوحة المفاتيح",
    severity: "high",
    description: "الكود يستمع لأحداث لوحة المفاتيح ليسجّل ما يكتبه المستخدم",
    pattern: /addEventListener\s*\(\s*['"]key(?:down|up|press)['"]\s*,[\s\S]{0,300}(?:fetch|XMLHttpRequest|sendBeacon|\.send)/i,
  },
  {
    id: "eval_obfuscation",
    name: "تشفير وتعتيم الكود",
    severity: "high",
    description: "استخدام eval مع atob/unescape لإخفاء كود ضار",
    pattern: /eval\s*\(\s*(?:atob|unescape|decodeURIComponent)\s*\(/i,
  },
  {
    id: "dom_script_inject",
    name: "حقن سكريبت خارجي",
    severity: "high",
    description: "حقن عنصر <script> يشير لخادم خارجي",
    pattern: /createElement\s*\(\s*['"]script['"]\s*\)[\s\S]{0,200}src\s*=[\s\S]{0,100}https?:\/\/(?!(?:localhost|127\.0\.0\.1))/i,
  },
  {
    id: "redirect_attack",
    name: "إعادة توجيه خبيثة",
    severity: "high",
    description: "إعادة توجيه المستخدم لموقع خارجي دون إذنه",
    pattern: /window\.location(?:\.href|\.replace|\.assign)?\s*=\s*['"]https?:\/\/(?!(?:localhost|127\.0\.0\.1))/i,
  },
  {
    id: "form_hijack",
    name: "اختطاف نماذج الإدخال",
    severity: "high",
    description: "تغيير خاصية action في النماذج لإرسال البيانات لخادم خارجي",
    pattern: /\.action\s*=\s*['"]https?:\/\/(?!(?:localhost|127\.0\.0\.1))/i,
  },
  {
    id: "crypto_mining",
    name: "تعدين عملات مشفرة",
    severity: "high",
    description: "رمز يشير لأدوات تعدين العملات المشفرة",
    pattern: /coinhive|cryptonight|CryptoLoot|webminerpool|minero\.cc|coin-hive\.com|jsecoin/i,
  },
  {
    id: "clipboard_hijack",
    name: "اختطاف الحافظة",
    severity: "high",
    description: "الكتابة على حافظة المستخدم دون موافقته (clipboard hijacking)",
    pattern: /(?:clipboardData|navigator\.clipboard\.writeText)\s*[\s\S]{0,150}(?:fetch|XMLHttpRequest|sendBeacon)/i,
  },

  // ── Medium: Suspicious Patterns ───────────────────────────────────────────
  {
    id: "external_fetch",
    name: "طلبات خارجية مشبوهة",
    severity: "medium",
    description: "إرسال بيانات لخادم خارجي غير موثوق",
    pattern: /fetch\s*\(\s*['"]https?:\/\/(?!(?:localhost|127\.0\.0\.1|api\.|www\.))/i,
  },
  {
    id: "document_write_script",
    name: "حقن HTML خام",
    severity: "medium",
    description: "استخدام document.write لحقن كود HTML/JS",
    pattern: /document\.write\s*\(\s*['"`]<script/i,
  },
  {
    id: "raw_eval",
    name: "استخدام eval",
    severity: "medium",
    description: "استخدام eval() يُمكّن تنفيذ كود ديناميكي خطير",
    pattern: /\beval\s*\(/i,
  },
  {
    id: "proto_pollution",
    name: "تلوث prototype",
    severity: "medium",
    description: "محاولة تعديل Object.prototype لإفساد سلوك التطبيق",
    pattern: /Object\.prototype\s*\[\s*|__proto__\s*\[/i,
  },
  {
    id: "infinite_loop",
    name: "حلقة لا نهائية متعمدة",
    severity: "medium",
    description: "while(true) أو for(;;) دون أي break أو return بداخلها",
    pattern: /while\s*\(\s*(?:true|1)\s*\)\s*\{(?:(?!\bbreak\b|\breturn\b).[\s\S])*?\}/,
  },

  // ── Low: Fingerprinting / Tracking ───────────────────────────────────────
  {
    id: "fingerprinting",
    name: "تتبع بصمة المتصفح",
    severity: "low",
    description: "جمع معلومات تعريفية عن متصفح/جهاز المستخدم",
    pattern: /navigator\.(?:userAgent|platform|hardwareConcurrency|deviceMemory)[\s\S]{0,150}(?:fetch|XMLHttpRequest|sendBeacon)/i,
  },
  {
    id: "screen_capture",
    name: "التقاط الشاشة",
    severity: "low",
    description: "محاولة التقاط شاشة المستخدم",
    pattern: /getDisplayMedia\s*\(\s*\)/i,
  },
];

const SEVERITY_SCORE: Record<string, number> = {
  critical: 100,
  high: 40,
  medium: 15,
  low: 5,
};

interface FileNode {
  type?: string;
  content?: string;
  name?: string;
}

function extractTextFiles(files: unknown[]): { name: string; content: string }[] {
  const result: { name: string; content: string }[] = [];

  function walk(nodes: unknown[]) {
    for (const node of nodes) {
      const f = node as FileNode;
      if (f.type === "file" && typeof f.content === "string" && typeof f.name === "string") {
        result.push({ name: f.name, content: f.content });
      }
    }
  }

  walk(files);
  return result;
}

function getEvidence(content: string, match: RegExpExecArray): string {
  const start = Math.max(0, match.index - 60);
  const end   = Math.min(content.length, match.index + match[0].length + 60);
  return content.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 200);
}

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

export function scanProjectFiles(files: unknown[]): ScanResult {
  const textFiles = extractTextFiles(files);
  const threats: ThreatMatch[] = [];

  for (const { name, content } of textFiles) {
    for (const pat of PATTERNS) {
      const regex = new RegExp(pat.pattern.source, pat.pattern.flags);
      const match = regex.exec(content);
      if (match) {
        threats.push({
          id:          pat.id,
          name:        pat.name,
          severity:    pat.severity,
          description: pat.description,
          evidence:    getEvidence(content, match),
          file:        name,
          line:        getLineNumber(content, match.index),
        });
      }
    }
  }

  const score = threats.reduce((acc, t) => acc + (SEVERITY_SCORE[t.severity] ?? 0), 0);
  const clean = score === 0;

  const criticalCount = threats.filter(t => t.severity === "critical").length;
  const highCount     = threats.filter(t => t.severity === "high").length;

  let summary = "لم يتم اكتشاف أي تهديدات أمنية.";
  if (!clean) {
    const parts: string[] = [];
    if (criticalCount) parts.push(`${criticalCount} تهديد حرج`);
    if (highCount)     parts.push(`${highCount} تهديد عالي`);
    const restCount = threats.length - criticalCount - highCount;
    if (restCount)     parts.push(`${restCount} تهديد آخر`);
    summary = `تم اكتشاف: ${parts.join("، ")}. درجة الخطر: ${score}`;
  }

  return { clean, score, threats, summary };
}

export function shouldAutoBan(result: ScanResult): boolean {
  return result.threats.some(t => t.severity === "critical" || t.severity === "high");
}
