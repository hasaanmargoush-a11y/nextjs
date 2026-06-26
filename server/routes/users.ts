import { Router, type IRouter } from "express";
import { db, usersTable, enrollmentsTable, coursesTable, certificatesTable, userCertificatesTable, submissionsTable, lessonsTable, userBadgesTable, badgesTable, problemsTable } from "../../lib/db/src/index";
import { eq, asc, desc } from "drizzle-orm";
import { GetUserParams, UpdateUserParams, UpdateUserBody, GetUserStatsParams, GetUserEnrolledCoursesParams } from "../../lib/api-zod/src/index";

const router: IRouter = Router();

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse({ id: parseInt(req.params.id as string, 10) });
  if (!params.success) {
    res.status(400).json({ error: "معرف المستخدم غير صالح" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  res.json({
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
    createdAt: user.createdAt.toISOString(),
  });
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse({ id: parseInt(req.params.id as string, 10) });
  if (!params.success) {
    res.status(400).json({ error: "معرف المستخدم غير صالح" });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
    bio: user.bio ?? null,
    points: user.points,
    level: user.level ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/users/:id/stats", async (req, res): Promise<void> => {
  const params = GetUserStatsParams.safeParse({ id: parseInt(req.params.id as string, 10) });
  if (!params.success) {
    res.status(400).json({ error: "معرف المستخدم غير صالح" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, params.data.id));
  const completedCourses = enrollments.filter(e => e.completedAt !== null).length;

  const allUsers = await db.select({ id: usersTable.id, points: usersTable.points }).from(usersTable).orderBy(usersTable.points);
  const rank = allUsers.findIndex(u => u.id === params.data.id) + 1;

  res.json({
    totalPoints: user.points,
    completedCourses,
    enrolledCourses: enrollments.length,
    solvedProblems: Math.floor(user.points / 10),
    badges: completedCourses + Math.floor(user.points / 100),
    rank: rank > 0 ? rank : 1,
  });
});

router.get("/users/:id/enrolled-courses", async (req, res): Promise<void> => {
  const params = GetUserEnrolledCoursesParams.safeParse({ id: parseInt(req.params.id as string, 10) });
  if (!params.success) {
    res.status(400).json({ error: "معرف المستخدم غير صالح" });
    return;
  }

  const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, params.data.id));

  const result = await Promise.all(enrollments.map(async (enr) => {
    const [course] = await db.select({ title: coursesTable.title, thumbnail: coursesTable.thumbnail })
      .from(coursesTable).where(eq(coursesTable.id, enr.courseId)).limit(1);

    const lessonsResult = await db.select().from(lessonsTable).where(eq(lessonsTable.courseId, enr.courseId));

    return {
      courseId: enr.courseId,
      title: course?.title ?? "كورس",
      thumbnail: course?.thumbnail ?? null,
      progress: enr.progress,
      completedLessons: enr.completedLessons,
      totalLessons: lessonsResult.length,
      enrolledAt: enr.enrolledAt.toISOString(),
      completedAt: enr.completedAt ? enr.completedAt.toISOString() : null,
    };
  }));

  res.json(result);
});

// GET /users/profile/:username — public full profile with stats
router.get("/users/profile/:username", async (req, res): Promise<void> => {
  const username = req.params.username as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, user.id));
  const completedCourses = enrollments.filter(e => e.completedAt !== null).length;

  const submissions = await db.select({ status: submissionsTable.status })
    .from(submissionsTable).where(eq(submissionsTable.userId, user.id));
  const solvedProblems = submissions.filter(s => s.status === "accepted").length;

  const allUsers = await db.select({ id: usersTable.id, points: usersTable.points })
    .from(usersTable).orderBy(desc(usersTable.points));
  const rank = allUsers.findIndex(u => u.id === user.id) + 1;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username ?? user.email.split("@")[0],
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
      level: user.level ?? "مبتدئ",
      streak: user.streak ?? 0,
      maxStreak: user.maxStreak ?? 0,
      createdAt: user.createdAt.toISOString(),
      completedCourses,
      enrolledCourses: enrollments.length,
      solvedProblems,
      rank: rank > 0 ? rank : 1,
    },
  });
});

