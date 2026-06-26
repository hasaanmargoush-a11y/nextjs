import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SKIP_PREFIXES = ["/_next/", "/favicon", "/api/", "/__nextjs"];

const ATTACK_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\/html/i,
  /union\s+[\w(]+\s*select/i,
  /drop\s+table/i,
  /exec\s*\(/i,
  /xp_cmdshell/i,
  /';\s*(delete|insert|update|drop|truncate)/i,
  /--\s*$|;\s*--/m,
  /\.\.\//,
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\x00/,
  /\{\{.*\}\}/,
  /\$\{.*\}/,
  /%0[da].*%0[da]/i,
  /(\bor\b|\band\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
  /sleep\s*\(\s*\d+\s*\)/i,
  /benchmark\s*\(/i,
  /load_file\s*\(/i,
  /into\s+outfile/i,
];

function detectAttack(raw: string): boolean {
  try {
    const decoded = decodeURIComponent(raw);
    const doubleDecode = decodeURIComponent(decoded);
    const targets = [raw, decoded, doubleDecode];
    return targets.some((t) => ATTACK_PATTERNS.some((p) => p.test(t)));
  } catch {
    return ATTACK_PATTERNS.some((p) => p.test(raw));
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

let blockedIps: Set<string> = new Set();
let lastFetch = 0;
const CACHE_TTL = 60_000;

async function refreshBlockedIps() {
  if (Date.now() - lastFetch < CACHE_TTL) return;
  try {
    const apiBase =
      process.env.INTERNAL_API_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`;
    const res = await fetch(`${apiBase}/api/security/blocked-ips-list`, {
      headers: { "x-internal-key": process.env.INTERNAL_SECRET ?? "nouvil-internal" },
      cache: "no-store",
    });
    if (res.ok) {
      const data: string[] = await res.json();
      blockedIps = new Set(data);
      lastFetch = Date.now();
    }
  } catch {
  }
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const ip = getClientIp(req);

  await refreshBlockedIps();

  if (ip !== "unknown" && blockedIps.has(ip)) {
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>محظور | نوفيل</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0f1e;font-family:Arial,sans-serif;color:#fff}
.box{text-align:center;padding:48px;border-radius:20px;background:#111827;border:1px solid rgba(239,68,68,.3);max-width:480px}
h1{font-size:48px;margin:0 0 8px}h2{color:#ef4444;margin:0 0 16px}p{color:#94a3b8;line-height:1.7}
a{color:#0ea5e9;text-decoration:none;font-weight:bold}</style></head>
<body><div class="box">
  <h1>🚫</h1>
  <h2>تم حظر وصولك</h2>
  <p>تم حظر عنوان IP الخاص بك بسبب نشاط مشبوه.<br/>
  إذا كنت تعتقد أن هذا خطأ، تواصل مع الدعم الفني.</p>
  <p><a href="mailto:support@nouvil.net">support@nouvil.net</a></p>
</div></body></html>`,
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const fullUrl = pathname + req.nextUrl.search;
  if (detectAttack(fullUrl)) {
    const apiBase2 =
      process.env.INTERNAL_API_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`;
    fetch(`${apiBase2}/api/security/report-attack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": process.env.INTERNAL_SECRET ?? "nouvil-internal",
      },
      body: JSON.stringify({
        ip,
        path: pathname,
        query: req.nextUrl.search,
        userAgent: req.headers.get("user-agent"),
      }),
    }).catch(() => {});
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|ads.txt).*)",
  ],
};
