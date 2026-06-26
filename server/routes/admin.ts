import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, coursesTable, lessonsTable, enrollmentsTable, problemsTable, submissionsTable, articlesTable, navItemsTable, notificationsTable, platformSettingsTable, ideExecutionLogsTable, userActivityLogsTable, packsTable, badgesTable, userBadgesTable, tracksTable, dailyChallengesTable, securityEventsTable, securityBansTable, userCertificatesTable, certificatesTable, schoolLanguagesTable, schoolChaptersTable, schoolTopicsTable, userProjectsTable, projectStarsTable, problemSolutionsTable, duelsTable, userDailyChallengesTable, lessonProgressTable } from "../../lib/db/src/index";
import { eq, ilike, and, count, sql, desc, gte, lt, inArray, countDistinct, type SQL } from "drizzle-orm";
import { emitToUser, getOnlineCount } from "../socket";
import { notify } from "../lib/notifications";
import { z } from "zod";

const router: IRouter = Router();

const ADMIN_ROLES = ["admin", "super_admin", "content_admin", "users_admin", "articles_admin"] as const;

function getUserIdFromToken(authHeader: string | undefined): number | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [idStr] = decoded.split(":");
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  let userId = req.session.userId;

  if (!userId) {
    const fromToken = getUserIdFromToken(req.headers.authorization);
    if (fromToken) {
      userId = fromToken;
      req.session.userId = fromToken;
    }
  }

  if (!userId) {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }

  db.select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1)
    .then(([user]) => {
      if (!user || !ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number])) {
        res.status(403).json({ error: "غير مصرح لك بالوصول إلى هذه الصفحة" });
        return;
      }
      (req as Request & { adminRole?: string }).adminRole = user.role;
      next();
    })
    .catch(() => res.status(500).json({ error: "خطأ في الخادم" }));
}

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    username: user.username ?? user.email.split("@")[0],
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
    bio: user.bio ?? null,
    points: user.points,
    level: user.level ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

function formatAdminCourse(c: typeof coursesTable.$inferSelect) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    instructor: c.instructor,
    level: c.level,
    category: c.category,
    duration: c.duration,
    studentsCount: c.studentsCount,
    rating: c.rating,
    isPaid: c.isPaid,
    price: c.price ?? null,
    thumbnail: c.thumbnail ?? null,
    isPublished: c.isPublished,
    isFeatured: c.isFeatured,
    requirements: c.requirements ?? [],
    whatYouLearn: c.whatYouLearn ?? [],
    objectives: (c as Record<string, unknown>).objectives as string[] ?? [],
    courseContents: (c as Record<string, unknown>).courseContents as string[] ?? [],
    visibility: (c as Record<string, unknown>).visibility as string ?? "public",
    slug: (c as Record<string, unknown>).slug as string | null ?? null,
    metaTitle: (c as Record<string, unknown>).metaTitle as string | null ?? null,
    metaDescription: (c as Record<string, unknown>).metaDescription as string | null ?? null,
    enrolledCount: c.studentsCount,
    createdAt: c.createdAt.toISOString(),
  };
}

// ============ STATS ============
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [usersResult] = await db.select({ count: count() }).from(usersTable);
  const [coursesResult] = await db.select({ count: count() }).from(coursesTable);
  const [lessonsResult] = await db.select({ count: count() }).from(lessonsTable);
  const [enrollmentsResult] = await db.select({ count: count() }).from(enrollmentsTable);
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [newUsersResult] = await db.select({ count: count() }).from(usersTable).where(sql`${usersTable.createdAt} >= ${firstOfMonth}`);
  const [newCoursesResult] = await db.select({ count: count() }).from(coursesTable).where(sql`${coursesTable.createdAt} >= ${firstOfMonth}`);
  const paidCourses = await db.select({ price: coursesTable.price, studentsCount: coursesTable.studentsCount }).from(coursesTable).where(and(eq(coursesTable.isPaid, true)));
  const totalRevenue = paidCourses.reduce((sum, c) => sum + ((c.price ?? 0) * c.studentsCount), 0);
  res.json({
    totalUsers: usersResult?.count ?? 0,
    totalCourses: coursesResult?.count ?? 0,
    totalLessons: lessonsResult?.count ?? 0,
    totalEnrollments: enrollmentsResult?.count ?? 0,
    totalRevenue,
    newUsersThisMonth: newUsersResult?.count ?? 0,
    newCoursesThisMonth: newCoursesResult?.count ?? 0,
    activeUsers: usersResult?.count ?? 0,
  });
});

