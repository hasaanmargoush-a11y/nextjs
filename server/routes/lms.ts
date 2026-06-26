import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable, coursesTable, coursePhasesTable, lessonsTable, lessonContentBlocksTable, quizzesTable, quizQuestionsTable, quizQuestionOptionsTable, userQuizAttemptsTable, certificatesTable, userCertificatesTable } from "../../lib/db/src/index";
import { eq, and, sql, asc } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

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
  } catch { return null; }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  let userId = req.session.userId;
  if (!userId) {
    const fromToken = getUserIdFromToken(req.headers.authorization);
    if (fromToken) { userId = fromToken; req.session.userId = fromToken; }
  }
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }
  db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1)
    .then(([user]) => {
      if (!user || !ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number])) {
        res.status(403).json({ error: "غير مصرح لك" }); return;
      }
      next();
    })
    .catch(() => res.status(500).json({ error: "خطأ في الخادم" }));
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  let userId = req.session.userId;
  if (!userId) {
    const fromToken = getUserIdFromToken(req.headers.authorization);
    if (fromToken) { userId = fromToken; req.session.userId = fromToken; }
  }
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }
  (req as Request & { authUserId?: number }).authUserId = userId;
  next();
}

// ============ PHASES ============
router.get("/admin/courses/:courseId/phases", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const phases = await db.select().from(coursePhasesTable)
    .where(eq(coursePhasesTable.courseId, courseId))
    .orderBy(asc(coursePhasesTable.order));
  res.json(phases);
});

const PhaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().optional(),
});

router.post("/admin/courses/:courseId/phases", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = PhaseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select({ count: sql<number>`count(*)` }).from(coursePhasesTable).where(eq(coursePhasesTable.courseId, courseId));
  const order = parsed.data.order ?? Number(existing[0]?.count ?? 0);
  const [phase] = await db.insert(coursePhasesTable).values({ courseId, ...parsed.data, order }).returning();
  res.status(201).json(phase);
});

router.patch("/admin/phases/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = PhaseSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [phase] = await db.update(coursePhasesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(coursePhasesTable.id, id)).returning();
  if (!phase) { res.status(404).json({ error: "المرحلة غير موجودة" }); return; }
  res.json(phase);
});

router.delete("/admin/phases/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [deleted] = await db.delete(coursePhasesTable).where(eq(coursePhasesTable.id, id)).returning({ id: coursePhasesTable.id });
  if (!deleted) { res.status(404).json({ error: "المرحلة غير موجودة" }); return; }
  res.json({ message: "تم الحذف" });
});

router.put("/admin/courses/:courseId/phases/reorder", requireAdmin, async (req, res): Promise<void> => {
  const items = req.body.items as { id: number; order: number }[];
  if (!Array.isArray(items)) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
  await Promise.all(items.map(({ id, order }) =>
    db.update(coursePhasesTable).set({ order, updatedAt: new Date() }).where(eq(coursePhasesTable.id, id))
  ));
  res.json({ message: "تم تحديث الترتيب" });
});

// ============ LESSONS ============
router.get("/admin/phases/:phaseId/lessons", requireAdmin, async (req, res): Promise<void> => {
  const phaseId = parseInt(req.params.phaseId as string, 10);
  if (isNaN(phaseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const lessons = await db.select().from(lessonsTable)
    .where(eq(lessonsTable.phaseId, phaseId))
    .orderBy(asc(lessonsTable.order));
  res.json(lessons);
});

router.get("/admin/courses/:courseId/lessons", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const lessons = await db.select().from(lessonsTable)
    .where(eq(lessonsTable.courseId, courseId))
    .orderBy(asc(lessonsTable.order));
  res.json(lessons);
});

const LessonSchema = z.object({
  phaseId: z.number().int().optional().nullable(),
  title: z.string().min(1),
  duration: z.string().optional(),
  order: z.number().int().optional(),
  isFree: z.boolean().optional(),
  videoType: z.enum(["youtube", "upload", "none"]).optional(),
  videoUrl: z.string().optional().nullable(),
  videoObjectPath: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
});

router.post("/admin/courses/:courseId/lessons", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = LessonSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select({ count: sql<number>`count(*)` }).from(lessonsTable).where(eq(lessonsTable.courseId, courseId));
  const order = parsed.data.order ?? Number(existing[0]?.count ?? 0);
  const [lesson] = await db.insert(lessonsTable).values({ courseId, ...parsed.data, order }).returning();
  res.status(201).json(lesson);
});

