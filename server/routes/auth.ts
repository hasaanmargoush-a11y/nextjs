import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "../../lib/db/src/index";
import { eq, or } from "drizzle-orm";
import {
  RegisterUserBody,
  LoginUserBody,
} from "../../lib/api-zod/src/index";
import { logActivity } from "../lib/activityLogger";
import { notify } from "../lib/notifications";
import { sendEmail, otpEmailTemplate, welcomeEmailTemplate, resetPasswordEmailTemplate, changePasswordOtpTemplate, changeEmailOtpTemplate } from "../lib/email";
import { signToken, verifyToken } from "../lib/tokenSigning";
import { recordSecurityEvent, isIpBanned, isEmailBanned } from "./security";

const router: IRouter = Router();

// Password strength regex: min 8 chars, uppercase, lowercase, number, special
const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,}$/;

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── In-memory rate limiter (no extra packages) ───────────────────────────────
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
  }
  entry.count++;
  return entry.count > limit;
}

function getRateLimitCount(key: string): number {
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() > entry.resetAt) return 0;
  return entry.count;
}

function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// Clean up old entries every 10 min to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitStore.entries()) {
    if (now > v.resetAt) rateLimitStore.delete(k);
  }
}, 10 * 60 * 1000);

// ── Brute-force tracker: fired flag per IP/email to avoid duplicate events ───
// (prevents spamming admin panel with the same event every attempt after threshold)
const bruteForceAlerted = new Map<string, number>(); // key → last alerted timestamp

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    username: user.username ?? user.email.split("@")[0],
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
    bio: user.bio ?? null,
    phone: user.phone ?? null,
    address: user.address ?? null,
    age: user.age ?? null,
    facebook: user.facebook ?? null,
    twitter: user.twitter ?? null,
    linkedin: user.linkedin ?? null,
    github: user.github ?? null,
    points: user.points,
    level: user.level ?? null,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

// ── Register ────────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  try {
    const { name, email, password, username } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }

    if (!STRONG_PASSWORD_RE.test(password)) {
      res.status(400).json({
        message: "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير وصغير، رقم، ورمز خاص",
      });
      return;
    }

    const existing = await db.select().from(usersTable)
      .where(
        username
          ? or(eq(usersTable.email, email), eq(usersTable.username, username))
          : eq(usersTable.email, email)
      )
      .limit(1);

    if (existing.length > 0) {
      // If same email but not verified yet — resend OTP
      if (existing[0].email === email && !existing[0].emailVerified) {
        const otp = generateOTP();
        const expires = new Date(Date.now() + 15 * 60 * 1000);
        await db.update(usersTable)
          .set({ verificationCode: otp, codeExpiresAt: expires })
          .where(eq(usersTable.id, existing[0].id));
        sendEmail({ to: email, subject: "كود التحقق — منصة نوفيل", html: otpEmailTemplate(existing[0].name, otp) })
          .catch(() => {});
        res.status(202).json({ message: "resend_otp", email });
        return;
      }
      if (existing[0].email === email) {
        res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      } else {
        res.status(409).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    const [user] = await db.insert(usersTable).values({
      name,
      email,
      username: username || email.split("@")[0],
      passwordHash,
      role: "user",
      points: 0,
      level: "مبتدئ",
      emailVerified: false,
      verificationCode: otp,
      codeExpiresAt: expires,
    }).returning();

    // Send OTP email (fire-and-forget)
    sendEmail({ to: email, subject: "كود التحقق — منصة نوفيل", html: otpEmailTemplate(name, otp) })
      .catch(() => {});

    const fwd = req.headers["x-forwarded-for"];
    const ip  = typeof fwd === "string" ? fwd.split(",")[0].trim() : (req.socket?.remoteAddress ?? "unknown");
    logActivity({ userId: user.id, action: "register", ip, metadata: { name: user.name, email: user.email } });

    res.status(201).json({ message: "otp_sent", email, userId: user.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "حدث خطأ";
    res.status(500).json({ message: msg });
  }
});

// ── Verify OTP ──────────────────────────────────────────────────────────────
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) { res.status(400).json({ message: "البيانات غير مكتملة" }); return; }

    // Rate limit: max 10 attempts per email per 15 min
    if (isRateLimited(`verify-otp:${email}`, 10, 15 * 60 * 1000)) {
      res.status(429).json({ message: "محاولات كثيرة — انتظر 15 دقيقة وأعد المحاولة" }); return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) { res.status(404).json({ message: "المستخدم غير موجود" }); return; }

    // FIX: Never skip OTP check — even verified users must present valid OTP
    // (verified users should use /auth/login instead)
    if (user.emailVerified) {
      res.status(400).json({ message: "البريد محقق بالفعل — استخدم تسجيل الدخول" }); return;
    }

    if (user.verificationCode !== String(otp)) {
      res.status(400).json({ message: "كود التحقق غير صحيح" }); return;
    }

    if (user.codeExpiresAt && new Date() > user.codeExpiresAt) {
      res.status(400).json({ message: "انتهت صلاحية الكود — اطلب كوداً جديداً" }); return;
    }

    await db.update(usersTable)
      .set({ emailVerified: true, verificationCode: null, codeExpiresAt: null })
      .where(eq(usersTable.id, user.id));

    req.session.userId = user.id;
    const token = signToken(user.id, user.email);

    // Welcome notification + email
    notify(user.id, {
      type: "system",
      title: "🎉 مرحباً بك في Nouvil!",
      body: `أهلاً ${user.name}! ابدأ رحلتك في تعلم البرمجة — استكشف الكورسات والتحديات`,
      link: "/courses",
    }).catch(() => {});
    sendEmail({ to: user.email, subject: "مرحباً بك في نوفيل 🎉", html: welcomeEmailTemplate(user.name) })
      .catch(() => {});

    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : "حدث خطأ" });
  }
});

