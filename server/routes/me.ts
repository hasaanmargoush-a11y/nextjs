import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable, enrollmentsTable, coursesTable, submissionsTable, problemsTable } from "../../lib/db/src/index";
import { eq, desc, sql, and } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { CHAT_UPLOAD_DIR } from "../lib/chatConfig";

const avatarStorage = multer.diskStorage({
  destination: CHAT_UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `avatar-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId) { next(); return; }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = Buffer.from(authHeader.slice(7), "base64").toString("utf-8");
      const userId = parseInt(decoded.split(":")[0], 10);
      if (!isNaN(userId) && userId > 0) {
        req.session.userId = userId;
        next();
        return;
      }
    } catch {}
  }

  res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
}

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  return {
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
  };
}

// GET /users/stats — current user stats (session)
router.get("/users/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, userId));
  const completedCourses = enrollments.filter(e => e.completedAt !== null).length;

  const submissions = await db.select().from(submissionsTable)
    .where(eq(submissionsTable.userId, userId));
  const solvedProblems = submissions.filter(s => s.status === "accepted").length;

  const allUsers = await db.select({ id: usersTable.id, points: usersTable.points })
    .from(usersTable).orderBy(desc(usersTable.points));
  const rank = allUsers.findIndex(u => u.id === userId) + 1;

  res.json({
    points: user.points,
    rank: rank > 0 ? rank : 1,
    completedCourses,
    enrolledCourses: enrollments.length,
    solvedProblems,
    level: user.level ?? "مبتدئ",
    badges: [] as string[],
  });
});

// GET /users/enrolled-courses — current user enrolled courses (session)
router.get("/users/enrolled-courses", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, userId));

  const courses = await Promise.all(enrollments.map(async (enr) => {
    const [course] = await db.select({
      id: coursesTable.id, title: coursesTable.title, thumbnail: coursesTable.thumbnail,
      category: coursesTable.category, level: coursesTable.level,
    }).from(coursesTable).where(eq(coursesTable.id, enr.courseId)).limit(1);

    return {
      id: enr.courseId,
      title: course?.title ?? "كورس",
      thumbnail: course?.thumbnail ?? null,
      category: course?.category ?? "",
      level: course?.level ?? "",
      progress: enr.progress ?? 0,
      completedLessons: enr.completedLessons ?? 0,
      enrolledAt: enr.enrolledAt.toISOString(),
      completedAt: enr.completedAt ? enr.completedAt.toISOString() : null,
    };
  }));

  res.json({ courses });
});

// GET /users/activity — current user recent activity
router.get("/users/activity", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const recentSubmissions = await db.select({
    id: submissionsTable.id,
    status: submissionsTable.status,
    language: submissionsTable.language,
    createdAt: submissionsTable.createdAt,
    problemTitle: problemsTable.title,
    problemId: submissionsTable.problemId,
  }).from(submissionsTable)
    .leftJoin(problemsTable, eq(submissionsTable.problemId, problemsTable.id))
    .where(eq(submissionsTable.userId, userId))
    .orderBy(desc(submissionsTable.createdAt))
    .limit(10);

  const recentEnrollments = await db.select({
    courseId: enrollmentsTable.courseId,
    enrolledAt: enrollmentsTable.enrolledAt,
    title: coursesTable.title,
  }).from(enrollmentsTable)
    .leftJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .where(eq(enrollmentsTable.userId, userId))
    .orderBy(desc(enrollmentsTable.enrolledAt))
    .limit(5);

  const activity = [
    ...recentSubmissions.map(s => ({
      type: "submission" as const,
      status: s.status,
      title: s.problemTitle ?? "مسألة",
      problemId: s.problemId,
      language: s.language,
      createdAt: s.createdAt.toISOString(),
    })),
    ...recentEnrollments.map(e => ({
      type: "enrollment" as const,
      status: "enrolled",
      title: e.title ?? "كورس",
      courseId: e.courseId,
      language: null,
      createdAt: e.enrolledAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);

  res.json(activity);
});

// POST /users/me/avatar — upload avatar image
router.post("/users/me/avatar", requireAuth, avatarUpload.single("avatar"), async (req, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "لم يتم رفع أي صورة" }); return; }
  const userId = req.session.userId!;
  const avatarUrl = `/api/uploads/${req.file.filename}`;
  const [user] = await db.update(usersTable)
    .set({ avatar: avatarUrl, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();
  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  res.json({ user: sanitizeUser(user) });
});

// PATCH /users/me — update current user profile
const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  age: z.number().int().min(10).max(100).optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.username) {
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, parsed.data.username))
      .limit(1);
    if (existing && existing.id !== userId) {
      res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" });
      return;
    }
  }

  const [user] = await db.update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  res.json({ user: sanitizeUser(user) });
});

// POST /auth/change-password — change current user password
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "يرجى ملء جميع الحقول" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" }); return; }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(usersTable.id, userId));

  res.json({ message: "تم تغيير كلمة المرور بنجاح" });
});

// GET /users/leaderboard — top users by points (or by language)
router.get("/users/leaderboard", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string || "50", 10), 100);
  const language = req.query.language as string | undefined;

  if (language) {
    // Language-specific leaderboard: rank by problems solved in that language
    const rows = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        username: usersTable.username,
        avatar: usersTable.avatar,
        level: usersTable.level,
        solvedCount: sql<number>`count(distinct ${submissionsTable.problemId})::int`,
        langPoints: sql<number>`coalesce(sum(distinct ${problemsTable.points}),0)::int`,
      })
      .from(submissionsTable)
      .innerJoin(usersTable, eq(submissionsTable.userId, usersTable.id))
      .innerJoin(problemsTable, eq(submissionsTable.problemId, problemsTable.id))
      .where(and(eq(submissionsTable.status, "accepted"), eq(submissionsTable.language, language)))
      .groupBy(usersTable.id)
      .orderBy(desc(sql`count(distinct ${submissionsTable.problemId})`), desc(sql`coalesce(sum(distinct ${problemsTable.points}),0)`))
      .limit(limit);

    res.json(rows.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      username: u.username ?? `user_${u.id}`,
      points: u.langPoints,
      level: u.level ?? "مبتدئ",
      avatar: u.avatar ?? null,
      solvedCount: u.solvedCount,
    })));
    return;
  }

  // Overall leaderboard
  const users = await db.select({
    id: usersTable.id, name: usersTable.name, username: usersTable.username,
    points: usersTable.points, level: usersTable.level, avatar: usersTable.avatar,
    streak: usersTable.streak,
  }).from(usersTable)
    .orderBy(desc(usersTable.points))
    .limit(limit);

  res.json(users.map((u, i) => ({
    rank: i + 1, id: u.id, name: u.name,
    username: u.username ?? `user_${u.id}`,
    points: u.points, level: u.level ?? "مبتدئ",
    avatar: u.avatar ?? null,
    solvedCount: null,
    streak: u.streak ?? 0,
  })));
});

export default router;
