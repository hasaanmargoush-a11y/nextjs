# Nouvil — منصة تعليم البرمجة بالعربي

منصة تعليمية عربية للبرمجة مبنية على Next.js 15 مع نظام LMS كامل، تحديات برمجية، وذكاء اصطناعي.

## المتطلبات

- Node.js 20 أو أحدث
- pnpm 10 أو أحدث (`npm install -g pnpm`)
- PostgreSQL 14 أو أحدث

## الإعداد السريع

```bash
# 1. تثبيت التبعيات
pnpm install

# 2. نسخ ملف البيئة
cp .env.example .env
# ثم عدّل .env وضع DATABASE_URL وبقية القيم

# 3. تهيئة قاعدة البيانات
pnpm db:push

# 4. تشغيل المشروع (تطوير)
pnpm dev
```

المشروع سيعمل على: http://localhost:3000

## البناء للإنتاج (Hostinger)

```bash
# 1. تثبيت التبعيات
pnpm install

# 2. بناء المشروع (Next.js + Express)
pnpm build
# ينتج: .next/ (Next.js) + server.mjs (Express)

# 3. تشغيل في الإنتاج
NODE_ENV=production node server.mjs
```

## هيكل المشروع

```
nouvil/
├── app/                    # Next.js App Router (صفحات + API routes)
├── components/             # مكونات React
├── hooks/                  # React hooks
├── lib/                    # مكتبات مشتركة (API client, auth, utils)
│   ├── db/                 # Drizzle ORM + PostgreSQL schema
│   └── api-zod/            # Zod schemas للـ API
├── server/                 # Express backend
│   ├── app.ts              # Express middleware + session + security
│   ├── routes/             # API routes (24 router)
│   ├── socket.ts           # Socket.io
│   └── scheduler.ts        # Background jobs
├── public/                 # Static assets
├── server.ts               # نقطة الدخول الموحدة (Express + Next.js)
├── build-server.mjs        # Production build script
├── next.config.ts          # Next.js config
├── drizzle.config.ts       # Drizzle ORM config
└── .env.example            # نموذج متغيرات البيئة
```

## إعداد Hostinger Cloud Startup

1. Upload المشروع على GitHub (أو رفع الملفات مباشرة)
2. في لوحة تحكم Hostinger:
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `node server.mjs`
   - **Node.js Version**: 20+
3. أضف متغيرات البيئة من `.env.example`

## متغيرات البيئة الأساسية

| المتغير | الوصف | مطلوب |
|---------|-------|--------|
| `DATABASE_URL` | رابط PostgreSQL | ✅ |
| `SESSION_SECRET` | مفتاح سري طويل عشوائي | ✅ |
| `NODE_ENV` | `production` في الإنتاج | ✅ |
| `OPENAI_API_KEY` | مفتاح OpenAI للـ AI features | اختياري |
| `SMTP_*` | إعدادات البريد الإلكتروني | اختياري |

## الحساب الإداري الافتراضي

بعد تشغيل `pnpm db:push` وتسجيل أول حساب، يمكنك ترقيته لـ admin من قاعدة البيانات:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```