// ============ ANALYTICS (comprehensive) ============
router.get("/admin/analytics", requireAdmin, async (_req, res): Promise<void> => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfWeek  = new Date(now); firstOfWeek.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);

  // --- Run all queries in parallel ---
  const [
    // Users
    [totalUsersRow], verifiedUsersRow, usersByRoleRows,
    [newMonthRow], [newWeekRow],
    userGrowthRows,
    // Courses
    [totalCoursesRow], [publishedCoursesRow], [paidCoursesRow],
    [totalEnrollmentsRow], [totalLessonsRow],
    coursesByCategoryRows, coursesByLevelRows,
    topCoursesRows,
    // Challenges
    [totalProblemsRow], [publishedProblemsRow],
    problemsByDiffRows,
    [totalSubsRow], [acceptedSubsRow],
    [totalTracksRow], [totalPacksRow], [totalDailyRow],
    [totalSolsRow], [totalDuelsRow], [totalDailyPartsRow],
    // Badges
    [totalBadgesRow], [totalAwardedRow],
    topBadgesRows,
    // School
    [totalLangsRow], [totalChaptersRow], [totalTopicsRow],
    // Articles
    [totalArticlesRow], [pubArticlesRow],
    articlesByCatRows,
    // Community projects
    [totalProjectsRow], [pubProjectsRow], [totalStarsRow],
    // Certificates
    [totalCertsDefRow], [totalCertsIssuedRow],
    // IDE
    [totalIdeRow], [totalExecRow],
    // Security
    [totalSecEventsRow], [activeBansRow],
    // Activity logs
    recentActivityRows,
    // Lesson progress
    [totalProgressRow],
    // Quiz attempts
    [totalQuizRow],
  ] = await Promise.all([
    // Users
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(usersTable).where(eq(usersTable.emailVerified, true)),
    db.select({ role: usersTable.role, count: count() }).from(usersTable).groupBy(usersTable.role),
    db.select({ count: count() }).from(usersTable).where(sql`${usersTable.createdAt} >= ${firstOfMonth}`),
    db.select({ count: count() }).from(usersTable).where(sql`${usersTable.createdAt} >= ${firstOfWeek}`),
    db.execute(sql`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS cnt
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day
    `),
    // Courses
    db.select({ count: count() }).from(coursesTable),
    db.select({ count: count() }).from(coursesTable).where(eq(coursesTable.isPublished, true)),
    db.select({ count: count() }).from(coursesTable).where(eq(coursesTable.isPaid, true)),
    db.select({ count: count() }).from(enrollmentsTable),
    db.select({ count: count() }).from(lessonsTable),
    db.select({ category: coursesTable.category, count: count() }).from(coursesTable).where(eq(coursesTable.isPublished, true)).groupBy(coursesTable.category),
    db.select({ level: coursesTable.level, count: count() }).from(coursesTable).where(eq(coursesTable.isPublished, true)).groupBy(coursesTable.level),
    db.select({ id: coursesTable.id, title: coursesTable.title, studentsCount: coursesTable.studentsCount, level: coursesTable.level }).from(coursesTable).where(eq(coursesTable.isPublished, true)).orderBy(desc(coursesTable.studentsCount)).limit(5),
    // Challenges
    db.select({ count: count() }).from(problemsTable),
    db.select({ count: count() }).from(problemsTable).where(eq(problemsTable.isPublished, true)),
    db.select({ difficulty: problemsTable.difficulty, count: count() }).from(problemsTable).where(eq(problemsTable.isPublished, true)).groupBy(problemsTable.difficulty),
    db.select({ count: count() }).from(submissionsTable),
    db.select({ count: count() }).from(submissionsTable).where(eq(submissionsTable.status, "accepted")),
    db.select({ count: count() }).from(tracksTable),
    db.select({ count: count() }).from(packsTable),
    db.select({ count: count() }).from(dailyChallengesTable),
    db.select({ count: count() }).from(problemSolutionsTable),
    db.select({ count: count() }).from(duelsTable),
    db.select({ count: countDistinct(userDailyChallengesTable.userId) }).from(userDailyChallengesTable),
    // Badges
    db.select({ count: count() }).from(badgesTable),
    db.select({ count: count() }).from(userBadgesTable),
    db.select({ badgeId: userBadgesTable.badgeId, title: badgesTable.title, icon: badgesTable.icon, cnt: count() })
      .from(userBadgesTable).leftJoin(badgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
      .groupBy(userBadgesTable.badgeId, badgesTable.title, badgesTable.icon)
      .orderBy(desc(count())).limit(5),
    // School
    db.select({ count: count() }).from(schoolLanguagesTable),
    db.select({ count: count() }).from(schoolChaptersTable),
    db.select({ count: count() }).from(schoolTopicsTable),
    // Articles
    db.select({ count: count() }).from(articlesTable),
    db.select({ count: count() }).from(articlesTable).where(eq(articlesTable.isPublished, true)),
    db.select({ category: articlesTable.category, count: count() }).from(articlesTable).where(eq(articlesTable.isPublished, true)).groupBy(articlesTable.category).orderBy(desc(count())).limit(6),
    // Community projects
    db.select({ count: count() }).from(userProjectsTable),
    db.select({ count: count() }).from(userProjectsTable).where(eq(userProjectsTable.isPublic, true)),
    db.select({ count: count() }).from(projectStarsTable),
    // Certificates
    db.select({ count: count() }).from(certificatesTable),
    db.select({ count: count() }).from(userCertificatesTable),
    // IDE
    db.select({ count: count() }).from(userProjectsTable),
    db.select({ count: count() }).from(ideExecutionLogsTable),
    // Security
    db.select({ count: count() }).from(securityEventsTable),
    db.select({ count: count() }).from(securityBansTable).where(eq(securityBansTable.active, true)),
    // Activity logs
    db.select({
      id:        userActivityLogsTable.id,
      userId:    userActivityLogsTable.userId,
      action:    userActivityLogsTable.action,
      ip:        userActivityLogsTable.ip,
      createdAt: userActivityLogsTable.createdAt,
      metadata:  userActivityLogsTable.metadata,
      userName:  usersTable.name,
      userAvatar: usersTable.avatar,
    }).from(userActivityLogsTable)
      .leftJoin(usersTable, eq(userActivityLogsTable.userId, usersTable.id))
      .orderBy(desc(userActivityLogsTable.createdAt))
      .limit(15),
    // Lesson progress (all rows = completed lessons)
    db.select({ count: count() }).from(lessonProgressTable),
    // Completed enrollments (completedAt IS NOT NULL)
    db.select({ count: count() }).from(enrollmentsTable).where(sql`${enrollmentsTable.completedAt} IS NOT NULL`),
  ]);

  // Build user growth chart data (fill missing days with 0)
  const growthMap: Record<string, number> = {};
  for (const row of userGrowthRows.rows as { day: string; cnt: number }[]) {
    growthMap[row.day] = row.cnt;
  }
  const growthChart: { date: string; مستخدمين: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    growthChart.push({ date: key.slice(5), "مستخدمين": growthMap[key] ?? 0 });
  }

  const byRole: Record<string, number> = {};
  for (const r of usersByRoleRows) byRole[r.role] = Number(r.count);

  res.json({
    onlineNow: getOnlineCount(),
    users: {
      total:        Number(totalUsersRow?.count ?? 0),
      verified:     Number((verifiedUsersRow as { count: number }[])[0]?.count ?? 0),
      byRole,
      newThisMonth: Number(newMonthRow?.count ?? 0),
      newThisWeek:  Number(newWeekRow?.count ?? 0),
      growthChart,
    },
    courses: {
      total:            Number(totalCoursesRow?.count ?? 0),
      published:        Number(publishedCoursesRow?.count ?? 0),
      draft:            Number(totalCoursesRow?.count ?? 0) - Number(publishedCoursesRow?.count ?? 0),
      paid:             Number(paidCoursesRow?.count ?? 0),
      free:             Number(publishedCoursesRow?.count ?? 0) - Number(paidCoursesRow?.count ?? 0),
      totalEnrollments: Number(totalEnrollmentsRow?.count ?? 0),
      totalLessons:     Number(totalLessonsRow?.count ?? 0),
      completedLessons: Number(totalProgressRow?.count ?? 0),
      completedCourses: Number(totalQuizRow?.count ?? 0),
      byCategory: coursesByCategoryRows.map(r => ({ name: r.category ?? "أخرى", value: Number(r.count) })),
      byLevel:    coursesByLevelRows.map(r => ({ name: r.level ?? "غير محدد", value: Number(r.count) })),
      topCourses: topCoursesRows.map(r => ({ name: r.title, students: r.studentsCount, level: r.level })),
    },
    challenges: {
      totalProblems:    Number(totalProblemsRow?.count ?? 0),
      published:        Number(publishedProblemsRow?.count ?? 0),
      byDifficulty:     problemsByDiffRows.map(r => ({ name: r.difficulty ?? "سهل", value: Number(r.count) })),
      totalSubmissions: Number(totalSubsRow?.count ?? 0),
      accepted:         Number(acceptedSubsRow?.count ?? 0),
      acceptanceRate:   totalSubsRow?.count ? Math.round((Number(acceptedSubsRow?.count) / Number(totalSubsRow?.count)) * 100) : 0,
      totalTracks:      Number(totalTracksRow?.count ?? 0),
      totalPacks:       Number(totalPacksRow?.count ?? 0),
      dailyChallenges:  Number(totalDailyRow?.count ?? 0),
      dailyParticipants: Number(totalDailyPartsRow?.count ?? 0),
      solutions:        Number(totalSolsRow?.count ?? 0),
      duels:            Number(totalDuelsRow?.count ?? 0),
    },
    badges: {
      total:   Number(totalBadgesRow?.count ?? 0),
      awarded: Number(totalAwardedRow?.count ?? 0),
      top:     topBadgesRows.map(r => ({ name: r.title ?? "شارة", icon: r.icon ?? "🏅", count: Number(r.cnt) })),
    },
    school: {
      languages: Number(totalLangsRow?.count ?? 0),
      chapters:  Number(totalChaptersRow?.count ?? 0),
      topics:    Number(totalTopicsRow?.count ?? 0),
    },
    articles: {
      total:     Number(totalArticlesRow?.count ?? 0),
      published: Number(pubArticlesRow?.count ?? 0),
      draft:     Number(totalArticlesRow?.count ?? 0) - Number(pubArticlesRow?.count ?? 0),
      byCategory: articlesByCatRows.map(r => ({ name: r.category ?? "عام", value: Number(r.count) })),
    },
    community: {
      total:      Number(totalProjectsRow?.count ?? 0),
      public:     Number(pubProjectsRow?.count ?? 0),
      totalStars: Number(totalStarsRow?.count ?? 0),
    },
    certificates: {
      defined: Number(totalCertsDefRow?.count ?? 0),
      issued:  Number(totalCertsIssuedRow?.count ?? 0),
    },
    ide: {
      totalProjects:    Number(totalIdeRow?.count ?? 0),
      totalExecutions:  Number(totalExecRow?.count ?? 0),
    },
    security: {
      totalEvents: Number(totalSecEventsRow?.count ?? 0),
      activeBans:  Number(activeBansRow?.count ?? 0),
    },
    recentActivity: recentActivityRows.map(r => ({
      id:        r.id,
      userId:    r.userId,
      action:    r.action,
      ip:        r.ip,
      createdAt: r.createdAt,
      metadata:  r.metadata,
      userName:  r.userName,
      userAvatar: r.userAvatar,
    })),
  });
});