// ── Resend OTP ──────────────────────────────────────────────────────────────
router.post("/auth/resend-otp", async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ message: "البريد الإلكتروني مطلوب" }); return; }

    // Rate limit: max 5 resends per email per 30 min
    if (isRateLimited(`resend-otp:${email}`, 5, 30 * 60 * 1000)) {
      res.status(429).json({ message: "طلبات كثيرة — انتظر قليلاً وأعد المحاولة" }); return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    // FIX: Don't reveal if email exists or not (anti-enumeration)
    if (!user || user.emailVerified) {
      res.json({ message: "إذا كان البريد مسجلاً وغير محقق، سيصلك كود جديد" }); return;
    }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await db.update(usersTable)
      .set({ verificationCode: otp, codeExpiresAt: expires })
      .where(eq(usersTable.id, user.id));

    sendEmail({ to: email, subject: "كود التحقق الجديد — منصة نوفيل", html: otpEmailTemplate(user.name, otp) })
      .catch(() => {});

    res.json({ message: "تم إرسال كود جديد على بريدك الإلكتروني" });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : "حدث خطأ" });
  }
});

// ── Login ───────────────────────────────────────────────────────────────────
// ── Brute-force thresholds ────────────────────────────────────────────────────
// Per-IP: 5 failed attempts in 15 min → medium alert; 10 → high + auto-ban
// Per-email: 5 failed attempts in 15 min → failed_login medium alert
const BF_IP_WARN_THRESHOLD  = 5;   // after this many → medium security event
const BF_IP_BAN_THRESHOLD   = 10;  // after this many → high + auto-ban
const BF_EMAIL_THRESHOLD    = 5;   // per-email medium alert

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "يرجى إدخال البريد الإلكتروني وكلمة المرور" });
      return;
    }

    const fwdH = req.headers["x-forwarded-for"];
    const ip   = typeof fwdH === "string" ? fwdH.split(",")[0].trim() : (req.socket?.remoteAddress ?? "unknown");
    const emailKey = `login:email:${String(email).toLowerCase()}`;
    const ipKey    = `login:ip:${ip}`;

    // ── 1. Check if IP or email is already banned ─────────────────────────────
    if (isIpBanned(ip)) {
      res.status(403).json({ message: "تم حظر هذا العنوان — تواصل مع الدعم الفني" });
      return;
    }
    if (isEmailBanned(String(email).toLowerCase())) {
      res.status(403).json({ message: "هذا الحساب محظور — تواصل مع الدعم الفني" });
      return;
    }

    // ── 2. Rate limit: max 10 per email per 15 min (blocks the request) ───────
    if (isRateLimited(emailKey, 10, 15 * 60 * 1000)) {
      res.status(429).json({ message: "محاولات كثيرة — انتظر 15 دقيقة وأعد المحاولة" });
      return;
    }

    // ── 3. DB lookup ──────────────────────────────────────────────────────────
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      // Track failed attempt for this IP even for non-existent accounts
      isRateLimited(ipKey, 99999, 15 * 60 * 1000); // just increment
      checkBruteForce(ip, email, ipKey, emailKey, false);
      res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      isRateLimited(ipKey, 99999, 15 * 60 * 1000); // increment IP counter
      checkBruteForce(ip, user.email, ipKey, emailKey, false);
      res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      return;
    }

    if (!user.emailVerified) {
      const otp = generateOTP();
      const expires = new Date(Date.now() + 15 * 60 * 1000);
      await db.update(usersTable)
        .set({ verificationCode: otp, codeExpiresAt: expires })
        .where(eq(usersTable.id, user.id));
      sendEmail({ to: email, subject: "كود التحقق — منصة نوفيل", html: otpEmailTemplate(user.name, otp) })
        .catch(() => {});
      res.status(403).json({ message: "email_not_verified", email });
      return;
    }

    // ── 4. Successful login: reset counters ───────────────────────────────────
    resetRateLimit(ipKey);
    resetRateLimit(emailKey);
    bruteForceAlerted.delete(ipKey);
    bruteForceAlerted.delete(emailKey);

    const token = signToken(user.id, user.email);
    req.session.userId = user.id;
    logActivity({ userId: user.id, action: "login", ip });
    res.json({ user: sanitizeUser(user), token });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "حدث خطأ";
    res.status(500).json({ message: msg });
  }
});