router.get("/admin/lessons/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).limit(1);
  if (!lesson) { res.status(404).json({ error: "الدرس غير موجود" }); return; }
  const blocks = await db.select().from(lessonContentBlocksTable)
    .where(eq(lessonContentBlocksTable.lessonId, id))
    .orderBy(asc(lessonContentBlocksTable.order));
  res.json({ ...lesson, contentBlocks: blocks });
});

router.patch("/admin/lessons/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = LessonSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [lesson] = await db.update(lessonsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(lessonsTable.id, id)).returning();
  if (!lesson) { res.status(404).json({ error: "الدرس غير موجود" }); return; }
  res.json(lesson);
});

router.delete("/admin/lessons/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  await db.delete(lessonContentBlocksTable).where(eq(lessonContentBlocksTable.lessonId, id));
  const [deleted] = await db.delete(lessonsTable).where(eq(lessonsTable.id, id)).returning({ id: lessonsTable.id });
  if (!deleted) { res.status(404).json({ error: "الدرس غير موجود" }); return; }
  res.json({ message: "تم الحذف" });
});

// ============ CONTENT BLOCKS ============
router.get("/admin/lessons/:lessonId/blocks", requireAdmin, async (req, res): Promise<void> => {
  const lessonId = parseInt(req.params.lessonId as string, 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const blocks = await db.select().from(lessonContentBlocksTable)
    .where(eq(lessonContentBlocksTable.lessonId, lessonId))
    .orderBy(asc(lessonContentBlocksTable.order));
  res.json(blocks);
});

const BlockSchema = z.object({
  type: z.enum(["text", "code", "image"]),
  content: z.string(),
  language: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

router.post("/admin/lessons/:lessonId/blocks", requireAdmin, async (req, res): Promise<void> => {
  const lessonId = parseInt(req.params.lessonId as string, 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = BlockSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select({ count: sql<number>`count(*)` }).from(lessonContentBlocksTable).where(eq(lessonContentBlocksTable.lessonId, lessonId));
  const order = parsed.data.order ?? Number(existing[0]?.count ?? 0);
  const [block] = await db.insert(lessonContentBlocksTable).values({ lessonId, ...parsed.data, order }).returning();
  res.status(201).json(block);
});

router.patch("/admin/blocks/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = BlockSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [block] = await db.update(lessonContentBlocksTable).set(parsed.data).where(eq(lessonContentBlocksTable.id, id)).returning();
  if (!block) { res.status(404).json({ error: "البلوك غير موجود" }); return; }
  res.json(block);
});

router.delete("/admin/blocks/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [deleted] = await db.delete(lessonContentBlocksTable).where(eq(lessonContentBlocksTable.id, id)).returning({ id: lessonContentBlocksTable.id });
  if (!deleted) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json({ message: "تم الحذف" });
});

router.put("/admin/lessons/:lessonId/blocks/reorder", requireAdmin, async (req, res): Promise<void> => {
  const items = req.body.items as { id: number; order: number }[];
  if (!Array.isArray(items)) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
  await Promise.all(items.map(({ id, order }) =>
    db.update(lessonContentBlocksTable).set({ order }).where(eq(lessonContentBlocksTable.id, id))
  ));
  res.json({ message: "تم التحديث" });
});

// ============ QUIZZES ============
router.get("/admin/phases/:phaseId/quizzes", requireAdmin, async (req, res): Promise<void> => {
  const phaseId = parseInt(req.params.phaseId as string, 10);
  if (isNaN(phaseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const quizzes = await db.select().from(quizzesTable)
    .where(eq(quizzesTable.phaseId, phaseId))
    .orderBy(asc(quizzesTable.order));
  res.json(quizzes);
});

const QuizSchema = z.object({
  phaseId: z.number().int().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  timeLimit: z.number().int().optional().nullable(),
  passingScore: z.number().int().min(0).max(100).optional(),
  isRequired: z.boolean().optional(),
  order: z.number().int().optional(),
  questions: z.array(z.object({
    type: z.enum(["multiple_choice", "true_false", "short_answer"]),
    question: z.string().min(1),
    explanation: z.string().optional().nullable(),
    points: z.number().int().min(1).optional().default(1),
    options: z.array(z.object({
      text: z.string(),
      isCorrect: z.boolean(),
    })).optional(),
  })).optional(),
});

router.post("/admin/courses/:courseId/quizzes", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = QuizSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { questions: inlineQuestions, ...quizData } = parsed.data;

  // compute order = count of existing lessons + quizzes in phase
  const existingQuizzes = await db.select({ count: sql<number>`count(*)` }).from(quizzesTable).where(eq(quizzesTable.courseId, courseId));
  const order = quizData.order ?? Number(existingQuizzes[0]?.count ?? 0);

  const [quiz] = await db.insert(quizzesTable).values({ courseId, ...quizData, order }).returning();

  const savedQuestions = [];
  if (inlineQuestions && inlineQuestions.length > 0) {
    for (let qi = 0; qi < inlineQuestions.length; qi++) {
      const { options, ...qData } = inlineQuestions[qi]!;
      const [question] = await db.insert(quizQuestionsTable).values({ quizId: quiz.id, ...qData, order: qi }).returning();
      if (options && options.length > 0) {
        await db.insert(quizQuestionOptionsTable).values(
          options.map((opt, i) => ({ questionId: question.id, text: opt.text, isCorrect: opt.isCorrect, order: i }))
        );
      }
      const savedOptions = await db.select().from(quizQuestionOptionsTable).where(eq(quizQuestionOptionsTable.questionId, question.id)).orderBy(asc(quizQuestionOptionsTable.order));
      savedQuestions.push({ ...question, options: savedOptions });
    }
  }

  res.status(201).json({ ...quiz, questions: savedQuestions });
});

router.get("/admin/quizzes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, id)).limit(1);
  if (!quiz) { res.status(404).json({ error: "الاختبار غير موجود" }); return; }
  const questions = await db.select().from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.quizId, id))
    .orderBy(asc(quizQuestionsTable.order));
  const questionsWithOptions = await Promise.all(
    questions.map(async (q) => {
      const options = await db.select().from(quizQuestionOptionsTable)
        .where(eq(quizQuestionOptionsTable.questionId, q.id))
        .orderBy(asc(quizQuestionOptionsTable.order));
      return { ...q, options };
    })
  );
  res.json({ ...quiz, questions: questionsWithOptions });
});

