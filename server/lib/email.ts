import nodemailer from "nodemailer";
import { db, emailSettingsTable } from "../../lib/db/src/index";

let cachedSettings: {
  host: string; port: number; secure: boolean;
  user: string; pass: string; fromName: string; fromEmail: string; enabled: boolean;
} | null = null;

let cacheTime = 0;
const CACHE_TTL = 60_000;

async function getSettings() {
  if (cachedSettings && Date.now() - cacheTime < CACHE_TTL) return cachedSettings;
  const rows = await db.select().from(emailSettingsTable).limit(1);
  if (!rows[0]) return null;
  const r = rows[0];
  cachedSettings = {
    host: r.host, port: r.port, secure: r.secure,
    user: r.user, pass: r.pass, fromName: r.fromName, fromEmail: r.fromEmail, enabled: r.enabled,
  };
  cacheTime = Date.now();
  return cachedSettings;
}

export function invalidateEmailCache() { cachedSettings = null; }

export function changePasswordOtpTemplate(name: string, otp: string): string {
  return baseTemplate("تغيير كلمة المرور — نوفيل", `
    <div style="background:#0f172a;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
      <div style="width:64px;height:64px;background:linear-gradient(135deg,#06b6d4,#7c3aed);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
        <span style="font-size:28px">🔒</span>
      </div>
      <h2 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px">تغيير كلمة المرور</h2>
      <p style="color:#94a3b8;font-size:14px;margin:0">مرحباً ${name}، كود التحقق لتغيير كلمة مرور حسابك</p>
    </div>
    <p style="color:#334155;font-size:15px;margin-bottom:20px;text-align:center">استخدم هذا الكود لتأكيد تغيير كلمة المرور:</p>
    <div style="background:linear-gradient(135deg,#06b6d4,#7c3aed);border-radius:16px;padding:24px;text-align:center;margin:20px 0">
      <div style="letter-spacing:12px;font-size:36px;font-weight:900;color:#ffffff;font-family:monospace">${otp}</div>
    </div>
    <div style="background:#fef3c7;border-right:4px solid #f59e0b;border-radius:8px;padding:12px 16px;margin:16px 0">
      <p style="color:#92400e;font-size:13px;margin:0">⚠️ صالح لمدة <strong>15 دقيقة</strong> فقط. لا تشاركه مع أي أحد.</p>
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center">إذا لم تطلب تغيير كلمة المرور، تجاهل هذه الرسالة وتأكد من أمان حسابك.</p>
  `);
}

export function changeEmailOtpTemplate(name: string, newEmail: string, otp: string): string {
  return baseTemplate("تغيير البريد الإلكتروني — نوفيل", `
    <div style="background:#0f172a;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
      <div style="width:64px;height:64px;background:linear-gradient(135deg,#10b981,#7c3aed);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
        <span style="font-size:28px">📧</span>
      </div>
      <h2 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px">تغيير البريد الإلكتروني</h2>
      <p style="color:#94a3b8;font-size:14px;margin:0">مرحباً ${name}، تم طلب تغيير بريدك إلى</p>
      <p style="color:#06b6d4;font-size:16px;font-weight:700;margin:8px 0 0;direction:ltr">${newEmail}</p>
    </div>
    <p style="color:#334155;font-size:15px;margin-bottom:20px;text-align:center">استخدم هذا الكود لتأكيد تغيير بريدك الإلكتروني:</p>
    <div style="background:linear-gradient(135deg,#10b981,#7c3aed);border-radius:16px;padding:24px;text-align:center;margin:20px 0">
      <div style="letter-spacing:12px;font-size:36px;font-weight:900;color:#ffffff;font-family:monospace">${otp}</div>
    </div>
    <div style="background:#fef3c7;border-right:4px solid #f59e0b;border-radius:8px;padding:12px 16px;margin:16px 0">
      <p style="color:#92400e;font-size:13px;margin:0">⚠️ صالح لمدة <strong>15 دقيقة</strong> فقط. لا تشاركه مع أي أحد.</p>
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center">إذا لم تطلب تغيير بريدك الإلكتروني، تجاهل هذه الرسالة وأمّن حسابك فوراً.</p>
  `);
}