// ── Brute-force evaluation (fire-and-forget, runs after response) ─────────────
function checkBruteForce(ip: string, email: string, ipKey: string, emailKey: string, _success: boolean): void {
  const ipCount    = getRateLimitCount(ipKey);
  const emailCount = getRateLimitCount(emailKey);
  const now        = Date.now();
  const cooldown   = 5 * 60 * 1000; // 5 min between repeated alerts for same key

  // Per-IP: 10+ failed → brute_force HIGH + auto-ban
  if (ipCount >= BF_IP_BAN_THRESHOLD) {
    const lastAlerted = bruteForceAlerted.get(`ban:${ipKey}`) ?? 0;
    if (now - lastAlerted > cooldown) {
      bruteForceAlerted.set(`ban:${ipKey}`, now);
      recordSecurityEvent({
        ip,
        type:     "brute_force",
        severity: "high",
        autoBan:  true,
        details:  {
          source:       "login-brute-force",
          email,
          failedCount:  ipCount,
          window:       "15min",
          path:         "/api/auth/login",
          method:       "POST",
          description:  `محاولات تسجيل دخول فاشلة متكررة (${ipCount} محاولة من نفس الـ IP)`,
        },
      }).catch(() => {});
    }
    return;
  }

  // Per-IP: 5-9 failed → failed_login MEDIUM (warning, no ban)
  if (ipCount >= BF_IP_WARN_THRESHOLD) {
    const lastAlerted = bruteForceAlerted.get(`warn:${ipKey}`) ?? 0;
    if (now - lastAlerted > cooldown) {
      bruteForceAlerted.set(`warn:${ipKey}`, now);
      recordSecurityEvent({
        ip,
        type:     "failed_login",
        severity: "medium",
        autoBan:  false,
        details:  {
          source:      "login-rate-tracker",
          email,
          failedCount: ipCount,
          window:      "15min",
          path:        "/api/auth/login",
          method:      "POST",
          description: `محاولات دخول فاشلة متزايدة (${ipCount} محاولة) — قد يكون Brute Force`,
        },
      }).catch(() => {});
    }
    return;
  }

  // Per-email: 5+ failed → failed_login MEDIUM
  if (emailCount >= BF_EMAIL_THRESHOLD) {
    const lastAlerted = bruteForceAlerted.get(`email:${emailKey}`) ?? 0;
    if (now - lastAlerted > cooldown) {
      bruteForceAlerted.set(`email:${emailKey}`, now);
      recordSecurityEvent({
        ip,
        type:     "failed_login",
        severity: "medium",
        autoBan:  false,
        details:  {
          source:      "login-email-tracker",
          email,
          failedCount: emailCount,
          window:      "15min",
          path:        "/api/auth/login",
          method:      "POST",
          description: `محاولات دخول فاشلة متكررة على نفس الحساب (${emailCount} محاولة)`,
        },
      }).catch(() => {});
    }
  }
}