router.patch("/admin/quizzes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = QuizSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [quiz] = await db.update(quizzesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(quizzesTable.id, id)).returning();
  if (!quiz) { res.status(404).json({ error: "الاختبار غير موجود" }); return; }
  res.json(quiz);
});

router.delete("/admin/quizzes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [deleted] = await db.delete(quizzesTable).where(eq(quizzesTable.id, id)).returning({ id: quizzesTable.id });
  if (!deleted) { res.status(404).json({ error: "الاختبار غير موجود" }); return; }
  res.json({ message: "تم الحذف" });
});

// ============ QUIZ QUESTIONS ============
const QuestionSchema = z.object({
  type: z.enum(["multiple_choice", "true_false", "short_answer"]),
  question: z.string().min(1),
  explanation: z.string().optional().nullable(),
  points: z.number().int().min(1).optional(),
  order: z.number().int().optional(),
  options: z.array(z.object({
    text: z.string().min(1),
    isCorrect: z.boolean(),
    order: z.number().int().optional(),
  })).optional(),
});

router.post("/admin/quizzes/:quizId/questions", requireAdmin, async (req, res): Promise<void> => {
  const quizId = parseInt(req.params.quizId as string, 10);
  if (isNaN(quizId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = QuestionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { options, ...qData } = parsed.data;
  const existing = await db.select({ count: sql<number>`count(*)` }).from(quizQuestionsTable).where(eq(quizQuestionsTable.quizId, quizId));
  const order = qData.order ?? Number(existing[0]?.count ?? 0);
  const [question] = await db.insert(quizQuestionsTable).values({ quizId, ...qData, order }).returning();
  if (options && options.length > 0) {
    await db.insert(quizQuestionOptionsTable).values(
      options.map((opt, i) => ({ questionId: question.id, ...opt, order: opt.order ?? i }))
    );
  }
  const savedOptions = await db.select().from(quizQuestionOptionsTable).where(eq(quizQuestionOptionsTable.questionId, question.id)).orderBy(asc(quizQuestionOptionsTable.order));
  res.status(201).json({ ...question, options: savedOptions });
});

router.patch("/admin/questions/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = QuestionSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { options, ...qData } = parsed.data;
  const [question] = await db.update(quizQuestionsTable).set(qData).where(eq(quizQuestionsTable.id, id)).returning();
  if (!question) { res.status(404).json({ error: "السؤال غير موجود" }); return; }
  if (options !== undefined) {
    await db.delete(quizQuestionOptionsTable).where(eq(quizQuestionOptionsTable.questionId, id));
    if (options.length > 0) {
      await db.insert(quizQuestionOptionsTable).values(
        options.map((opt, i) => ({ questionId: id, ...opt, order: opt.order ?? i }))
      );
    }
  }
  const savedOptions = await db.select().from(quizQuestionOptionsTable).where(eq(quizQuestionOptionsTable.questionId, id)).orderBy(asc(quizQuestionOptionsTable.order));
  res.json({ ...question, options: savedOptions });
});

router.delete("/admin/questions/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  await db.delete(quizQuestionOptionsTable).where(eq(quizQuestionOptionsTable.questionId, id));
  const [deleted] = await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.id, id)).returning({ id: quizQuestionsTable.id });
  if (!deleted) { res.status(404).json({ error: "السؤال غير موجود" }); return; }
  res.json({ message: "تم الحذف" });
});