export function resetPasswordEmailTemplate(name: string, otp: string): string {
  return baseTemplate("استعادة كلمة المرور — نوفيل", `
    <div style="background:#0f172a;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
      <div style="width:64px;height:64px;background:linear-gradient(135deg,#06b6d4,#7c3aed);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
        <span style="font-size:28px">🔐</span>
      </div>
      <h2 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px">استعادة كلمة المرور</h2>
      <p style="color:#94a3b8;font-size:14px;margin:0">مرحباً ${name}، اليك كود إعادة تعيين كلمة المرور</p>
    </div>
    <p style="color:#334155;font-size:15px;margin-bottom:20px;text-align:center">استخدم هذا الكود لإعادة تعيين كلمة المرور الخاصة بك:</p>
    <div style="background:linear-gradient(135deg,#06b6d4,#7c3aed);border-radius:16px;padding:24px;text-align:center;margin:20px 0">
      <div style="letter-spacing:12px;font-size:36px;font-weight:900;color:#ffffff;font-family:monospace">${otp}</div>
    </div>
    <div style="background:#fef3c7;border-right:4px solid #f59e0b;border-radius:8px;padding:12px 16px;margin:16px 0">
      <p style="color:#92400e;font-size:13px;margin:0">⚠️ صالح لمدة <strong>15 دقيقة</strong> فقط. لا تشاركه مع أي أحد.</p>
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center">إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة.</p>
  `);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const s = await getSettings();
  if (!s || !s.enabled || !s.user || !s.pass) {
    throw new Error("خدمة البريد الإلكتروني غير مفعّلة أو غير مضبوطة");
  }
  const transporter = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth: { user: s.user, pass: s.pass },
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });
  await transporter.sendMail({
    from: `"${s.fromName}" <${s.fromEmail || s.user}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

// ── HTML Email Templates ──────────────────────────────────────────────────────

function baseTemplate(title: string, content: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;padding:0;background:#f0f4f8;font-family:'Tajawal',Arial,sans-serif;direction:rtl}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#0ea5e9,#7c3aed);padding:32px 24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:24px;font-weight:900}
  .header p{color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px}
  .body{padding:32px 24px}
  .otp-box{background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:24px;text-align:center;margin:20px 0}
  .otp-code{font-size:40px;font-weight:900;letter-spacing:8px;color:#16a34a;font-family:monospace}
  .otp-exp{color:#6b7280;font-size:13px;margin-top:8px}
  .btn{display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#0ea5e9,#7c3aed);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;margin:16px 0}
  .info-box{background:#f8fafc;border-radius:10px;padding:16px;margin:12px 0}
  .info-box p{margin:4px 0;color:#374151;font-size:14px}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;color:#9ca3af;font-size:12px}
  .badge{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:4px 14px;border-radius:100px;font-size:13px;font-weight:700}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🎓 منصة نوفيل</h1>
    <p>${title}</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">© 2025 نوفيل — منصة تعليم البرمجة بالعربي<br/>هذا البريد أُرسل تلقائياً، لا تقم بالرد عليه</div>
</div>
</body>
</html>`;
}

export function otpEmailTemplate(name: string, otp: string) {
  return baseTemplate("تأكيد البريد الإلكتروني", `
<p style="color:#374151;font-size:16px">مرحباً <strong>${name}</strong> 👋</p>
<p style="color:#6b7280;font-size:14px">شكراً لتسجيلك في منصة نوفيل! استخدم الكود التالي لتأكيد بريدك الإلكتروني:</p>
<div class="otp-box">
  <div class="otp-code">${otp}</div>
  <div class="otp-exp">⏱️ ينتهي الكود بعد <strong>15 دقيقة</strong></div>
</div>
<p style="color:#6b7280;font-size:13px">إذا لم تقم بالتسجيل في نوفيل، يمكنك تجاهل هذا البريد بأمان.</p>
`);
}

export function certificateEmailTemplate(name: string, courseName: string, certCode: string) {
  return baseTemplate("🎉 تهانينا! حصلت على شهادة جديدة", `
<p style="color:#374151;font-size:16px">مبروك <strong>${name}</strong> 🎉</p>
<p style="color:#6b7280;font-size:14px">لقد أتممت بنجاح دورة:</p>
<div class="info-box">
  <p><strong>📚 اسم الدورة:</strong> ${courseName}</p>
  <p><strong>🏆 رمز الشهادة:</strong> <span style="font-family:monospace;color:#7c3aed">${certCode}</span></p>
</div>
<p style="color:#6b7280;font-size:14px">يمكنك الاطلاع على شهادتك وتنزيلها من لوحة التحكم الخاصة بك:</p>
<div style="text-align:center">
  <a href="https://nouvil.com/certificates/${certCode}" class="btn">🎓 عرض الشهادة</a>
</div>
`);
}

export function achievementEmailTemplate(name: string, achievementTitle: string, points: number) {
  return baseTemplate("🏅 إنجاز جديد!", `
<p style="color:#374151;font-size:16px">أحسنت <strong>${name}</strong>! 🌟</p>
<p style="color:#6b7280;font-size:14px">حققت إنجازاً جديداً على منصة نوفيل:</p>
<div class="info-box" style="text-align:center">
  <span class="badge">🏅 ${achievementTitle}</span>
  <p style="margin-top:12px;color:#374151"><strong>+${points} نقطة</strong> أضيفت لرصيدك</p>
</div>
<p style="color:#6b7280;font-size:14px">واصل التقدم وحقق المزيد من الإنجازات!</p>
<div style="text-align:center">
  <a href="https://nouvil.com/dashboard" class="btn">📊 لوحة التحكم</a>
</div>
`);
}

export function securityAlertEmailTemplate(opts: {
  type: string;
  severity: string;
  ip: string;
  path?: string;
  query?: string;
  userAgent?: string;
  userName?: string | null;
  userEmail?: string | null;
  autoBanned: boolean;
  eventId: number;
  createdAt: string;
}): string {
  const severityAr: Record<string, string> = {
    critical: "🔴 حرج جداً",
    high:     "🟠 عالي",
    medium:   "🟡 متوسط",
    low:      "🟢 منخفض",
  };
  const typeAr: Record<string, string> = {
    intrusion_attempt:      "محاولة اختراق — أنماط هجومية في الـ URL",
    api_injection_attempt:  "حقن عبر الـ API — XSS أو SQL Injection",
    rate_abuse:             "إساءة معدل الطلبات — تجاوز الحد المسموح",
    failed_login:           "محاولات تسجيل دخول فاشلة متكررة",
    suspicious_code:        "كود مشبوه في مشروع IDE",
    brute_force:            "هجوم القوة الغاشمة (Brute Force)",
    xss_attempt:            "هجوم Cross-Site Scripting (XSS)",
    sql_injection:          "هجوم SQL Injection",
    path_traversal:         "محاولة اجتياز المسار (Path Traversal)",
    ssti_attempt:           "حقن قالب (Server-Side Template Injection)",
  };
  const sevLabel = severityAr[opts.severity] ?? opts.severity;
  const typeLabel = typeAr[opts.type] ?? opts.type;
  const banBadge = opts.autoBanned
    ? `<span style="background:#ef4444;color:#fff;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700">🚫 تم الحظر التلقائي</span>`
    : `<span style="background:#f59e0b;color:#fff;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700">⚠️ بدون حظر</span>`;

  return baseTemplate(`🚨 تنبيه أمني — ${sevLabel}`, `
    <div style="background:#1e1b4b;border-radius:16px;padding:28px;text-align:center;margin-bottom:24px">
      <div style="font-size:48px;margin-bottom:8px">🚨</div>
      <h2 style="color:#f87171;font-size:20px;font-weight:800;margin:0 0 6px">تنبيه أمني عاجل</h2>
      <p style="color:#a5b4fc;font-size:14px;margin:0">تم اكتشاف تهديد أمني على منصة نوفيل</p>
      <div style="margin-top:16px">${banBadge}</div>
    </div>
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:16px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#6b7280;width:130px">نوع الهجوم</td><td style="padding:8px 0;color:#1e293b;font-weight:600">${typeLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">مستوى الخطورة</td><td style="padding:8px 0;color:#dc2626;font-weight:700">${sevLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">عنوان IP</td><td style="padding:8px 0;color:#1e293b;font-family:monospace;direction:ltr;text-align:right">${opts.ip}</td></tr>
        ${opts.path ? `<tr><td style="padding:8px 0;color:#6b7280">المسار</td><td style="padding:8px 0;color:#1e293b;font-family:monospace;font-size:12px;direction:ltr;text-align:right;word-break:break-all">${opts.path}${opts.query ?? ""}</td></tr>` : ""}
        ${opts.userName ? `<tr><td style="padding:8px 0;color:#6b7280">المستخدم</td><td style="padding:8px 0;color:#1e293b">${opts.userName} (${opts.userEmail ?? "—"})</td></tr>` : ""}
        ${opts.userAgent ? `<tr><td style="padding:8px 0;color:#6b7280">المتصفح</td><td style="padding:8px 0;color:#9ca3af;font-size:11px;direction:ltr;text-align:right;word-break:break-all">${opts.userAgent.slice(0, 120)}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#6b7280">الوقت</td><td style="padding:8px 0;color:#1e293b">${new Date(opts.createdAt).toLocaleString("ar-EG")}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">رقم الحادثة</td><td style="padding:8px 0;color:#7c3aed;font-weight:700">#${opts.eventId}</td></tr>
      </table>
    </div>
    <div style="background:#fef2f2;border-right:4px solid #ef4444;border-radius:8px;padding:12px 16px;margin:16px 0">
      <p style="color:#991b1b;font-size:13px;margin:0;font-weight:600">⚡ ادخل على لوحة التحكم فوراً لمراجعة هذا الحدث واتخاذ الإجراء المناسب.</p>
    </div>
    <div style="text-align:center;margin-top:20px">
      <a href="https://nouvil.com/admin/security" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#dc2626,#7c3aed);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">🛡️ مركز الأمان</a>
    </div>
  `);
}

export function welcomeEmailTemplate(name: string) {
  return baseTemplate("🎉 مرحباً بك في نوفيل!", `
<p style="color:#374151;font-size:16px">مرحباً <strong>${name}</strong> 🎉</p>
<p style="color:#6b7280;font-size:14px">يسعدنا انضمامك لمنصة نوفيل — أكبر منصة تعليم برمجة بالعربي!</p>
<div class="info-box">
  <p>✅ وصول مجاني لمئات الكورسات</p>
  <p>✅ تحديات برمجية يومية</p>
  <p>✅ شهادات رقمية معتمدة</p>
  <p>✅ ذكاء اصطناعي يقيس مستواك</p>
</div>
<div style="text-align:center">
  <a href="https://nouvil.com/courses" class="btn">🚀 ابدأ التعلم الآن</a>
</div>
`);
}
