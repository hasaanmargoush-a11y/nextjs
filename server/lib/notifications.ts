import { db, notificationsTable, usersTable } from "../../lib/db/src/index";
import { eq } from "drizzle-orm";
import { emitToUser } from "../socket";

// Level thresholds — must match the frontend LEVEL_POINTS in profile page
const LEVEL_THRESHOLDS: { points: number; level: string; icon: string }[] = [
  { points: 0,    level: "مبتدئ", icon: "🌱" },
  { points: 500,  level: "متوسط", icon: "⚡" },
  { points: 2000, level: "متقدم", icon: "🚀" },
  { points: 5000, level: "خبير",  icon: "👑" },
];

export function getLevel(points: number): string {
  let level = "مبتدئ";
  for (const t of LEVEL_THRESHOLDS) {
    if (points >= t.points) level = t.level;
    else break;
  }
  return level;
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

/** Insert one notification and push it to the user's socket room. */
export async function notify(
  userId: number,
  opts: {
    type: string;
    title: string;
    body: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const [n] = await db
    .insert(notificationsTable)
    .values({
      userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      link: opts.link ?? null,
      metadata: opts.metadata ?? {},
    })
    .returning();
  emitToUser(userId, "notification", n);
  return n;
}

/**
 * After adding points to a user, check if they levelled up and update the DB.
 * Returns the new level string if levelled up, otherwise null.
 */
export async function checkLevelUp(
  userId: number,
  oldPoints: number,
  addedPoints: number
): Promise<string | null> {
  const newPoints = oldPoints + addedPoints;
  const oldLevel = getLevel(oldPoints);
  const newLevel = getLevel(newPoints);

  if (newLevel !== oldLevel) {
    await db
      .update(usersTable)
      .set({ level: newLevel })
      .where(eq(usersTable.id, userId));
    return newLevel;
  }
  return null;
}