// ── Forgot Password ─────────────────────────────────────────────────────────
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ message: "البريد الإلكتروني مطلوب" }); return; }

    // Rate limit: max 5 requests per email per hour (anti-spam)
    if (isRateLimited(`forgot:${String(email).toLowerCase()}`, 5, 60 * 60 * 1000)) {
      // Return success to avoid revealing rate limit info
      res.json({ message: "إذا كان البريد مسجلاً، ستصلك رسالة خلال دقائق" }); return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    // Always return success to prevent user enumeration
    if (!user) {
      res.json({ message: "إذا كان البريد مسجلاً، ستصلك رسالة خلال دقائق" });
      return;
    }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await db.update(usersTable)
      .set({ verificationCode: otp, codeExpiresAt: expires })
      .where(eq(usersTable.id, user.id));

    sendEmail({
      to: email,
      subject: "استعادة كلمة المرور — منصة نوفيل",
      html: resetPasswordEmailTemplate(user.name, otp),
    }).catch(() => {});

    res.json({ message: "إذا كان البريد مسجلاً، ستصلك رسالة خلال دقائق" });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : "حدث خطأ" });
  }
});

// ── Reset Password ───────────────────────────────────────────────────────────
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      res.status(400).json({ message: "البيانات غير مكتملة" }); return;
    }

    if (!STRONG_PASSWORD_RE.test(newPassword)) {
      res.status(400).json({
        message: "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير وصغير، رقم، ورمز خاص",
      }); return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) { res.status(404).json({ message: "البريد غير مسجل" }); return; }

    if (user.verificationCode !== String(otp)) {
      res.status(400).json({ message: "كود التحقق غير صحيح" }); return;
    }

    if (user.codeExpiresAt && new Date() > user.codeExpiresAt) {
      res.status(400).json({ message: "انتهت صلاحية الكود — اطلب كوداً جديداً" }); return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.update(usersTable)
      .set({ passwordHash, verificationCode: null, codeExpiresAt: null, emailVerified: true })
      .where(eq(usersTable.id, user.id));

    const fwd = req.headers["x-forwarded-for"];
    const ip = typeof fwd === "string" ? fwd.split(",")[0].trim() : (req.socket?.remoteAddress ?? "unknown");
    logActivity({ userId: user.id, action: "password_reset", ip });

    res.json({ message: "تم تغيير كلمة المرور بنجاح — يمكنك تسجيل الدخول الآن" });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : "حدث خطأ" });
  }
});

