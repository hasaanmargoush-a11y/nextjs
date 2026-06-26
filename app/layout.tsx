import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { cache } from "react";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/Toaster";
import { TopLoader } from "@/components/providers/TopLoader";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

interface SeoSettings {
  siteName?: string;
  siteUrl?: string;
  defaultDescription?: string;
  defaultOgImage?: string;
  googleVerification?: string;
  bingVerification?: string;
  googleAnalyticsId?: string;
  indexingEnabled?: boolean;
}

interface AdsenseSettings {
  enabled?: boolean;
  publisherId?: string;
  autoAds?: boolean;
}

// When using the unified server, the API is on the same port as Next.js
const API_BASE =
  process.env.INTERNAL_API_URL ??
  `http://localhost:${process.env.PORT ?? 3000}`;

const getSeoSettings = cache(async (): Promise<SeoSettings> => {
  try {
    const res = await fetch(`${API_BASE}/api/settings/seo`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
});

const getAdsenseSettings = cache(async (): Promise<AdsenseSettings> => {
  try {
    const res = await fetch(`${API_BASE}/api/settings/adsense`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();

  const title = seo.siteName || "نوفيل | منصة تعليم البرمجة";
  const description =
    seo.defaultDescription ||
    "منصة نوفيل — تعلم البرمجة بالعربي مع كورسات احترافية، تحديات، وذكاء اصطناعي يقيس مستواك";
  const siteUrl = seo.siteUrl || "https://nouvil.com";
  const ogImage = seo.defaultOgImage || `${siteUrl}/og-image.jpg`;
  const indexing = seo.indexingEnabled !== false;

  return {
    title: {
      default: title,
      template: `%s | نوفيل`,
    },
    description,
    keywords: ["تعليم البرمجة", "كورسات برمجة", "برمجة بالعربي", "نوفيل"],
    authors: [{ name: "نوفيل" }],
    robots: indexing
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: title,
      locale: "ar_EG",
      type: "website",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
    verification: {
      google: seo.googleVerification || undefined,
      other: seo.bingVerification
        ? { "msvalidate.01": [seo.bingVerification] }
        : undefined,
    },
    metadataBase: new URL(siteUrl),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [seo, adsense] = await Promise.all([
    getSeoSettings(),
    getAdsenseSettings(),
  ]);

  const gaId = seo.googleAnalyticsId?.trim();
  const adsenseEnabled =
    adsense.enabled && adsense.publisherId?.startsWith("ca-pub-");
  const publisherId = adsense.publisherId?.trim();
  const autoAds = adsense.autoAds ?? false;

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap"
          rel="stylesheet"
        />

        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{page_path:window.location.pathname});`}
            </Script>
          </>
        )}

        {adsenseEnabled && publisherId && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className={tajawal.className} suppressHydrationWarning>
        <TopLoader />
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