// ============ CERTIFICATES ============
router.get("/admin/courses/:courseId/certificates", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const certs = await db.select().from(certificatesTable).where(eq(certificatesTable.courseId, courseId));
  res.json(certs);
});

const CertificateSchema = z.object({
  phaseId: z.number().int().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(["course", "phase"]).optional(),
  logoUrl: z.string().optional().nullable(),
  signatureUrl: z.string().optional().nullable(),
  signatoryName: z.string().optional().nullable(),
  signatoryTitle: z.string().optional().nullable(),
});

router.post("/admin/courses/:courseId/certificates", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = CertificateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [cert] = await db.insert(certificatesTable).values({ courseId, ...parsed.data }).returning();
  res.status(201).json(cert);
});

router.patch("/admin/certificates/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = CertificateSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [cert] = await db.update(certificatesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(certificatesTable.id, id)).returning();
  if (!cert) { res.status(404).json({ error: "الشهادة غير موجودة" }); return; }
  res.json(cert);
});

router.delete("/admin/certificates/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  await db.delete(userCertificatesTable).where(eq(userCertificatesTable.certificateId, id));
  const [deleted] = await db.delete(certificatesTable).where(eq(certificatesTable.id, id)).returning({ id: certificatesTable.id });
  if (!deleted) { res.status(404).json({ error: "الشهادة غير موجودة" }); return; }
  res.json({ message: "تم الحذف" });
});

router.post("/admin/certificates/:id/issue/:userId", requireAdmin, async (req, res): Promise<void> => {
  const certId = parseInt(req.params.id as string, 10);
  const userId = parseInt(req.params.userId as string, 10);
  if (isNaN(certId) || isNaN(userId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [cert] = await db.select().from(certificatesTable).where(eq(certificatesTable.id, certId)).limit(1);
  if (!cert) { res.status(404).json({ error: "الشهادة غير موجودة" }); return; }
  const existing = await db.select().from(userCertificatesTable)
    .where(and(eq(userCertificatesTable.userId, userId), eq(userCertificatesTable.certificateId, certId))).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "المستخدم حصل على هذه الشهادة بالفعل" }); return; }
  const uniqueCode = crypto.randomBytes(8).toString("hex").toUpperCase();
  const [issued] = await db.insert(userCertificatesTable).values({
    userId, certificateId: certId, courseId: cert.courseId, uniqueCode
  }).returning();
  res.status(201).json(issued);
});

