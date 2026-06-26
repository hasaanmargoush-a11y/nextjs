import { Router, type IRouter, type Request } from "express";
import { db, coursesTable, lessonsTable, enrollmentsTable, coursePhasesTable, quizzesTable } from "../../lib/db/src/index";
import { eq, ilike, and, asc, desc, count, type SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { notify } from "../lib/notifications";
import { logActivity } from "../lib/activityLogger";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAdmin } from "./admin";

export const COURSE_UPLOAD_DIR = path.join(process.cwd(), "uploads", "courses");
if (!fs.existsSync(COURSE_UPLOAD_DIR)) fs.mkdirSync(COURSE_UPLOAD_DIR, { recursive: true });

const courseImageStorage = multer.diskStorage({
  destination: COURSE_UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const courseImageUpload = multer({
  storage: courseImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

function getOptionalUserId(req: Request): number | null {
  if (req.session.userId) return req.session.userId;
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const decoded = Buffer.from(auth.slice(7), "base64").toString("utf-8");
    const id = parseInt(decoded.split(":")[0] as string, 10);
    return isNaN(id) ? null : id;
  } catch { return null; }
}


const router: IRouter = Router();

router.post("/admin/courses/upload-image", requireAdmin, courseImageUpload.single("image"), (req, res): void => {
  if (!req.file) { res.status(400).json({ error: "لم يتم رفع صورة" }); return; }
  res.json({ url: `/api/course-images/${req.file.filename}` });
});

const ListCoursesQuery = z.object({
  category: z.string().optional(),
  level: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["newest", "oldest", "popular"]).default("newest"),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  offset: z.coerce.number().int().min(0).default(0),
});

router.get("/courses", async (req, res): Promise<void> => {
  const query = ListCoursesQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { category, level, search, sort, limit, offset } = query.data;

  const conditions: SQL[] = [eq(coursesTable.isPublished, true)];
  if (category) conditions.push(eq(coursesTable.category, category));
  if (level) conditions.push(eq(coursesTable.level, level));
  if (search) conditions.push(ilike(coursesTable.title, `%${search}%`));

  const where = and(...conditions);

  const [totalResult] = await db.select({ count: count() }).from(coursesTable).where(where);
  const total = totalResult?.count ?? 0;

  let orderBy;
  if (sort === "oldest") orderBy = asc(coursesTable.createdAt);
  else if (sort === "popular") orderBy = desc(coursesTable.studentsCount);
  else orderBy = desc(coursesTable.createdAt);

  const courses = await db.select().from(coursesTable)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  res.json({
    courses: courses.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      instructor: c.instructor,
      level: c.level,
      category: c.category,
      duration: c.duration,
      studentsCount: c.studentsCount,
      enrolledCount: c.studentsCount,
      rating: c.rating,
      isPaid: c.isPaid,
      price: c.price ?? null,
      thumbnail: c.thumbnail ?? null,
      isPublished: c.isPublished,
      isFeatured: c.isFeatured,
      createdAt: c.createdAt.toISOString(),
    })),
    total,
    hasMore: offset + limit < total,
  });
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "معرف الكورس غير صالح" });
    return;
  }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  if (!course) {
    res.status(404).json({ error: "الكورس غير موجود" });
    return;
  }

  const phases = await db.select().from(coursePhasesTable)
    .where(eq(coursePhasesTable.courseId, id))
    .orderBy(asc(coursePhasesTable.order));

  const allLessons = await db.select().from(lessonsTable)
    .where(eq(lessonsTable.courseId, id))
    .orderBy(asc(lessonsTable.order));

  const allQuizzes = await db.select().from(quizzesTable)
    .where(eq(quizzesTable.courseId, id))
    .orderBy(asc(quizzesTable.order));

  const phasesWithContent = phases.map(phase => ({
    id: phase.id,
    title: phase.title,
    description: phase.description ?? null,
    order: phase.order,
    lessons: allLessons
      .filter(l => l.phaseId === phase.id)
      .map(l => ({
        id: l.id,
        title: l.title,
        duration: l.duration,
        order: l.order,
        isFree: l.isFree,
        videoUrl: l.videoUrl ?? null,
        videoType: l.videoType ?? null,
      })),
    quizzes: allQuizzes
      .filter(q => q.phaseId === phase.id)
      .map(q => ({ id: q.id, title: q.title, isRequired: q.isRequired, order: q.order })),
  }));

  const unphasedLessons = allLessons.filter(l => !l.phaseId);

  res.json({
    id: course.id,
    title: course.title,
    description: course.description,
    instructor: course.instructor,
    level: course.level,
    category: course.category,
    duration: course.duration,
    studentsCount: course.studentsCount,
    enrolledCount: course.studentsCount,
    rating: course.rating,
    isPaid: course.isPaid,
    price: course.price ?? null,
    thumbnail: course.thumbnail ?? null,
    requirements: course.requirements ?? [],
    whatYouLearn: course.whatYouLearn ?? [],
    objectives: course.objectives ?? [],
    courseContents: course.courseContents ?? [],
    metaTitle: course.metaTitle ?? null,
    metaDescription: course.metaDescription ?? null,
    phases: phasesWithContent,
    lessons: unphasedLessons.map(l => ({
      id: l.id,
      title: l.title,
      duration: l.duration,
      order: l.order,
      isFree: l.isFree,
      videoUrl: l.videoUrl ?? null,
    })),
    lessonsCount: allLessons.length,
    instructorName: course.instructor,
  });
});

router.get("/courses/:id/enrollment", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "معرف الكورس غير صالح" });
    return;
  }

  const userId = getOptionalUserId(req);
  if (!userId) {
    res.json({ isEnrolled: false });
    return;
  }

  const [enrollment] = await db.select().from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, id)))
    .limit(1);

  res.json({ isEnrolled: !!enrollment, progress: enrollment?.progress ?? 0 });
});

router.post("/courses/:id/enroll", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "معرف الكورس غير صالح" });
    return;
  }

  const userId = getOptionalUserId(req);
  if (!userId) {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  if (!course) {
    res.status(404).json({ error: "الكورس غير موجود" });
    return;
  }

  const [existing] = await db.select().from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, id)))
    .limit(1);

  if (existing) {
    res.json({ message: "أنت مسجل بالفعل في هذا الكورس", alreadyEnrolled: true });
    return;
  }

  await db.insert(enrollmentsTable).values({ userId, courseId: id });
  logActivity({ userId, action: "enroll_course", entityType: "course", entityId: id, entityTitle: course.title });

  await db.update(coursesTable)
    .set({ studentsCount: sql`${coursesTable.studentsCount} + 1` })
    .where(eq(coursesTable.id, id));

  // Enrollment notification
  notify(userId, {
    type: "enrollment",
    title: "📚 تم التسجيل في كورس!",
    body: `تم تسجيلك في "${course.title}" — ابدأ رحلتك الآن`,
    link: `/courses/${id}`,
    metadata: { courseId: id, courseTitle: course.title },
  }).catch(() => {/* silent */});

  res.json({ message: "تم التسجيل في الكورس بنجاح" });
});

export default router;
