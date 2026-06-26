import { db, emailSettingsTable, seoSettingsTable, adsenseSettingsTable } from "../../lib/db/src/index";

export async function initSettings(): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const [emailRow] = await tx.select().from(emailSettingsTable).limit(1);
      if (!emailRow) {
        await tx.insert(emailSettingsTable).values({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          user: "",
          pass: "",
          fromName: "منصة نوفيل",
          fromEmail: "noreply@nouvil.com",
          enabled: false,
        });
      }

      const [seoRow] = await tx.select().from(seoSettingsTable).limit(1);
      if (!seoRow) {
        await tx.insert(seoSettingsTable).values({
          siteName: "نوفيل | منصة تعليم البرمجة",
          siteUrl: "https://nouvil.com",
          defaultDescription: "تعلم البرمجة بالعربي مع نوفيل — كورسات احترافية، تحديات يومية، وذكاء اصطناعي",
          googleVerification: "",
          bingVerification: "",
          googleAnalyticsId: "",
          robotsDisallow: "/admin/,/dashboard/,/my-courses/,/profile/,/auth/,/api/",
          robotsAllow: "/,/courses/,/articles/,/problems/,/tools,/leaderboard,/about,/contact,/learn/",
          indexingEnabled: true,
        });
      }

      const [adsenseRow] = await tx.select().from(adsenseSettingsTable).limit(1);
      if (!adsenseRow) {
        await tx.insert(adsenseSettingsTable).values({
          enabled: false,
          publisherId: "",
          autoAds: false,
          adSlotTop: "",
          adSlotSide: "",
          adSlotBottom: "",
        });
      }
    });
  } catch {
  }
}