// ============ USERS ============
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "20"), 10);
  const search = req.query.search as string | undefined;
  const role = req.query.role as string | undefined;

  const conditions: SQL[] = [];
  if (search) {
    conditions.push(sql`(${ilike(usersTable.name, `%${search}%`)} OR ${ilike(usersTable.email, `%${search}%`)} OR ${ilike(usersTable.username ?? sql`''`, `%${search}%`)})`);
  }
  if (role) conditions.push(eq(usersTable.role, role));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [totalResult] = await db.select({ count: count() }).from(usersTable).where(where);
  const users = await db.select().from(usersTable).where(where)
    .orderBy(sql`${usersTable.createdAt} DESC`)
    .limit(limit)
    .offset((page - 1) * limit);

  res.json({ users: users.map(formatUser), total: totalResult?.count ?? 0, page, limit });
});

// POST /admin/users — create user
const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  username: z.string().min(3).optional(),
  password: z.string().min(6),
  role: z.string().default("user"),
});

router.post("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة", details: parsed.error.flatten() });
    return;
  }
  const { name, email, username, password, role } = parsed.data;

  const existing = await db.select({ id: usersTable.id }).from(usersTable)
    .where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const finalUsername = username ?? email.split("@")[0];

  const [user] = await db.insert(usersTable).values({
    name, email, username: finalUsername, passwordHash, role,
  }).returning();

  res.status(201).json(formatUser(user));
});

// PATCH /admin/users/:id
const AdminUserUpdateSchema = z.object({
  role: z.string().optional(),
  points: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

router.patch("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = AdminUserUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Fetch current state to detect ban/unban changes
  const [before] = await db.select({ isActive: usersTable.isActive })
    .from(usersTable).where(eq(usersTable.id, id)).limit(1);

  const [user] = await db.update(usersTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  // Notify user on ban/unban
  if (parsed.data.isActive !== undefined && before && before.isActive !== parsed.data.isActive) {
    if (!parsed.data.isActive) {
      notify(id, {
        type: "system",
        title: "🚫 تم تعليق حسابك",
        body: "تم تعليق حسابك من قِبَل الإدارة. تواصل معنا إذا كنت تعتقد أن هذا خطأ.",
        link: "/",
      }).catch(() => {/* silent */});
    } else {
      notify(id, {
        type: "system",
        title: "✅ تم تفعيل حسابك",
        body: "أُعيد تفعيل حسابك من قِبَل الإدارة — مرحباً بك مجدداً!",
        link: "/dashboard",
      }).catch(() => {/* silent */});
    }
  }

  res.json(formatUser(user));
});

// DELETE /admin/users/:id
router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  await db.delete(enrollmentsTable).where(eq(enrollmentsTable.userId, id));
  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
  if (!deleted) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  res.json({ message: "تم حذف المستخدم بنجاح" });
});

// GET /admin/users/:id/enrollments
router.get("/admin/users/:id/enrollments", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const enrollments = await db
    .select({
      enrollmentId: enrollmentsTable.id,
      courseId: coursesTable.id,
      title: coursesTable.title,
      thumbnail: coursesTable.thumbnail,
      level: coursesTable.level,
      progress: enrollmentsTable.progress,
      enrolledAt: enrollmentsTable.enrolledAt,
    })
    .from(enrollmentsTable)
    .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .where(eq(enrollmentsTable.userId, userId));

  res.json(enrollments.map(e => ({
    enrollmentId: e.enrollmentId,
    courseId: e.courseId,
    title: e.title,
    thumbnail: e.thumbnail ?? null,
    level: e.level,
    progress: e.progress,
    enrolledAt: e.enrolledAt.toISOString(),
  })));
});

// POST /admin/users/:id/enrollments
router.post("/admin/users/:id/enrollments", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const courseId = parseInt(String(req.body.courseId), 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف الكورس غير صالح" }); return; }

  const [course] = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (!course) { res.status(404).json({ error: "الكورس غير موجود" }); return; }

  const existing = await db.select({ id: enrollmentsTable.id }).from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId))).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "المستخدم مسجل بالفعل في هذا الكورس" }); return; }

  const [enrollment] = await db.insert(enrollmentsTable).values({ userId, courseId, progress: 0, completedLessons: 0 }).returning();
  await db.update(coursesTable).set({ studentsCount: sql`${coursesTable.studentsCount} + 1` }).where(eq(coursesTable.id, courseId));

  res.status(201).json({ enrollmentId: enrollment.id, courseId, userId, message: "تم تسجيل المستخدم في الكورس بنجاح" });
});

// DELETE /admin/users/:id/enrollments/:courseId
router.delete("/admin/users/:id/enrollments/:courseId", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(userId) || isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const [deleted] = await db.delete(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId)))
    .returning({ id: enrollmentsTable.id });
  if (!deleted) { res.status(404).json({ error: "التسجيل غير موجود" }); return; }

  await db.update(coursesTable)
    .set({ studentsCount: sql`GREATEST(${coursesTable.studentsCount} - 1, 0)` })
    .where(eq(coursesTable.id, courseId));

  res.json({ message: "تم إلغاء تسجيل المستخدم من الكورس" });
});

// ============ COURSES ============
const CourseInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).default(""),
  instructor: z.string().min(1).default(""),
  level: z.string().default("beginner"),
  category: z.string().min(1).default("عام"),
  duration: z.string().default("0 ساعة"),
  isPaid: z.boolean().default(false),
  price: z.number().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  requirements: z.array(z.string()).default([]),
  whatYouLearn: z.array(z.string()).default([]),
  objectives: z.array(z.string()).default([]),
  courseContents: z.array(z.string()).default([]),
  visibility: z.enum(["public", "private", "unlisted"]).default("public"),
  slug: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
});