// ── Change Password — Request OTP (authenticated) ───────────────────────────
router.post("/auth/change-password-request", async (req, res): Promise<void> => {
  try {
    let userId = req.session.userId;
    if (!userId) userId = getUserIdFromToken(req.headers.authorization) ?? undefined;
    if (!userId) { res.status(401).json({ message: "يجب تسجيل الدخول أولاً" }); return; }

    // Rate limit: 5 requests per user per hour
    if (isRateLimited(`chpw-req:${userId}`, 5, 60 * 60 * 1000)) {
      res.status(429).json({ message: "محاولات كثيرة — انتظر ساعة وأعد المحاولة" }); return;
    }

    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) { res.status(400).json({ message: "البيانات غير مكتملة" }); return; }
    if (newPassword.length < 8) { res.status(400).json({ message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ message: "المستخدم غير موجود" }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ message: "كلمة المرور الحالية غير صحيحة" }); return; }

    const pendingHash = await bcrypt.hash(newPassword, 10);
    const otp = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await db.update(usersTable)
      .set({ pendingPasswordHash: pendingHash, pendingChangeCode: otp, pendingCodeExpiresAt: expires, pendingChangeType: "password" })
      .where(eq(usersTable.id, userId));

    sendEmail({
      to: user.email,
      subject: "كود التحقق لتغيير كلمة مرورك — نوفيل",
      html: changePasswordOtpTemplate(user.name, otp),
    }).catch(() => {});

    res.json({ message: "تم إرسال كود التحقق إلى بريدك الإلكتروني" });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : "حدث خطأ" });
  }
});

// ── Change Password — Confirm OTP (authenticated) ────────────────────────────
router.post("/auth/change-password-confirm", async (req, res): Promise<void> => {
  try {
    let userId = req.session.userId;
    if (!userId) userId = getUserIdFromToken(req.headers.authorization) ?? undefined;
    if (!userId) { res.status(401).json({ message: "يجب تسجيل الدخول أولاً" }); return; }

    // Rate limit: 10 attempts per user per 15 min
    if (isRateLimited(`chpw-confirm:${userId}`, 10, 15 * 60 * 1000)) {
      res.status(429).json({ message: "محاولات كثيرة — انتظر 15 دقيقة وأعد المحاولة" }); return;
    }

    const { otp } = req.body as { otp?: string };
    if (!otp) { res.status(400).json({ message: "كود التحقق مطلوب" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ message: "المستخدم غير موجود" }); return; }

    if (user.pendingChangeType !== "password" || !user.pendingChangeCode || !user.pendingPasswordHash) {
      res.status(400).json({ message: "لا يوجد طلب تغيير كلمة مرور معلق — أعد الطلب من البداية" }); return;
    }
    if (user.pendingChangeCode !== String(otp)) {
      res.status(400).json({ message: "كود التحقق غير صحيح" }); return;
    }
    if (user.pendingCodeExpiresAt && new Date() > user.pendingCodeExpiresAt) {
      res.status(400).json({ message: "انتهت صلاحية الكود — أعد طلب التغيير" }); return;
    }

    await db.update(usersTable)
      .set({ passwordHash: user.pendingPasswordHash, pendingPasswordHash: null, pendingChangeCode: null, pendingCodeExpiresAt: null, pendingChangeType: null })
      .where(eq(usersTable.id, userId));

    const fwd = req.headers["x-forwarded-for"];
    const ip = typeof fwd === "string" ? fwd.split(",")[0].trim() : (req.socket?.remoteAddress ?? "unknown");
    logActivity({ userId, action: "password_changed", ip });

    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : "حدث خطأ" });
  }
});

// ── Change Email — Request OTP (authenticated) ───────────────────────────────
router.post("/auth/change-email-request", async (req, res): Promise<void> => {
  try {
    let userId = req.session.userId;
    if (!userId) userId = getUserIdFromToken(req.headers.authorization) ?? undefined;
    if (!userId) { res.status(401).json({ message: "يجب تسجيل الدخول أولاً" }); return; }

    // Rate limit: 5 requests per user per hour
    if (isRateLimited(`chemail-req:${userId}`, 5, 60 * 60 * 1000)) {
      res.status(429).json({ message: "محاولات كثيرة — انتظر ساعة وأعد المحاولة" }); return;
    }

    const { newEmail } = req.body as { newEmail?: string };
    if (!newEmail || !newEmail.includes("@")) { res.status(400).json({ message: "بريد إلكتروني غير صالح" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ message: "المستخدم غير موجود" }); return; }

    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      res.status(400).json({ message: "البريد الجديد مطابق للحالي" }); return;
    }

    // Check if new email already exists
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.email, newEmail.toLowerCase())).limit(1);
    if (existing) { res.status(400).json({ message: "هذا البريد مسجل بالفعل لحساب آخر" }); return; }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await db.update(usersTable)
      .set({ pendingEmail: newEmail.toLowerCase(), pendingChangeCode: otp, pendingCodeExpiresAt: expires, pendingChangeType: "email" })
      .where(eq(usersTable.id, userId));

    sendEmail({
      to: user.email,
      subject: "كود التحقق لتغيير بريدك الإلكتروني — نوفيل",
      html: changeEmailOtpTemplate(user.name, newEmail, otp),
    }).catch(() => {});

    res.json({ message: "تم إرسال كود التحقق إلى بريدك الحالي" });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : "حدث خطأ" });
  }
});

