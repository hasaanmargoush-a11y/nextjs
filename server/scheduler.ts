import { db, articlesTable, duelsTable } from "../lib/db/src/index";
import { eq, and, lte, sql } from "drizzle-orm";
import { logger } from "./lib/logger";

async function publishScheduledArticles(): Promise<void> {
  try {
    const now = new Date();

    const due = await db
      .select({ id: articlesTable.id, title: articlesTable.title })
      .from(articlesTable)
      .where(
        and(
          eq(articlesTable.status, "scheduled"),
          lte(articlesTable.scheduledAt, now)
        )
      );

    if (due.length === 0) return;

    for (const article of due) {
      await db
        .update(articlesTable)
        .set({
          status: "published",
          isPublished: true,
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(articlesTable.id, article.id));

      logger.info({ articleId: article.id, title: article.title }, "Scheduled article published");
    }

    logger.info({ count: due.length }, "Scheduler: published scheduled articles");
  } catch (err) {
    logger.error({ err }, "Scheduler: error publishing scheduled articles");
  }
}

const DUEL_DURATION_MS = 30 * 60 * 1000; // 30 minutes

async function expireActiveDuels(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - DUEL_DURATION_MS);
    const expired = await db
      .update(duelsTable)
      .set({ status: "cancelled", endedAt: new Date() })
      .where(
        and(
          eq(duelsTable.status, "active"),
          lte(duelsTable.startedAt, cutoff)
        )
      )
      .returning({ id: duelsTable.id });

    if (expired.length > 0) {
      logger.info({ count: expired.length }, "Scheduler: expired active duels");
    }

    // Also expire pending invitations (5-min window already set in expiresAt)
    await db
      .update(duelsTable)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(duelsTable.status, "pending"),
          lte(duelsTable.expiresAt, new Date())
        )
      );
  } catch (err) {
    logger.error({ err }, "Scheduler: error expiring duels");
  }
}

export function startScheduler(): void {
  const INTERVAL_MS = 60 * 1000;

  publishScheduledArticles();
  expireActiveDuels();

  setInterval(publishScheduledArticles, INTERVAL_MS);
  setInterval(expireActiveDuels, INTERVAL_MS);

  logger.info({ intervalSeconds: INTERVAL_MS / 1000 }, "Article scheduler started");
}
