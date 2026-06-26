import { Router, type IRouter } from "express";
import { db, usersTable, submissionsTable, problemsTable } from "../../lib/db/src/index";
import { eq, sql, desc, and, gte } from "drizzle-orm";

const router: IRouter = Router();

// GET /leaderboard?period=weekly|monthly|all
router.get("/leaderboard", async (req, res): Promise<void> => {
  const period = (req.query.period as string) || "weekly";
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 100);

  let dateFilter: Date | null = null;
  const now = new Date();

  if (period === "weekly") {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    dateFilter = start;
  } else if (period === "monthly") {
    dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  let rows: Array<{ userId: number; solvedCount: number; totalPoints: number }>;

  if (dateFilter) {
    rows = await db
      .select({
        userId: submissionsTable.userId,
        solvedCount: sql<number>`COUNT(DISTINCT ${submissionsTable.problemId})::int`,
        totalPoints: sql<number>`COALESCE(SUM(${problemsTable.points}), 0)::int`,
      })
      .from(submissionsTable)
      .innerJoin(problemsTable, eq(problemsTable.id, submissionsTable.problemId))
      .where(and(
        eq(submissionsTable.status, "accepted"),
        gte(submissionsTable.createdAt, dateFilter)
      ))
      .groupBy(submissionsTable.userId)
      .orderBy(desc(sql`COUNT(DISTINCT ${submissionsTable.problemId})`))
      .limit(limit) as Array<{ userId: number; solvedCount: number; totalPoints: number }>;
  } else {
    // All-time: use user points directly
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        username: usersTable.username,
        avatar: usersTable.avatar,
        points: usersTable.points,
        streak: usersTable.streak,
        maxStreak: usersTable.maxStreak,
        level: usersTable.level,
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true))
      .orderBy(desc(usersTable.points))
      .limit(limit);

    // Count solved per user
    const solvedCounts = await db
      .select({
        userId: submissionsTable.userId,
        count: sql<number>`COUNT(DISTINCT ${submissionsTable.problemId})::int`,
      })
      .from(submissionsTable)
      .where(eq(submissionsTable.status, "accepted"))
      .groupBy(submissionsTable.userId);

    const solvedMap = new Map(solvedCounts.map((s) => [s.userId, s.count]));

    const userId = req.session.userId;

    res.json({
      period: "all",
      entries: users.map((u, i) => ({
        rank: i + 1,
        userId: u.id,
        name: u.name,
        username: u.username ?? u.name,
        avatar: u.avatar,
        points: u.points,
        solvedCount: solvedMap.get(u.id) ?? 0,
        streak: u.streak,
        maxStreak: u.maxStreak,
        level: u.level,
        isCurrentUser: u.id === userId,
      })),
    });
    return;
  }

  // For weekly/monthly: join with users
  const userIds = rows.map((r) => r.userId);
  if (userIds.length === 0) {
    res.json({ period, entries: [] });
    return;
  }

  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      avatar: usersTable.avatar,
      points: usersTable.points,
      streak: usersTable.streak,
      maxStreak: usersTable.maxStreak,
      level: usersTable.level,
    })
    .from(usersTable)
    .where(sql`${usersTable.id} = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]`)})`);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const userId = req.session.userId;

  const entries = rows.map((r, i) => {
    const u = userMap.get(r.userId);
    return {
      rank: i + 1,
      userId: r.userId,
      name: u?.name ?? "مستخدم",
      username: u?.username ?? "user",
      avatar: u?.avatar ?? null,
      points: r.totalPoints,
      solvedCount: r.solvedCount,
      streak: u?.streak ?? 0,
      maxStreak: u?.maxStreak ?? 0,
      level: u?.level ?? "مبتدئ",
      isCurrentUser: r.userId === userId,
    };
  });

  res.json({ period, entries });
});

// GET /leaderboard/me — current user's rank
router.get("/leaderboard/me", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول" }); return; }

  const [user] = await db.select({
    points: usersTable.points,
    streak: usersTable.streak,
    maxStreak: usersTable.maxStreak,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  const rankResult = await db
    .select({ rank: sql<number>`COUNT(*)::int` })
    .from(usersTable)
    .where(sql`${usersTable.points} > ${user.points} AND ${usersTable.isActive} = true`);

  const rank = (rankResult[0]?.rank ?? 0) + 1;

  const solvedResult = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${submissionsTable.problemId})::int` })
    .from(submissionsTable)
    .where(and(eq(submissionsTable.userId, userId), eq(submissionsTable.status, "accepted")));

  res.json({
    rank,
    points: user.points,
    streak: user.streak,
    maxStreak: user.maxStreak,
    solvedCount: solvedResult[0]?.count ?? 0,
  });
});

export default router;