// GET /users/profile/:username/courses — public enrolled courses
router.get("/users/profile/:username/courses", async (req, res): Promise<void> => {
  const username = req.params.username as string;
  const [user] = await db.select({ id: usersTable.id }).from(usersTable)
    .where(eq(usersTable.username, username)).limit(1);
  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  const enrollments = await db.select().from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, user.id));

  const courses = await Promise.all(enrollments.map(async (enr) => {
    const [course] = await db.select({
      id: coursesTable.id, title: coursesTable.title, thumbnail: coursesTable.thumbnail,
      category: coursesTable.category, level: coursesTable.level,
    }).from(coursesTable).where(eq(coursesTable.id, enr.courseId)).limit(1);

    const lessons = await db.select({ id: lessonsTable.id }).from(lessonsTable)
      .where(eq(lessonsTable.courseId, enr.courseId));

    return {
      id: enr.courseId,
      title: course?.title ?? "كورس",
      thumbnail: course?.thumbnail ?? null,
      category: course?.category ?? "",
      level: course?.level ?? "",
      progress: enr.progress ?? 0,
      completedLessons: enr.completedLessons ?? 0,
      totalLessons: lessons.length,
      enrolledAt: enr.enrolledAt.toISOString(),
      completedAt: enr.completedAt ? enr.completedAt.toISOString() : null,
    };
  }));

  res.json(courses);
});

// GET /users/leaderboard — top users by points (public)
router.get("/users/leaderboard", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "10")), 50);
  const top = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      avatar: usersTable.avatar,
      points: usersTable.points,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.points))
    .limit(limit);
  res.json(top);
});

// GET /users/profile/:username/badges — public
router.get("/users/profile/:username/badges", async (req, res): Promise<void> => {
  const username = req.params.username as string;
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);
  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  const userBadges = await db
    .select({
      id: userBadgesTable.id,
      key: badgesTable.key,
      name: badgesTable.title,
      description: badgesTable.description,
      icon: badgesTable.icon,
      color: badgesTable.color,
      rarity: badgesTable.condition,
      awardedAt: userBadgesTable.earnedAt,
    })
    .from(userBadgesTable)
    .innerJoin(badgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
    .where(eq(userBadgesTable.userId, user.id))
    .orderBy(desc(userBadgesTable.earnedAt));

  res.json(userBadges);
});

// GET /users/profile/:username/certificates — public, no auth needed
router.get("/users/profile/:username/certificates", async (req, res): Promise<void> => {
  const username = req.params.username as string;
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);
  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  const certs = await db
    .select({
      id: userCertificatesTable.id,
      uniqueCode: userCertificatesTable.uniqueCode,
      issuedAt: userCertificatesTable.issuedAt,
      courseTitle: coursesTable.title,
      certTitle: certificatesTable.title,
      certType: certificatesTable.type,
    })
    .from(userCertificatesTable)
    .innerJoin(certificatesTable, eq(userCertificatesTable.certificateId, certificatesTable.id))
    .innerJoin(coursesTable, eq(userCertificatesTable.courseId, coursesTable.id))
    .where(eq(userCertificatesTable.userId, user.id))
    .orderBy(asc(userCertificatesTable.issuedAt));

  res.json(certs);
});

// GET /users/analysis/weakness — analyze user weak and strong areas by tag
router.get("/users/analysis/weakness", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول" }); return; }

  const subs = await db
    .select({
      problemId: submissionsTable.problemId,
      status: submissionsTable.status,
      tags: problemsTable.tags,
    })
    .from(submissionsTable)
    .innerJoin(problemsTable, eq(problemsTable.id, submissionsTable.problemId))
    .where(eq(submissionsTable.userId, userId));

  if (subs.length < 5) {
    res.json({ ready: false, message: "أكمل 5+ تحديات لرؤية تحليل نقاط ضعفك", totalAttempts: subs.length, weakAreas: [], strongAreas: [] });
    return;
  }

  const tagStats: Record<string, { accepted: number; total: number; problemIds: Set<number> }> = {};
  for (const sub of subs) {
    const tags = (sub.tags as string[]) ?? [];
    for (const tag of tags) {
      if (!tagStats[tag]) tagStats[tag] = { accepted: 0, total: 0, problemIds: new Set() };
      tagStats[tag].total++;
      tagStats[tag].problemIds.add(sub.problemId);
      if (sub.status === "accepted") tagStats[tag].accepted++;
    }
  }

  const entries = Object.entries(tagStats)
    .filter(([, s]) => s.total >= 3)
    .map(([tag, s]) => ({
      tag,
      acceptanceRate: Math.round((s.accepted / s.total) * 100),
      attempts: s.total,
      accepted: s.accepted,
      problemCount: s.problemIds.size,
    }));

  const weakAreas = entries
    .filter((a) => a.acceptanceRate < 60)
    .sort((a, b) => a.acceptanceRate - b.acceptanceRate)
    .slice(0, 5);

  const strongAreas = entries
    .filter((a) => a.acceptanceRate >= 80)
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
    .slice(0, 3);

  res.json({ ready: true, totalAttempts: subs.length, weakAreas, strongAreas });
});

export default router;
