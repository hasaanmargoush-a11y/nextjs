import { Router, type IRouter } from "express";
import { db, problemSolutionsTable, solutionVotesTable, submissionsTable, usersTable, problemsTable } from "../../lib/db/src/index";
import { eq, and, sql, desc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// GET /solutions/problem/:problemId — list solutions (only if user solved it)
router.get("/solutions/problem/:problemId", async (req, res): Promise<void> => {
  const problemId = parseInt(req.params.problemId as string, 10);
  if (isNaN(problemId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const userId = req.session.userId;

  // Check if user solved this problem
  if (userId) {
    const [solved] = await db
      .select()
      .from(submissionsTable)
      .where(and(
        eq(submissionsTable.userId, userId),
        eq(submissionsTable.problemId, problemId),
        eq(submissionsTable.status, "accepted")
      ))
      .limit(1);

    if (!solved) {
      res.status(403).json({ error: "يجب حل المسألة أولاً لرؤية الحلول", requireSolve: true });
      return;
    }
  } else {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }

  const solutions = await db
    .select({
      id: problemSolutionsTable.id,
      code: problemSolutionsTable.code,
      language: problemSolutionsTable.language,
      description: problemSolutionsTable.description,
      executionTime: problemSolutionsTable.executionTime,
      upvotes: problemSolutionsTable.upvotes,
      createdAt: problemSolutionsTable.createdAt,
      userId: problemSolutionsTable.userId,
      userName: usersTable.name,
      userUsername: usersTable.username,
      userAvatar: usersTable.avatar,
    })
    .from(problemSolutionsTable)
    .innerJoin(usersTable, eq(usersTable.id, problemSolutionsTable.userId))
    .where(and(
      eq(problemSolutionsTable.problemId, problemId),
      eq(problemSolutionsTable.isPublic, true)
    ))
    .orderBy(desc(problemSolutionsTable.upvotes), desc(problemSolutionsTable.createdAt))
    .limit(50);

  // Check which solutions current user voted for
  const votedIds = new Set<number>();
  if (userId) {
    const votes = await db
      .select({ solutionId: solutionVotesTable.solutionId })
      .from(solutionVotesTable)
      .where(eq(solutionVotesTable.userId, userId));
    votes.forEach((v) => votedIds.add(v.solutionId));
  }

  // Get performance stats for this problem
  const [perfStats] = await db
    .select({
      avgTime: sql<number>`AVG(${submissionsTable.executionTime})::float`,
      minTime: sql<number>`MIN(${submissionsTable.executionTime})::int`,
      maxTime: sql<number>`MAX(${submissionsTable.executionTime})::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(submissionsTable)
    .where(and(
      eq(submissionsTable.problemId, problemId),
      eq(submissionsTable.status, "accepted"),
      sql`${submissionsTable.executionTime} IS NOT NULL`
    ));

  res.json({
    solutions: solutions.map((s) => ({
      ...s,
      isOwn: s.userId === userId,
      hasVoted: votedIds.has(s.id),
      createdAt: s.createdAt.toISOString(),
    })),
    performanceStats: perfStats,
  });
});

// POST /solutions/problem/:problemId — share a solution
const ShareSolutionSchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
  description: z.string().optional(),
  executionTime: z.number().optional(),
});

router.post("/solutions/problem/:problemId", async (req, res): Promise<void> => {
  const problemId = parseInt(req.params.problemId as string, 10);
  if (isNaN(problemId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }

  // Must have solved the problem
  const [solved] = await db
    .select()
    .from(submissionsTable)
    .where(and(
      eq(submissionsTable.userId, userId),
      eq(submissionsTable.problemId, problemId),
      eq(submissionsTable.status, "accepted")
    ))
    .limit(1);

  if (!solved) {
    res.status(403).json({ error: "يجب حل المسألة أولاً" });
    return;
  }

  const parsed = ShareSolutionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }

  const [solution] = await db
    .insert(problemSolutionsTable)
    .values({ userId, problemId, ...parsed.data })
    .returning();

  res.status(201).json(solution);
});

// POST /solutions/:id/vote — upvote a solution
router.post("/solutions/:id/vote", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }

  const [existing] = await db
    .select()
    .from(solutionVotesTable)
    .where(and(eq(solutionVotesTable.userId, userId), eq(solutionVotesTable.solutionId, id)))
    .limit(1);

  if (existing) {
    // Remove vote (toggle)
    await db.delete(solutionVotesTable).where(eq(solutionVotesTable.id, existing.id));
    await db.update(problemSolutionsTable)
      .set({ upvotes: sql`GREATEST(${problemSolutionsTable.upvotes} - 1, 0)` })
      .where(eq(problemSolutionsTable.id, id));
    res.json({ voted: false });
  } else {
    await db.insert(solutionVotesTable).values({ userId, solutionId: id });
    await db.update(problemSolutionsTable)
      .set({ upvotes: sql`${problemSolutionsTable.upvotes} + 1` })
      .where(eq(problemSolutionsTable.id, id));
    res.json({ voted: true });
  }
});

// DELETE /solutions/:id — delete own solution
router.delete("/solutions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }

  const [solution] = await db
    .select({ id: problemSolutionsTable.id, userId: problemSolutionsTable.userId })
    .from(problemSolutionsTable)
    .where(eq(problemSolutionsTable.id, id))
    .limit(1);

  if (!solution) { res.status(404).json({ error: "الحل غير موجود" }); return; }
  if (solution.userId !== userId) { res.status(403).json({ error: "ليس لديك صلاحية حذف هذا الحل" }); return; }

  await db.delete(solutionVotesTable).where(eq(solutionVotesTable.solutionId, id));
  await db.delete(problemSolutionsTable).where(eq(problemSolutionsTable.id, id));

  res.json({ message: "تم حذف الحل بنجاح" });
});

// GET /solutions/performance/:problemId — performance comparison for current user
router.get("/solutions/performance/:problemId", async (req, res): Promise<void> => {
  const problemId = parseInt(req.params.problemId as string, 10);
  if (isNaN(problemId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول" }); return; }

  // Get user's best accepted submission time
  const [myBest] = await db
    .select({ executionTime: submissionsTable.executionTime })
    .from(submissionsTable)
    .where(and(
      eq(submissionsTable.userId, userId),
      eq(submissionsTable.problemId, problemId),
      eq(submissionsTable.status, "accepted"),
      sql`${submissionsTable.executionTime} IS NOT NULL`
    ))
    .orderBy(submissionsTable.executionTime)
    .limit(1);

  if (!myBest?.executionTime) {
    res.json({ available: false });
    return;
  }

  // Count total accepted submissions and those faster
  const [stats] = await db
    .select({
      total: sql<number>`COUNT(DISTINCT user_id)::int`,
      faster: sql<number>`COUNT(DISTINCT CASE WHEN ${submissionsTable.executionTime} > ${myBest.executionTime} THEN user_id END)::int`,
    })
    .from(submissionsTable)
    .where(and(
      eq(submissionsTable.problemId, problemId),
      eq(submissionsTable.status, "accepted"),
      sql`${submissionsTable.executionTime} IS NOT NULL`
    ));

  const total = stats?.total ?? 1;
  const faster = stats?.faster ?? 0;
  const percentile = Math.round((faster / total) * 100);

  res.json({
    available: true,
    myTime: myBest.executionTime,
    percentile,
    total,
    message: `كودك أسرع من ${percentile}% من الحلول المقدمة`,
  });
});

export default router;
