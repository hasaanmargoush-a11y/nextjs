import { Router, type IRouter } from "express";
import { db, dailyChallengesTable, userDailyChallengesTable, problemsTable, submissionsTable, usersTable, badgesTable, userBadgesTable } from "../../lib/db/src/index";
import { eq, and, sql, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "./admin";
import { notify } from "../lib/notifications";

const router: IRouter = Router();

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

// GET /daily-challenge — today's challenge
router.get("/daily-challenge", async (req, res): Promise<void> => {
  const today = getTodayString();

  const [daily] = await db
    .select()
    .from(dailyChallengesTable)
    .where(eq(dailyChallengesTable.challengeDate, today))
    .limit(1);

  if (!daily) {
    res.json({ available: false, message: "لا يوجد تحدٍ يومي اليوم، تابعنا!" });
    return;
  }

  const [problem] = await db
    .select({
      id: problemsTable.id,
      title: problemsTable.title,
      difficulty: problemsTable.difficulty,
      category: problemsTable.category,
      language: problemsTable.language,
      points: problemsTable.points,
      solvedCount: problemsTable.solvedCount,
      description: problemsTable.description,
      examples: problemsTable.examples,
      constraints: problemsTable.constraints,
      starterCode: problemsTable.starterCode,
      hints: problemsTable.hints,
      tags: problemsTable.tags,
    })
    .from(problemsTable)
    .where(eq(problemsTable.id, daily.problemId))
    .limit(1);

  if (!problem) {
    res.json({ available: false });
    return;
  }

  const userId = req.session.userId;
  let isSolvedToday = false;
  let participantsCount = 0;

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(userDailyChallengesTable)
    .where(eq(userDailyChallengesTable.dailyChallengeId, daily.id));

  participantsCount = countResult?.count ?? 0;

  if (userId) {
    const [solved] = await db
      .select()
      .from(userDailyChallengesTable)
      .where(and(
        eq(userDailyChallengesTable.userId, userId),
        eq(userDailyChallengesTable.dailyChallengeId, daily.id)
      ))
      .limit(1);
    isSolvedToday = !!solved;
  }

  res.json({
    available: true,
    dailyChallengeId: daily.id,
    bonusMultiplier: daily.bonusMultiplier,
    challengeDate: daily.challengeDate,
    isSolvedToday,
    participantsCount,
    problem,
  });
});

// GET /daily-challenge/history — past 7 days
router.get("/daily-challenge/history", async (req, res): Promise<void> => {
  const userId = req.session.userId;

  const past = await db
    .select()
    .from(dailyChallengesTable)
    .orderBy(desc(dailyChallengesTable.challengeDate))
    .limit(30);

  if (!userId) {
    res.json(past.map((d) => ({ ...d, isSolved: false })));
    return;
  }

  const userSolved = await db
    .select({ dailyChallengeId: userDailyChallengesTable.dailyChallengeId })
    .from(userDailyChallengesTable)
    .where(eq(userDailyChallengesTable.userId, userId));

  const solvedSet = new Set(userSolved.map((s) => s.dailyChallengeId));

  res.json(past.map((d) => ({ ...d, isSolved: solvedSet.has(d.id) })));
});

// POST /daily-challenge/submit
const SubmitDailySchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
});

router.post("/daily-challenge/submit", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }

  const today = getTodayString();
  const [daily] = await db
    .select()
    .from(dailyChallengesTable)
    .where(eq(dailyChallengesTable.challengeDate, today))
    .limit(1);

  if (!daily) { res.status(404).json({ error: "لا يوجد تحدٍ يومي اليوم" }); return; }

  // Check if already solved
  const [alreadySolved] = await db
    .select()
    .from(userDailyChallengesTable)
    .where(and(
      eq(userDailyChallengesTable.userId, userId),
      eq(userDailyChallengesTable.dailyChallengeId, daily.id)
    ))
    .limit(1);

  if (alreadySolved) {
    res.status(400).json({ error: "لقد حللت التحدي اليومي بالفعل" });
    return;
  }

  const parsed = SubmitDailySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }

  // Use the regular problem submit logic via redirect
  // Instead, return the problem id so frontend can submit normally
  res.json({
    problemId: daily.problemId,
    bonusMultiplier: daily.bonusMultiplier,
    dailyChallengeId: daily.id,
    message: "قدّم الحل عبر صفحة المسألة للحصول على النقاط المضاعفة",
  });
});

// POST /daily-challenge/:id/mark-solved — called internally after accepted submission
router.post("/daily-challenge/:id/mark-solved", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول" }); return; }

  const dailyChallengeId = parseInt(req.params.id as string, 10);
  if (isNaN(dailyChallengeId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const [existing] = await db
    .select()
    .from(userDailyChallengesTable)
    .where(and(
      eq(userDailyChallengesTable.userId, userId),
      eq(userDailyChallengesTable.dailyChallengeId, dailyChallengeId)
    ))
    .limit(1);

  if (existing) { res.json({ alreadyMarked: true }); return; }

  await db.insert(userDailyChallengesTable).values({ userId, dailyChallengeId });

  // Count user's daily solves for badge check
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(userDailyChallengesTable)
    .where(eq(userDailyChallengesTable.userId, userId));

  const totalDaily = countResult?.count ?? 0;

  // Check daily badges
  const dailyBadgeKeys = [
    { key: "daily_1", threshold: 1 },
    { key: "daily_7", threshold: 7 },
    { key: "daily_30", threshold: 30 },
  ];

  for (const { key, threshold } of dailyBadgeKeys) {
    if (totalDaily >= threshold) {
      const [badge] = await db.select().from(badgesTable).where(eq(badgesTable.key, key)).limit(1);
      if (badge) {
        const [existing] = await db
          .select()
          .from(userBadgesTable)
          .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, badge.id)))
          .limit(1);
        if (!existing) {
          await db.insert(userBadgesTable).values({ userId, badgeId: badge.id });
          notify(userId, {
            type: "badge",
            title: `${badge.icon} وسام جديد!`,
            body: `حصلت على وسام "${badge.title}" — ${badge.description}`,
            link: `/dashboard`,
            metadata: { badgeId: badge.id },
          }).catch(() => {/* silent */});
        }
      }
    }
  }

  res.json({ success: true, totalDaily });
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /admin/daily-challenge
router.get("/admin/daily-challenge", requireAdmin, async (_req, res): Promise<void> => {
  const challenges = await db
    .select()
    .from(dailyChallengesTable)
    .orderBy(desc(dailyChallengesTable.challengeDate))
    .limit(60);
  res.json(challenges);
});

// DELETE /admin/daily-challenge/:id
router.delete("/admin/daily-challenge/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  await db.delete(userDailyChallengesTable).where(eq(userDailyChallengesTable.dailyChallengeId, id));
  const [deleted] = await db.delete(dailyChallengesTable).where(eq(dailyChallengesTable.id, id)).returning({ id: dailyChallengesTable.id });
  if (!deleted) { res.status(404).json({ error: "التحدي غير موجود" }); return; }
  res.json({ success: true });
});

// POST /admin/daily-challenge
const AdminDailySchema = z.object({
  problemId: z.number(),
  challengeDate: z.string(),
  bonusMultiplier: z.number().default(2),
});

router.post("/admin/daily-challenge", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminDailySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }
  const [daily] = await db
    .insert(dailyChallengesTable)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: dailyChallengesTable.challengeDate,
      set: { problemId: parsed.data.problemId, bonusMultiplier: parsed.data.bonusMultiplier },
    })
    .returning();
  res.status(201).json(daily);
});

export default router;