router.get("/admin/courses", requireAdmin, async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const published = req.query.published as string | undefined;
  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(coursesTable.title, `%${search}%`));
  if (published === "true") conditions.push(eq(coursesTable.isPublished, true));
  if (published === "false") conditions.push(eq(coursesTable.isPublished, false));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const courses = await db.select().from(coursesTable).where(where).orderBy(sql`${coursesTable.createdAt} DESC`);
  res.json(courses.map(formatAdminCourse));
});

router.get("/admin/courses/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  if (!course) { res.status(404).json({ error: "الكورس غير موجود" }); return; }
  res.json(formatAdminCourse(course));
});

router.post("/admin/courses", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CourseInputSchema.partial().merge(z.object({ title: z.string().min(1) })).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة", fieldErrors: parsed.error.flatten().fieldErrors }); return; }
  const [course] = await db.insert(coursesTable).values({
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    instructor: parsed.data.instructor ?? "",
    level: parsed.data.level ?? "beginner",
    category: parsed.data.category ?? "عام",
    duration: parsed.data.duration ?? "0 ساعة",
    isPaid: parsed.data.isPaid ?? false,
    price: parsed.data.price ?? null,
    thumbnail: parsed.data.thumbnail ?? null,
    isPublished: parsed.data.isPublished ?? false,
    isFeatured: parsed.data.isFeatured ?? false,
    requirements: parsed.data.requirements ?? [],
    whatYouLearn: parsed.data.whatYouLearn ?? [],
    studentsCount: 0,
    rating: 0,
  }).returning();
  res.status(201).json(formatAdminCourse(course));
});

router.patch("/admin/courses/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = CourseInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة", fieldErrors: parsed.error.flatten().fieldErrors }); return; }
  const [course] = await db.update(coursesTable).set({ ...parsed.data, updatedAt: new Date() } as Record<string, unknown>).where(eq(coursesTable.id, id)).returning();
  if (!course) { res.status(404).json({ error: "الكورس غير موجود" }); return; }
  res.json(formatAdminCourse(course));
});

router.delete("/admin/courses/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  await db.delete(enrollmentsTable).where(eq(enrollmentsTable.courseId, id));
  await db.delete(lessonsTable).where(eq(lessonsTable.courseId, id));
  const [deleted] = await db.delete(coursesTable).where(eq(coursesTable.id, id)).returning({ id: coursesTable.id });
  if (!deleted) { res.status(404).json({ error: "الكورس غير موجود" }); return; }
  res.json({ message: "تم حذف الكورس بنجاح" });
});

// ============ PROBLEMS ============
const TestCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
});

const ProblemInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.string().default("easy"),
  category: z.string().min(1),
  language: z.string().default("Python"),
  points: z.number().int().default(10),
  starterCode: z.string().optional(),
  solution: z.string().optional(),
  hints: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  examples: z.array(z.object({ input: z.string(), output: z.string(), explanation: z.string().optional() })).default([]),
  testCases: z.array(TestCaseSchema).default([]),
  isPublished: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  companyTags: z.array(z.string()).default([]),
  packId: z.number().nullable().optional(),
  orderInPack: z.number().default(0),
});