// ============ USER CERTIFICATES (student view) ============
router.get("/my/certificates", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { authUserId?: number }).authUserId!;
  const certs = await db
    .select({
      id: userCertificatesTable.id,
      uniqueCode: userCertificatesTable.uniqueCode,
      issuedAt: userCertificatesTable.issuedAt,
      courseId: userCertificatesTable.courseId,
      courseTitle: coursesTable.title,
      certTitle: certificatesTable.title,
      certDescription: certificatesTable.description,
      certType: certificatesTable.type,
      logoUrl: certificatesTable.logoUrl,
      signatureUrl: certificatesTable.signatureUrl,
      signatoryName: certificatesTable.signatoryName,
      signatoryTitle: certificatesTable.signatoryTitle,
    })
    .from(userCertificatesTable)
    .innerJoin(certificatesTable, eq(userCertificatesTable.certificateId, certificatesTable.id))
    .innerJoin(coursesTable, eq(userCertificatesTable.courseId, coursesTable.id))
    .where(eq(userCertificatesTable.userId, userId))
    .orderBy(sql`${userCertificatesTable.issuedAt} DESC`);
  res.json(certs);
});

// GET /my/certificates/:code — public verification + owner view
router.get("/my/certificates/:code", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { authUserId?: number }).authUserId!;
  const code = req.params.code as string;
  const [row] = await db
    .select({
      uniqueCode: userCertificatesTable.uniqueCode,
      issuedAt: userCertificatesTable.issuedAt,
      courseTitle: coursesTable.title,
      certTitle: certificatesTable.title,
      certDescription: certificatesTable.description,
      certType: certificatesTable.type,
      logoUrl: certificatesTable.logoUrl,
      signatureUrl: certificatesTable.signatureUrl,
      signatoryName: certificatesTable.signatoryName,
      signatoryTitle: certificatesTable.signatoryTitle,
      userName: usersTable.name,
      userId: userCertificatesTable.userId,
    })
    .from(userCertificatesTable)
    .innerJoin(certificatesTable, eq(userCertificatesTable.certificateId, certificatesTable.id))
    .innerJoin(coursesTable, eq(userCertificatesTable.courseId, coursesTable.id))
    .innerJoin(usersTable, eq(userCertificatesTable.userId, usersTable.id))
    .where(eq(userCertificatesTable.uniqueCode, code))
    .limit(1);
  if (!row || row.userId !== userId) { res.status(404).json({ error: "الشهادة غير موجودة" }); return; }
  res.json({ ...row, userName: row.userName ?? "الطالب" });
});

// ============ FULL COURSE STRUCTURE (admin) ============
router.get("/admin/courses/:courseId/structure", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (!course) { res.status(404).json({ error: "الكورس غير موجود" }); return; }
  const phases = await db.select().from(coursePhasesTable).where(eq(coursePhasesTable.courseId, courseId)).orderBy(asc(coursePhasesTable.order));
  const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.courseId, courseId)).orderBy(asc(lessonsTable.order));
  const quizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.courseId, courseId)).orderBy(asc(quizzesTable.order));
  const certificates = await db.select().from(certificatesTable).where(eq(certificatesTable.courseId, courseId));
  res.json({ course, phases, lessons, quizzes, certificates });
});

// ============ PUBLIC CERTIFICATE VERIFICATION (no auth needed) ============
router.get("/certificates/verify/:code", async (req, res): Promise<void> => {
  const code = req.params.code as string;
  const [row] = await db
    .select({
      uniqueCode: userCertificatesTable.uniqueCode,
      issuedAt: userCertificatesTable.issuedAt,
      courseTitle: coursesTable.title,
      certTitle: certificatesTable.title,
      certDescription: certificatesTable.description,
      certType: certificatesTable.type,
      signatoryName: certificatesTable.signatoryName,
      signatoryTitle: certificatesTable.signatoryTitle,
      userName: usersTable.name,
    })
    .from(userCertificatesTable)
    .innerJoin(certificatesTable, eq(userCertificatesTable.certificateId, certificatesTable.id))
    .innerJoin(coursesTable, eq(userCertificatesTable.courseId, coursesTable.id))
    .innerJoin(usersTable, eq(userCertificatesTable.userId, usersTable.id))
    .where(eq(userCertificatesTable.uniqueCode, code.toUpperCase()))
    .limit(1);
  if (!row) { res.status(404).json({ error: "الشهادة غير موجودة" }); return; }
  res.json({ ...row, userName: row.userName ?? "الطالب" });
});

export default router;