// ── Change Email — Confirm OTP (authenticated) ───────────────────────────────
router.post("/auth/change-email-confirm", async (req, res): Promise<void> => {
  try {
    let userId = req.session.userId;
    if (!userId) userId = getUserIdFromToken(req.headers.authorization) ?? undefined;
    if (!userId) { res.status(401).json({ message: "يجب تسجيل الدخول أولاً" }); return; }

    // Rate limit: 10 attempts per user per 15 min
    if (isRateLimited(`chemail-confirm:${userId}`, 10, 15 * 60 * 1000)) {
      res.status(429).json({ message: "محاولات كثيرة — انتظر 15 دقيقة وأعد المحاولة" }); return;
    }

    const { otp } = req.body as { otp?: string };
    if (!otp) { res.status(400).json({ message: "كود التحقق مطلوب" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ message: "المستخدم غير موجود" }); return; }

    if (user.pendingChangeType !== "email" || !user.pendingChangeCode || !user.pendingEmail) {
      res.status(400).json({ message: "لا يوجد طلب تغيير بريد معلق — أعد الطلب من البداية" }); return;
    }
    if (user.pendingChangeCode !== String(otp)) {
      res.status(400).json({ message: "كود التحقق غير صحيح" }); return;
    }
    if (user.pendingCodeExpiresAt && new Date() > user.pendingCodeExpiresAt) {
      res.status(400).json({ message: "انتهت صلاحية الكود — أعد طلب التغيير" }); return;
    }

    // Double-check new email still not taken
    const [conflict] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.email, user.pendingEmail)).limit(1);
    if (conflict) { res.status(400).json({ message: "هذا البريد مسجل الآن بحساب آخر — أعد الطلب ببريد مختلف" }); return; }

    await db.update(usersTable)
      .set({ email: user.pendingEmail, pendingEmail: null, pendingChangeCode: null, pendingCodeExpiresAt: null, pendingChangeType: null })
      .where(eq(usersTable.id, userId));

    const fwd = req.headers["x-forwarded-for"];
    const ip = typeof fwd === "string" ? fwd.split(",")[0].trim() : (req.socket?.remoteAddress ?? "unknown");
    logActivity({ userId, action: "email_changed", ip });

    const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : "حدث خطأ" });
  }
});

// ── Logout ──────────────────────────────────────────────────────────────────
router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.userId = undefined;
  req.session.destroy(() => {
    res.json({ message: "تم تسجيل الخروج بنجاح" });
  });
});

function getUserIdFromToken(authHeader: string | undefined): number | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const result = verifyToken(authHeader.slice(7));
  return result?.userId ?? null;
}

router.get("/auth/me", async (req, res): Promise<void> => {
  let userId = req.session.userId;

  if (!userId) {
    const fromToken = getUserIdFromToken(req.headers.authorization);
    if (fromToken) {
      userId = fromToken;
      req.session.userId = fromToken;
    }
  }

  if (!userId) {
    res.status(401).json({ message: "غير مصرح" });
    return;
  }

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ message: "المستخدم غير موجود" });
    return;
  }

  res.json({ user: sanitizeUser(user) });
});

export default router;