router.get("/admin/problems", requireAdmin, async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(problemsTable.title, `%${search}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const problems = await db.select().from(problemsTable).where(where).orderBy(sql`${problemsTable.createdAt} DESC`);
  res.json(problems.map((p) => ({ id: p.id, title: p.title, difficulty: p.difficulty, category: p.category, language: p.language, points: p.points, solvedCount: p.solvedCount, isPublished: p.isPublished })));
});

router.get("/admin/problems/:id/detail", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, id)).limit(1);
  if (!problem) { res.status(404).json({ error: "المسألة غير موجودة" }); return; }
  res.json({
    id: problem.id,
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    category: problem.category,
    language: problem.language,
    points: problem.points,
    solvedCount: problem.solvedCount,
    isPublished: problem.isPublished,
    starterCode: problem.starterCode ?? "",
    solution: problem.solution ?? "",
    hints: problem.hints ?? [],
    constraints: problem.constraints ?? [],
    examples: problem.examples ?? [],
    testCases: (problem.testCases as unknown[]) ?? [],
    tags: (problem.tags as string[]) ?? [],
    companyTags: (problem.companyTags as string[]) ?? [],
    packId: problem.packId ?? null,
    orderInPack: problem.orderInPack ?? 0,
  });
});

async function syncPackTotalProblems(packId: number | null | undefined) {
  if (!packId) return;
  const [result] = await db
    .select({ cnt: sql<number>`COUNT(*)::int` })
    .from(problemsTable)
    .where(and(eq(problemsTable.packId, packId), eq(problemsTable.isPublished, true)));
  await db.update(packsTable).set({ totalProblems: result?.cnt ?? 0 }).where(eq(packsTable.id, packId));
}

router.post("/admin/problems", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ProblemInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [problem] = await db.insert(problemsTable).values({ ...parsed.data, solvedCount: 0 } as Record<string, unknown> as never).returning();
  syncPackTotalProblems(parsed.data.packId).catch(() => {/* silent */});
  res.status(201).json({ id: problem.id, title: problem.title, difficulty: problem.difficulty, category: problem.category, language: problem.language, points: problem.points, solvedCount: problem.solvedCount, isPublished: problem.isPublished });
});

router.patch("/admin/problems/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = ProblemInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Get old packId before update to sync both old and new pack
  const [before] = await db.select({ packId: problemsTable.packId }).from(problemsTable).where(eq(problemsTable.id, id)).limit(1);
  const [problem] = await db.update(problemsTable).set({ ...parsed.data, updatedAt: new Date() } as Record<string, unknown>).where(eq(problemsTable.id, id)).returning();
  if (!problem) { res.status(404).json({ error: "المسألة غير موجودة" }); return; }
  syncPackTotalProblems(before?.packId).catch(() => {/* silent */});
  if (parsed.data.packId !== before?.packId) syncPackTotalProblems(parsed.data.packId).catch(() => {/* silent */});
  res.json({ id: problem.id, title: problem.title, difficulty: problem.difficulty, category: problem.category, language: problem.language, points: problem.points, solvedCount: problem.solvedCount, isPublished: problem.isPublished });
});

router.delete("/admin/problems/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [before] = await db.select({ packId: problemsTable.packId }).from(problemsTable).where(eq(problemsTable.id, id)).limit(1);
  await db.delete(submissionsTable).where(eq(submissionsTable.problemId, id));
  const [deleted] = await db.delete(problemsTable).where(eq(problemsTable.id, id)).returning({ id: problemsTable.id });
  if (!deleted) { res.status(404).json({ error: "المسألة غير موجودة" }); return; }
  syncPackTotalProblems(before?.packId).catch(() => {/* silent */});
  res.json({ message: "تم حذف المسألة بنجاح" });
});

// ============ CHALLENGES OVERVIEW & STATS ============

router.get("/admin/challenges/overview", requireAdmin, async (_req, res): Promise<void> => {
  const [totProblems] = await db.select({ count: count() }).from(problemsTable);
  const [freeProblems] = await db.select({ count: count() }).from(problemsTable).where(sql`${problemsTable.packId} IS NULL`);
  const [totSubs] = await db.select({ count: count() }).from(submissionsTable);
  const [accSubs] = await db.select({ count: count() }).from(submissionsTable).where(eq(submissionsTable.status, "accepted"));
  const [partResult] = await db.select({ count: sql<number>`COUNT(DISTINCT ${submissionsTable.userId})::int` }).from(submissionsTable);
  const [totTracks] = await db.select({ count: count() }).from(tracksTable);
  const [totPacks] = await db.select({ count: count() }).from(packsTable);
  const today = new Date().toISOString().slice(0, 10);
  const todayChallenge = await db.select({ id: dailyChallengesTable.id })
    .from(dailyChallengesTable).where(eq(dailyChallengesTable.challengeDate, today)).limit(1);
  const topProblems = await db.select({
    id: problemsTable.id, title: problemsTable.title, difficulty: problemsTable.difficulty,
    total: sql<number>`COUNT(${submissionsTable.id})::int`,
    accepted: sql<number>`SUM(CASE WHEN ${submissionsTable.status} = 'accepted' THEN 1 ELSE 0 END)::int`,
  }).from(submissionsTable).innerJoin(problemsTable, eq(submissionsTable.problemId, problemsTable.id))
    .groupBy(problemsTable.id, problemsTable.title, problemsTable.difficulty)
    .orderBy(sql`COUNT(${submissionsTable.id}) DESC`).limit(10);
  res.json({
    totalProblems: totProblems?.count ?? 0, freeProblems: freeProblems?.count ?? 0,
    totalSubmissions: totSubs?.count ?? 0, acceptedSubmissions: accSubs?.count ?? 0,
    participants: partResult?.count ?? 0, totalTracks: totTracks?.count ?? 0,
    totalPacks: totPacks?.count ?? 0, hasToday: todayChallenge.length > 0, topProblems,
  });
});

router.get("/admin/problems/:id/submissions", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const subs = await db.select({
    id: submissionsTable.id, userId: submissionsTable.userId, userName: usersTable.name,
    status: submissionsTable.status, language: submissionsTable.language,
    executionTime: submissionsTable.executionTime, createdAt: submissionsTable.createdAt,
  }).from(submissionsTable).leftJoin(usersTable, eq(submissionsTable.userId, usersTable.id))
    .where(eq(submissionsTable.problemId, id)).orderBy(desc(submissionsTable.createdAt)).limit(200);
  res.json(subs);
});

router.get("/admin/problems-stats", requireAdmin, async (req, res): Promise<void> => {
  const search = (req.query.search as string | undefined) ?? "";
  const whereClause = search ? ilike(problemsTable.title, `%${search}%`) : undefined;
  const problems = await db.select({
    id: problemsTable.id, title: problemsTable.title, difficulty: problemsTable.difficulty,
    language: problemsTable.language, points: problemsTable.points,
    packId: problemsTable.packId, isPublished: problemsTable.isPublished,
    testCasesCount: sql<number>`COALESCE(jsonb_array_length(${problemsTable.testCases}), 0)::int`,
    submissions: sql<number>`(SELECT COUNT(*)::int FROM submissions WHERE problem_id = ${problemsTable.id})`,
    accepted: sql<number>`(SELECT COUNT(*)::int FROM submissions WHERE problem_id = ${problemsTable.id} AND status = 'accepted')`,
  }).from(problemsTable).where(whereClause).orderBy(desc(problemsTable.id)).limit(300);
  res.json(problems);
});

// ============ ARTICLES ============

function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[\u0600-\u06FF\s]/g, (c) => c === " " || /\s/.test(c) ? "-" : c)
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "article";
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base;
  let counter = 1;
  while (true) {
    const existing = await db
      .select({ id: articlesTable.id })
      .from(articlesTable)
      .where(eq(articlesTable.slug, slug))
      .limit(1);
    if (existing.length === 0 || (excludeId !== undefined && existing[0].id === excludeId)) break;
    slug = `${base}-${++counter}`;
  }
  return slug;
}

function blocksToPlainText(content: string): number {
  try {
    const blocks = JSON.parse(content) as Array<{ type: string; text?: string; items?: string[]; code?: string }>;
    if (!Array.isArray(blocks)) throw new Error();
    return blocks.reduce((sum, b) => {
      const t = b.text || b.code || (b.items || []).join(" ") || "";
      return sum + t.trim().split(/\s+/).filter(Boolean).length;
    }, 0);
  } catch {
    const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text ? text.split(" ").length : 0;
  }
}

function calcWordCount(content: string): number {
  return blocksToPlainText(content);
}

function calcReadTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

function formatArticleAdmin(a: typeof articlesTable.$inferSelect) {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    category: a.category,
    authorName: a.authorName,
    readTime: a.readTime,
    wordCount: a.wordCount,
    views: a.views,
    isFeatured: a.isFeatured,
    isPublished: a.isPublished,
    status: a.status,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    scheduledAt: a.scheduledAt?.toISOString() ?? null,
    thumbnail: a.thumbnail ?? null,
    focusKeyword: a.focusKeyword ?? null,
    metaTitle: a.metaTitle ?? null,
    metaDescription: a.metaDescription ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function formatArticleFull(a: typeof articlesTable.$inferSelect) {
  return {
    ...formatArticleAdmin(a),
    content: a.content,
    contentFormat: a.contentFormat,
    tags: a.tags,
    featuredImageAlt: a.featuredImageAlt ?? null,
    metaKeywords: a.metaKeywords,
    ogTitle: a.ogTitle ?? null,
    ogDescription: a.ogDescription ?? null,
    ogImage: a.ogImage ?? null,
    twitterTitle: a.twitterTitle ?? null,
    twitterDescription: a.twitterDescription ?? null,
    twitterImage: a.twitterImage ?? null,
    canonicalUrl: a.canonicalUrl ?? null,
    noIndex: a.noIndex,
    noFollow: a.noFollow,
    schemaMarkup: a.schemaMarkup ?? null,
    commentsEnabled: a.commentsEnabled,
  };
}

const ArticleInputSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  excerpt: z.string().min(1),
  content: z.string().default(""),
  contentFormat: z.string().default("html"),
  category: z.string().min(1),
  authorName: z.string().default("فريق نوفيل"),
  readTime: z.number().int().optional(),
  wordCount: z.number().int().optional(),
  tags: z.array(z.string()).default([]),
  thumbnail: z.string().optional(),
  featuredImageAlt: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  status: z.enum(["draft", "published", "scheduled", "archived"]).default("published"),
  publishedAt: z.string().optional(),
  scheduledAt: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  focusKeyword: z.string().optional(),
  metaKeywords: z.array(z.string()).default([]),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  noIndex: z.boolean().default(false),
  noFollow: z.boolean().default(false),
  schemaMarkup: z.any().optional(),
  commentsEnabled: z.boolean().default(true),
});

router.get("/admin/articles", requireAdmin, async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const category = req.query.category as string | undefined;
  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(articlesTable.title, `%${search}%`));
  if (status && status !== "all") conditions.push(eq(articlesTable.status, status));
  if (category && category !== "all") conditions.push(eq(articlesTable.category, category));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const articles = await db.select().from(articlesTable).where(where).orderBy(sql`${articlesTable.createdAt} DESC`);
  res.json(articles.map((a) => formatArticleAdmin(a)));
});

router.get("/admin/articles/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.id, id)).limit(1);
  if (!article) { res.status(404).json({ error: "المقال غير موجود" }); return; }
  res.json(formatArticleFull(article));
});

router.post("/admin/articles", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ArticleInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = parsed.data;
  const wc = data.wordCount ?? calcWordCount(data.content);
  const rt = data.readTime ?? calcReadTime(wc);
  const baseSlug = data.slug || generateSlug(data.title);
  const slug = await uniqueSlug(baseSlug);
  const publishedAt = data.status === "published" ? (data.publishedAt ? new Date(data.publishedAt) : new Date()) : (data.publishedAt ? new Date(data.publishedAt) : null);
  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const [article] = await db.insert(articlesTable).values({
    ...data,
    slug,
    wordCount: wc,
    readTime: rt,
    publishedAt,
    scheduledAt,
    views: 0,
  }).returning();
  res.status(201).json(formatArticleFull(article));
});

router.patch("/admin/articles/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = ArticleInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = parsed.data;
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.content !== undefined) {
    const wc = data.wordCount ?? calcWordCount(data.content);
    updateData.wordCount = wc;
    if (data.readTime === undefined) updateData.readTime = calcReadTime(wc);
  }
  if (data.title && !data.slug) {
    const base = generateSlug(data.title);
    updateData.slug = await uniqueSlug(base, id);
  } else if (data.slug) {
    updateData.slug = await uniqueSlug(data.slug, id);
  }
  if (data.status === "published" && !data.publishedAt) {
    const [existing] = await db.select({ publishedAt: articlesTable.publishedAt }).from(articlesTable).where(eq(articlesTable.id, id)).limit(1);
    if (!existing?.publishedAt) updateData.publishedAt = new Date();
  }
  if (data.publishedAt) updateData.publishedAt = new Date(data.publishedAt);
  if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);
  const [article] = await db.update(articlesTable).set(updateData as Partial<typeof articlesTable.$inferInsert>).where(eq(articlesTable.id, id)).returning();
  if (!article) { res.status(404).json({ error: "المقال غير موجود" }); return; }
  res.json(formatArticleFull(article));
});

router.delete("/admin/articles/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [deleted] = await db.delete(articlesTable).where(eq(articlesTable.id, id)).returning({ id: articlesTable.id });
  if (!deleted) { res.status(404).json({ error: "المقال غير موجود" }); return; }
  res.json({ message: "تم حذف المقال بنجاح" });
});

router.post("/admin/articles/bulk", requireAdmin, async (req, res): Promise<void> => {
  const { ids, action } = req.body as { ids: number[]; action: "publish" | "draft" | "archive" | "delete" };
  if (!Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: "لا توجد مقالات محددة" }); return; }
  if (action === "delete") {
    for (const id of ids) await db.delete(articlesTable).where(eq(articlesTable.id, id));
    res.json({ message: `تم حذف ${ids.length} مقال` });
    return;
  }
  const statusMap: Record<string, string> = { publish: "published", draft: "draft", archive: "archived" };
  const newStatus = statusMap[action];
  if (!newStatus) { res.status(400).json({ error: "إجراء غير صالح" }); return; }
  for (const id of ids) {
    const upd: Record<string, unknown> = { status: newStatus, isPublished: newStatus === "published", updatedAt: new Date() };
    if (newStatus === "published") upd.publishedAt = new Date();
    await db.update(articlesTable).set(upd as Partial<typeof articlesTable.$inferInsert>).where(eq(articlesTable.id, id));
  }
  res.json({ message: `تم تحديث ${ids.length} مقال` });
});

// ============ NAV ITEMS (public read + admin write) ============

// Public: GET /nav-items
router.get("/nav-items", async (_req, res): Promise<void> => {
  const items = await db.select().from(navItemsTable)
    .where(eq(navItemsTable.isVisible, true))
    .orderBy(navItemsTable.order);
  res.json(items);
});

// Admin: GET /admin/nav-items
router.get("/admin/nav-items", requireAdmin, async (req, res): Promise<void> => {
  const type = req.query.type as string | undefined;
  const conditions: SQL[] = [];
  if (type) conditions.push(eq(navItemsTable.type, type));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const items = await db.select().from(navItemsTable).where(where).orderBy(navItemsTable.order);
  res.json(items);
});

// Admin: POST /admin/nav-items
const NavItemInputSchema = z.object({
  type: z.enum(["navbar", "footer"]).default("navbar"),
  label: z.string().min(1),
  href: z.string().min(1),
  isVisible: z.boolean().default(true),
  order: z.number().int().default(0),
});

router.post("/admin/nav-items", requireAdmin, async (req, res): Promise<void> => {
  const parsed = NavItemInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
  const [item] = await db.insert(navItemsTable).values(parsed.data).returning();
  res.status(201).json(item);
});

// Admin: PATCH /admin/nav-items/:id
router.patch("/admin/nav-items/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = NavItemInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
  const [item] = await db.update(navItemsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(navItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "العنصر غير موجود" }); return; }
  res.json(item);
});

// Admin: DELETE /admin/nav-items/:id
router.delete("/admin/nav-items/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [deleted] = await db.delete(navItemsTable).where(eq(navItemsTable.id, id)).returning({ id: navItemsTable.id });
  if (!deleted) { res.status(404).json({ error: "العنصر غير موجود" }); return; }
  res.json({ message: "تم حذف العنصر بنجاح" });
});

// Admin: PUT /admin/nav-items/reorder — batch update order
router.put("/admin/nav-items/reorder", requireAdmin, async (req, res): Promise<void> => {
  const items = req.body.items as { id: number; order: number }[];
  if (!Array.isArray(items)) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
  await Promise.all(items.map(({ id, order }) =>
    db.update(navItemsTable).set({ order, updatedAt: new Date() }).where(eq(navItemsTable.id, id))
  ));
  res.json({ message: "تم تحديث الترتيب" });
});

// ============ NOTIFICATIONS ============

// POST /admin/notifications/broadcast — send system notification to all (or specific) users
router.post("/admin/notifications/broadcast", requireAdmin, async (req, res): Promise<void> => {
  const schema = z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    link: z.string().optional().nullable(),
    userIds: z.array(z.number()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }

  const { title, body, link, userIds } = parsed.data;

  let targetIds: number[] = userIds ?? [];
  if (targetIds.length === 0) {
    const allUsers = await db.select({ id: usersTable.id }).from(usersTable);
    targetIds = allUsers.map(u => u.id);
  }

  if (targetIds.length === 0) { res.json({ sent: 0 }); return; }

  const notifs = targetIds.map(uid => ({
    userId: uid,
    type: "system",
    title,
    body,
    link: link ?? null,
    metadata: {},
  }));

  const inserted = await db.insert(notificationsTable).values(notifs).returning();
  for (const n of inserted) emitToUser(n.userId, "notification", n);

  res.json({ sent: inserted.length });
});

// GET /admin/notifications — list recent notifications
router.get("/admin/notifications", requireAdmin, async (_req, res): Promise<void> => {
  const notifs = await db.select().from(notificationsTable)
    .orderBy(sql`${notificationsTable.createdAt} DESC`)
    .limit(200);
  res.json(notifs);
});

// ── AI Settings ─────────────────────────────────────────────────────────────
// GET /admin/settings/ai — get AI config status (masked key)
router.get("/admin/settings/ai", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(platformSettingsTable);
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const key = map["ai_api_key"] ?? "";
  const maskedKey = key.length > 8 ? `${key.slice(0, 6)}${"*".repeat(Math.max(0, key.length - 10))}${key.slice(-4)}` : key ? "****" : "";

  res.json({
    hasKey: !!key,
    maskedKey,
    baseUrl: map["ai_base_url"] ?? "https://api.groq.com/openai/v1",
    model: map["ai_model"] ?? "",
    provider: map["ai_base_url"]?.includes("groq") ? "Groq" : map["ai_base_url"]?.includes("openai") ? "OpenAI" : "Groq",
  });
});

// POST /admin/settings/ai — save AI config
router.post("/admin/settings/ai", requireAdmin, async (req, res): Promise<void> => {
  const { apiKey, baseUrl, model } = req.body as { apiKey?: string; baseUrl?: string; model?: string };

  const upsert = async (key: string, value: string) => {
    await db.insert(platformSettingsTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: platformSettingsTable.key, set: { value, updatedAt: new Date() } });
  };

  if (apiKey !== undefined && apiKey !== "") await upsert("ai_api_key", apiKey);
  if (baseUrl !== undefined) await upsert("ai_base_url", baseUrl || "https://api.groq.com/openai/v1");
  if (model !== undefined) await upsert("ai_model", model || "llama-3.3-70b-versatile");

  res.json({ success: true });
});

// DELETE /admin/settings/ai — remove AI key
router.delete("/admin/settings/ai", requireAdmin, async (_req, res): Promise<void> => {
  await db.delete(platformSettingsTable).where(eq(platformSettingsTable.key, "ai_api_key"));
  res.json({ success: true });
});

// ============ SITE CONFIG & PAGE ROUTES ============

const defaultFooterMenus = [
  { key: "platform", title: "المنصة", links: [
    { label: "الكورسات", href: "/courses" },
    { label: "التحديات", href: "/problems" },
    { label: "المقالات", href: "/articles" },
    { label: "الأدوات", href: "/tools" },
  ]},
  { key: "account", title: "الحساب", links: [
    { label: "إنشاء حساب", href: "/auth/register" },
    { label: "تسجيل الدخول", href: "/auth/login" },
    { label: "لوحة التحكم", href: "/dashboard" },
    { label: "الملف الشخصي", href: "/profile" },
  ]},
  { key: "legal", title: "روابط", links: [
    { label: "سياسة الخصوصية", href: "/privacy" },
    { label: "شروط الاستخدام", href: "/terms" },
    { label: "عن نوفيل", href: "/about" },
    { label: "تواصل معنا", href: "/contact" },
  ]},
];

const getSetting = async (key: string): Promise<string | null> => {
  const [row] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, key)).limit(1);
  return row?.value ?? null;
};

const upsertSetting = async (key: string, value: string): Promise<void> => {
  await db.insert(platformSettingsTable).values({ key, value })
    .onConflictDoUpdate({ target: platformSettingsTable.key, set: { value, updatedAt: new Date() } });
};

// Public: GET /site-config — used by frontend (Footer, route overrides)
router.get("/site-config", async (_req, res): Promise<void> => {
  const [routesVal, footerVal] = await Promise.all([
    getSetting("site_routes"),
    getSetting("footer_menus"),
  ]);
  const siteRoutes: Record<string, string> = routesVal ? JSON.parse(routesVal) : {};
  const footerMenus = footerVal ? JSON.parse(footerVal) : defaultFooterMenus;
  res.json({ siteRoutes, footerMenus });
});

// Admin: GET /admin/settings/site-routes
router.get("/admin/settings/site-routes", requireAdmin, async (_req, res): Promise<void> => {
  const val = await getSetting("site_routes");
  res.json(val ? JSON.parse(val) : {});
});

// Admin: PUT /admin/settings/site-routes
router.put("/admin/settings/site-routes", requireAdmin, async (req, res): Promise<void> => {
  const schema = z.record(z.string(), z.string());
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
  await upsertSetting("site_routes", JSON.stringify(parsed.data));
  res.json({ success: true });
});

// Admin: GET /admin/settings/footer-menus
router.get("/admin/settings/footer-menus", requireAdmin, async (_req, res): Promise<void> => {
  const val = await getSetting("footer_menus");
  res.json(val ? JSON.parse(val) : defaultFooterMenus);
});

// Admin: PUT /admin/settings/footer-menus
router.put("/admin/settings/footer-menus", requireAdmin, async (req, res): Promise<void> => {
  const LinkSchema = z.object({ label: z.string().min(1), href: z.string().min(1) });
  const SectionSchema = z.object({ key: z.string(), title: z.string(), links: z.array(LinkSchema) });
  const parsed = z.array(SectionSchema).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
  await upsertSetting("footer_menus", JSON.stringify(parsed.data));
  res.json({ success: true });
});

// ── IDE Abuse Monitor ─────────────────────────────────────────────────────────

// GET /admin/ide-monitor/stats — aggregate stats for the last 24h and 7d
router.get("/admin/ide-monitor/stats", requireAdmin, async (_req, res): Promise<void> => {
  const now = new Date();
  const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const d7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);

  const [all24, all7d, blocked24, rateLimit24, uniqueIps24, byStatus24, byLang24, hourly24] =
    await Promise.all([
      // total last 24h
      db.select({ n: count() }).from(ideExecutionLogsTable)
        .where(gte(ideExecutionLogsTable.createdAt, h24)),
      // total last 7d
      db.select({ n: count() }).from(ideExecutionLogsTable)
        .where(gte(ideExecutionLogsTable.createdAt, d7)),
      // blocked_pattern last 24h
      db.select({ n: count() }).from(ideExecutionLogsTable)
        .where(and(gte(ideExecutionLogsTable.createdAt, h24), eq(ideExecutionLogsTable.status, "blocked_pattern"))),
      // rate_limited last 24h
      db.select({ n: count() }).from(ideExecutionLogsTable)
        .where(and(gte(ideExecutionLogsTable.createdAt, h24), eq(ideExecutionLogsTable.status, "rate_limited"))),
      // unique IPs last 24h
      db.execute(sql<{ n: string }[]>`
        SELECT COUNT(DISTINCT ip) AS n FROM ide_execution_logs
        WHERE created_at >= ${h24.toISOString()}`),
      // by status last 24h
      db.execute(sql<{ status: string; n: string }[]>`
        SELECT status, COUNT(*)::int AS n FROM ide_execution_logs
        WHERE created_at >= ${h24.toISOString()}
        GROUP BY status ORDER BY n DESC`),
      // by language last 24h
      db.execute(sql<{ language: string; n: string }[]>`
        SELECT language, COUNT(*)::int AS n FROM ide_execution_logs
        WHERE created_at >= ${h24.toISOString()}
        GROUP BY language ORDER BY n DESC`),
      // hourly counts last 24h (for chart)
      db.execute(sql<{ hour: string; n: string }[]>`
        SELECT DATE_TRUNC('hour', created_at) AS hour, COUNT(*)::int AS n
        FROM ide_execution_logs
        WHERE created_at >= ${h24.toISOString()}
        GROUP BY hour ORDER BY hour`),
    ]);

  res.json({
    total24h:      Number((all24[0] as { n: unknown })?.n ?? 0),
    total7d:       Number((all7d[0] as { n: unknown })?.n ?? 0),
    blocked24h:    Number((blocked24[0] as { n: unknown })?.n ?? 0),
    rateLimited24h: Number((rateLimit24[0] as { n: unknown })?.n ?? 0),
    uniqueIps24h:  Number((uniqueIps24.rows as { n: string }[])[0]?.n ?? 0),
    byStatus:      (byStatus24.rows as { status: string; n: string }[]).map(r => ({ status: r.status, n: Number(r.n) })),
    byLanguage:    (byLang24.rows  as { language: string; n: string }[]).map(r => ({ language: r.language, n: Number(r.n) })),
    hourly:        (hourly24.rows  as { hour: string; n: string }[]).map(r => ({ hour: r.hour, n: Number(r.n) })),
  });
});

// GET /admin/ide-monitor/logs — paginated log entries
router.get("/admin/ide-monitor/logs", requireAdmin, async (req, res): Promise<void> => {
  const page   = Math.max(1, parseInt(String(req.query.page  ?? "1"),  10));
  const limit  = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "25"), 10)));
  const status = String(req.query.status ?? "").trim() || null;
  const offset = (page - 1) * limit;

  const where = status ? and(eq(ideExecutionLogsTable.status, status)) : undefined;

  const [rows, totalRows] = await Promise.all([
    db.select({
      id:          ideExecutionLogsTable.id,
      userId:      ideExecutionLogsTable.userId,
      ip:          ideExecutionLogsTable.ip,
      language:    ideExecutionLogsTable.language,
      status:      ideExecutionLogsTable.status,
      blockReason: ideExecutionLogsTable.blockReason,
      codeSnippet: ideExecutionLogsTable.codeSnippet,
      durationMs:  ideExecutionLogsTable.durationMs,
      exitCode:    ideExecutionLogsTable.exitCode,
      createdAt:   ideExecutionLogsTable.createdAt,
    }).from(ideExecutionLogsTable)
      .where(where)
      .orderBy(desc(ideExecutionLogsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(ideExecutionLogsTable).where(where),
  ]);

  res.json({ rows, total: Number((totalRows[0] as { n: unknown })?.n ?? 0), page, limit });
});

// DELETE /admin/ide-monitor/logs — clear logs older than 30 days
router.delete("/admin/ide-monitor/logs", requireAdmin, async (_req, res): Promise<void> => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await db.execute(sql`DELETE FROM ide_execution_logs WHERE created_at < ${cutoff.toISOString()}`);
  res.json({ ok: true });
});

// ── User Activity Log ─────────────────────────────────────────────────────────

// GET /admin/users/:id/activity?limit=50&before=<id>&action=<filter>
router.get("/admin/users/:id/activity", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }

  const limitN  = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
  const beforeId = parseInt(String(req.query.before ?? ""), 10);
  const action   = typeof req.query.action === "string" ? req.query.action : null;

  // Build where clauses
  const clauses = [eq(userActivityLogsTable.userId, userId)];
  if (!isNaN(beforeId)) clauses.push(lt(userActivityLogsTable.id, beforeId));
  if (action) clauses.push(eq(userActivityLogsTable.action, action));

  const logs = await db
    .select()
    .from(userActivityLogsTable)
    .where(and(...clauses))
    .orderBy(desc(userActivityLogsTable.createdAt))
    .limit(limitN);

  res.json(logs);
});

// GET /admin/users/:id/activity/stats — aggregated counts per action
router.get("/admin/users/:id/activity/stats", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }

  const rows = await db
    .select({ action: userActivityLogsTable.action, total: count() })
    .from(userActivityLogsTable)
    .where(eq(userActivityLogsTable.userId, userId))
    .groupBy(userActivityLogsTable.action);

  // Also fetch basic user info + related counts from other tables
  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, username: usersTable.username, avatar: usersTable.avatar, role: usersTable.role, points: usersTable.points, level: usersTable.level, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const [enrollCount]   = await db.select({ n: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.userId, userId));
  const [solvedCount]   = await db.select({ n: count() }).from(submissionsTable).where(and(eq(submissionsTable.userId, userId), eq(submissionsTable.status, "accepted")));
  const [submitCount]   = await db.select({ n: count() }).from(submissionsTable).where(eq(submissionsTable.userId, userId));
  const [projectCount]  = await db.select({ n: count() }).from(db.select().from(userActivityLogsTable).where(and(eq(userActivityLogsTable.userId, userId), inArray(userActivityLogsTable.action, ["create_project"]))).as("p"));

  res.json({
    user,
    stats: {
      enrollments:       Number(enrollCount?.n ?? 0),
      solvedChallenges:  Number(solvedCount?.n ?? 0),
      totalSubmissions:  Number(submitCount?.n ?? 0),
      projects:          Number(projectCount?.n ?? 0),
    },
    actionCounts: Object.fromEntries(rows.map(r => [r.action, Number(r.total)])),
  });
});

// ============ BADGES ============

const BadgeSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_-]+$/, "المفتاح يجب أن يحتوي فقط على أحرف صغيرة وأرقام وشرطات"),
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1).default("🏆"),
  color: z.string().min(1).default("#f59e0b"),
  condition: z.string().min(1),
  conditionValue: z.number().int().min(1).default(1),
});

router.get("/admin/badges", requireAdmin, async (_req, res): Promise<void> => {
  const badges = await db
    .select({
      id: badgesTable.id,
      key: badgesTable.key,
      title: badgesTable.title,
      description: badgesTable.description,
      icon: badgesTable.icon,
      color: badgesTable.color,
      condition: badgesTable.condition,
      conditionValue: badgesTable.conditionValue,
      createdAt: badgesTable.createdAt,
      earnedCount: sql<number>`COUNT(${userBadgesTable.id})::int`,
    })
    .from(badgesTable)
    .leftJoin(userBadgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
    .groupBy(badgesTable.id)
    .orderBy(badgesTable.createdAt);
  res.json(badges);
});

router.post("/admin/badges", requireAdmin, async (req, res): Promise<void> => {
  const parsed = BadgeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [exists] = await db.select({ id: badgesTable.id }).from(badgesTable).where(eq(badgesTable.key, parsed.data.key)).limit(1);
  if (exists) { res.status(409).json({ error: "مفتاح الشارة موجود بالفعل" }); return; }
  const [badge] = await db.insert(badgesTable).values(parsed.data).returning();
  res.status(201).json(badge);
});

router.patch("/admin/badges/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = BadgeSchema.partial().omit({ key: true }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [badge] = await db.update(badgesTable).set(parsed.data).where(eq(badgesTable.id, id)).returning();
  if (!badge) { res.status(404).json({ error: "الشارة غير موجودة" }); return; }
  res.json(badge);
});

router.delete("/admin/badges/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  await db.delete(userBadgesTable).where(eq(userBadgesTable.badgeId, id));
  const [deleted] = await db.delete(badgesTable).where(eq(badgesTable.id, id)).returning({ id: badgesTable.id });
  if (!deleted) { res.status(404).json({ error: "الشارة غير موجودة" }); return; }
  res.json({ message: "تم حذف الشارة بنجاح" });
});

export default router;
