import { Router, type IRouter, type Request } from "express";
import {
  db, lessonsTable, enrollmentsTable, lessonProgressTable,
  lessonContentBlocksTable,
  quizzesTable, quizQuestionsTable, quizQuestionOptionsTable, userQuizAttemptsTable,
  certificatesTable, userCertificatesTable, notificationsTable, coursesTable,
} from "../../lib/db/src/index";
import { eq, and, count, asc, inArray, isNull, sql } from "drizzle-orm";
import crypto from "crypto";
import { emitToUser } from "../socket";
import { logActivity } from "../lib/activityLogger";

const router: IRouter = Router();

function getUserId(req: Request): number | null {
  if (req.session.userId) return req.session.userId;
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const token = auth.slice(7);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [idStr] = decoded.split(":");
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
  } catch { return null; }
}

async function tryAwardCertificates(userId: number, courseId: number, phaseId: number | null): Promise<{ title: string; type: string }[]> {
  const awarded: { title: string; type: string }[] = [];
  try {
    // --- Phase certificate ---
    if (phaseId) {
      const phaseLessonIds = await db.select({ id: lessonsTable.id }).from(lessonsTable)
        .where(and(eq(lessonsTable.courseId, courseId), eq(lessonsTable.phaseId, phaseId)));
      const ids = phaseLessonIds.map(l => l.id);
      const phaseTotal = ids.length;

      if (phaseTotal > 0) {
        const [cp] = await db.select({ count: count() }).from(lessonProgressTable)
          .where(and(eq(lessonProgressTable.userId, userId), inArray(lessonProgressTable.lessonId, ids)));
        const completedPhase = Number(cp?.count ?? 0);

        if (completedPhase >= phaseTotal) {
          // Also check all required quizzes in this phase are passed
          const requiredPhaseQuizzes = await db.select({ id: quizzesTable.id }).from(quizzesTable)
            .where(and(eq(quizzesTable.phaseId, phaseId), eq(quizzesTable.isRequired, true)));

          let allRequiredPassed = true;
          for (const rq of requiredPhaseQuizzes) {
            const [passedAttempt] = await db.select({ id: userQuizAttemptsTable.id }).from(userQuizAttemptsTable)
              .where(and(
                eq(userQuizAttemptsTable.userId, userId),
                eq(userQuizAttemptsTable.quizId, rq.id),
                eq(userQuizAttemptsTable.passed, true)
              )).limit(1);
            if (!passedAttempt) { allRequiredPassed = false; break; }
          }

          if (allRequiredPassed) {
            const [phaseCert] = await db.select().from(certificatesTable)
              .where(and(eq(certificatesTable.courseId, courseId), eq(certificatesTable.phaseId, phaseId))).limit(1);
            if (phaseCert) {
              const [existing] = await db.select({ id: userCertificatesTable.id }).from(userCertificatesTable)
                .where(and(eq(userCertificatesTable.userId, userId), eq(userCertificatesTable.certificateId, phaseCert.id))).limit(1);
              if (!existing) {
                const code = crypto.randomBytes(10).toString("hex").toUpperCase();
                await db.insert(userCertificatesTable).values({ userId, certificateId: phaseCert.id, courseId, uniqueCode: code });
                awarded.push({ title: phaseCert.title, type: "phase" });
              }
            }
          }
        }
      }
    }

    // --- Course certificate (only certs with phaseId = null) ---
    const [totalRow] = await db.select({ count: count() }).from(lessonsTable).where(eq(lessonsTable.courseId, courseId));
    const courseTotal = Number(totalRow?.count ?? 0);
    if (courseTotal > 0) {
      const [doneRow] = await db.select({ count: count() }).from(lessonProgressTable)
        .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.courseId, courseId)));
      const courseDone = Number(doneRow?.count ?? 0);

      if (courseDone >= courseTotal) {
        const [courseCert] = await db.select().from(certificatesTable)
          .where(and(eq(certificatesTable.courseId, courseId), isNull(certificatesTable.phaseId))).limit(1);
        if (courseCert) {
          const [existing] = await db.select({ id: userCertificatesTable.id }).from(userCertificatesTable)
            .where(and(eq(userCertificatesTable.userId, userId), eq(userCertificatesTable.certificateId, courseCert.id))).limit(1);
          if (!existing) {
            const code = crypto.randomBytes(10).toString("hex").toUpperCase();
            await db.insert(userCertificatesTable).values({ userId, certificateId: courseCert.id, courseId, uniqueCode: code });
            awarded.push({ title: courseCert.title, type: "course" });
          }
        }
      }
    }
  } catch (err) {
    console.error("[tryAwardCertificates] error:", err);
  }
  return awarded;
}

// GET /courses/:courseId/lessons/first
router.get("/courses/:courseId/lessons/first", async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const [first] = await db.select().from(lessonsTable)
    .where(eq(lessonsTable.courseId, courseId))
    .orderBy(lessonsTable.order).limit(1);

  if (!first) { res.status(404).json({ error: "لا توجد دروس في هذا الكورس" }); return; }

  const userId = getUserId(req);
  let isCompleted = false;
  const completedIds: number[] = [];

  if (userId) {
    const [prog] = await db.select().from(lessonProgressTable)
      .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, first.id))).limit(1);
    isCompleted = !!prog;
    const allProg = await db.select({ lessonId: lessonProgressTable.lessonId }).from(lessonProgressTable)
      .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.courseId, courseId)));
    allProg.forEach(p => completedIds.push(p.lessonId));
  }

  const allLessons = await db.select({
    id: lessonsTable.id, title: lessonsTable.title, order: lessonsTable.order,
    duration: lessonsTable.duration, isFree: lessonsTable.isFree, phaseId: lessonsTable.phaseId,
  }).from(lessonsTable).where(eq(lessonsTable.courseId, courseId)).orderBy(lessonsTable.order);

  const blocks = await db.select().from(lessonContentBlocksTable)
    .where(eq(lessonContentBlocksTable.lessonId, first.id))
    .orderBy(asc(lessonContentBlocksTable.order));

  res.json({
    id: first.id, title: first.title, content: first.content ?? "",
    contentBlocks: blocks,
    videoUrl: first.videoUrl ?? null,
    videoType: first.videoType ?? null,
    videoObjectPath: first.videoObjectPath ?? null,
    duration: first.duration,
    order: first.order, isFree: first.isFree, courseId,
    isCompleted, completedIds, allLessons,
  });
});

// GET /courses/:courseId/lessons/:lessonId
router.get("/courses/:courseId/lessons/:lessonId", async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  const lessonId = parseInt(req.params.lessonId as string, 10);
  if (isNaN(courseId) || isNaN(lessonId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const [lesson] = await db.select().from(lessonsTable)
    .where(and(eq(lessonsTable.id, lessonId), eq(lessonsTable.courseId, courseId))).limit(1);

  if (!lesson) { res.status(404).json({ error: "الدرس غير موجود" }); return; }

  const userId = getUserId(req);

  if (!lesson.isFree) {
    if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }
    const [enrolled] = await db.select().from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId))).limit(1);
    if (!enrolled) { res.status(403).json({ error: "يجب التسجيل في الكورس أولاً" }); return; }
  }

  let isCompleted = false;
  const completedIds: number[] = [];
  if (userId) {
    const [prog] = await db.select().from(lessonProgressTable)
      .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, lessonId))).limit(1);
    isCompleted = !!prog;
    const allProg = await db.select({ lessonId: lessonProgressTable.lessonId }).from(lessonProgressTable)
      .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.courseId, courseId)));
    allProg.forEach(p => completedIds.push(p.lessonId));
  }

  const allLessons = await db.select({
    id: lessonsTable.id, title: lessonsTable.title, order: lessonsTable.order,
    duration: lessonsTable.duration, isFree: lessonsTable.isFree, phaseId: lessonsTable.phaseId,
  }).from(lessonsTable).where(eq(lessonsTable.courseId, courseId)).orderBy(lessonsTable.order);

  const blocks = await db.select().from(lessonContentBlocksTable)
    .where(eq(lessonContentBlocksTable.lessonId, lessonId))
    .orderBy(asc(lessonContentBlocksTable.order));

  res.json({
    id: lesson.id, title: lesson.title, content: lesson.content ?? "",
    contentBlocks: blocks,
    videoUrl: lesson.videoUrl ?? null,
    videoType: lesson.videoType ?? null,
    videoObjectPath: lesson.videoObjectPath ?? null,
    duration: lesson.duration,
    order: lesson.order, isFree: lesson.isFree, courseId, isCompleted, completedIds, allLessons,
  });
});

// POST /courses/:courseId/lessons/:lessonId/complete
router.post("/courses/:courseId/lessons/:lessonId/complete", async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  const lessonId = parseInt(req.params.lessonId as string, 10);
  if (isNaN(courseId) || isNaN(lessonId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }

  const [lesson] = await db.select({ phaseId: lessonsTable.phaseId }).from(lessonsTable)
    .where(eq(lessonsTable.id, lessonId)).limit(1);

  const [existing] = await db.select({ id: lessonProgressTable.id }).from(lessonProgressTable)
    .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, lessonId))).limit(1);

  if (!existing) {
    await db.insert(lessonProgressTable).values({ userId, lessonId, courseId });
    logActivity({ userId, action: "complete_lesson", entityType: "lesson", entityId: lessonId, metadata: { courseId } });
    const [totalLessons] = await db.select({ count: count() }).from(lessonsTable).where(eq(lessonsTable.courseId, courseId));
    const [completedLessons] = await db.select({ count: count() }).from(lessonProgressTable)
      .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.courseId, courseId)));
    const total = Number(totalLessons?.count ?? 1);
    const completed = Number(completedLessons?.count ?? 0);
    const progress = Math.round((completed / total) * 100);
    const [enrollmentBefore] = await db.select({ completedAt: enrollmentsTable.completedAt })
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId)))
      .limit(1);

    await db.update(enrollmentsTable)
      .set({ completedLessons: completed, progress, ...(progress === 100 ? { completedAt: new Date() } : {}) })
      .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId)));

    // Course completion notification — fire only the first time (completedAt was null before)
    if (progress === 100 && !enrollmentBefore?.completedAt) {
      const [course] = await db.select({ title: coursesTable.title }).from(coursesTable)
        .where(eq(coursesTable.id, courseId)).limit(1);
      const courseTitle = course?.title ?? "الكورس";
      const n = await db.insert(notificationsTable).values({
        userId,
        type: "course",
        title: "🎓 أكملت الكورس!",
        body: `أحسنت! لقد أكملت كورس "${courseTitle}" بنجاح`,
        link: `/courses/${courseId}`,
        metadata: { courseId },
      }).returning().then(r => r[0]);
      if (n) emitToUser(userId, "notification", n);
    }
  }

  // Always try to award certificates (idempotent — won't duplicate)
  const newCertificates = await tryAwardCertificates(userId, courseId, lesson?.phaseId ?? null);

  // Send notification for each awarded certificate
  if (newCertificates.length > 0) {
    const notifs = newCertificates.map(c => ({
      userId,
      type: "certificate",
      title: c.type === "phase" ? "🏅 أكملت مرحلة!" : "🎓 أكملت الكورس!",
      body: `حصلت على شهادة "${c.title}" — أحسنت!`,
      link: `/dashboard`,
      metadata: { courseId, certificateTitle: c.title },
    }));
    const inserted = await db.insert(notificationsTable).values(notifs).returning();
    for (const n of inserted) emitToUser(userId, "notification", n);
  }

  res.json({ message: "تم تحديد الدرس كمكتمل", newCertificates });
});

// ============ STUDENT QUIZ ROUTES ============

// GET /courses/:courseId/quizzes
router.get("/courses/:courseId/quizzes", async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const quizzes = await db.select().from(quizzesTable)
    .where(eq(quizzesTable.courseId, courseId))
    .orderBy(asc(quizzesTable.order));

  const quizzesWithCount = await Promise.all(quizzes.map(async (q) => {
    const [qCount] = await db.select({ count: count() }).from(quizQuestionsTable).where(eq(quizQuestionsTable.quizId, q.id));
    return { ...q, questionsCount: Number(qCount?.count ?? 0) };
  }));

  res.json(quizzesWithCount);
});

// GET /courses/:courseId/quizzes/:quizId
router.get("/courses/:courseId/quizzes/:quizId", async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  const quizId = parseInt(req.params.quizId as string, 10);
  if (isNaN(courseId) || isNaN(quizId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const [quiz] = await db.select().from(quizzesTable)
    .where(and(eq(quizzesTable.id, quizId), eq(quizzesTable.courseId, courseId))).limit(1);
  if (!quiz) { res.status(404).json({ error: "الاختبار غير موجود" }); return; }

  const questions = await db.select().from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.quizId, quizId))
    .orderBy(asc(quizQuestionsTable.order));

  const questionsWithOptions = await Promise.all(questions.map(async (q) => {
    const options = await db.select({
      id: quizQuestionOptionsTable.id,
      text: quizQuestionOptionsTable.text,
      order: quizQuestionOptionsTable.order,
    }).from(quizQuestionOptionsTable)
      .where(eq(quizQuestionOptionsTable.questionId, q.id))
      .orderBy(asc(quizQuestionOptionsTable.order));
    return { ...q, options };
  }));

  res.json({ ...quiz, questions: questionsWithOptions });
});

// POST /courses/:courseId/quizzes/:quizId/attempt
router.post("/courses/:courseId/quizzes/:quizId/attempt", async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  const quizId = parseInt(req.params.quizId as string, 10);
  if (isNaN(courseId) || isNaN(quizId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }

  const answers = req.body.answers as Record<string, number | string>;
  if (!answers || typeof answers !== "object") {
    res.status(400).json({ error: "الإجابات مطلوبة" }); return;
  }

  const [quiz] = await db.select().from(quizzesTable)
    .where(and(eq(quizzesTable.id, quizId), eq(quizzesTable.courseId, courseId))).limit(1);
  if (!quiz) { res.status(404).json({ error: "الاختبار غير موجود" }); return; }

  const questions = await db.select().from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.quizId, quizId))
    .orderBy(asc(quizQuestionsTable.order));

  const questionsWithOptions = await Promise.all(questions.map(async (q) => {
    const options = await db.select().from(quizQuestionOptionsTable)
      .where(eq(quizQuestionOptionsTable.questionId, q.id))
      .orderBy(asc(quizQuestionOptionsTable.order));
    return { ...q, options };
  }));

  let score = 0;
  let maxScore = 0;
  const results = questionsWithOptions.map((q) => {
    maxScore += q.points;
    const userAnswer = answers[String(q.id)];
    let correct: boolean | null = null;
    let earnedPoints = 0;
    let correctAnswer = "";
    let yourAnswer = "";

    const correctOption = q.options.find(o => o.isCorrect);
    correctAnswer = correctOption?.text ?? "";

    if (q.type === "short_answer") {
      yourAnswer = String(userAnswer ?? "");
      correct = null;
    } else {
      const selectedOption = q.options.find(o => o.id === Number(userAnswer));
      yourAnswer = selectedOption?.text ?? "";
      if (selectedOption) {
        correct = selectedOption.isCorrect;
        if (correct) { score += q.points; earnedPoints = q.points; }
      } else {
        correct = false;
      }
    }

    return {
      questionId: q.id,
      question: q.question,
      yourAnswer,
      correctAnswer,
      correct,
      explanation: q.explanation ?? null,
      points: q.points,
      earnedPoints,
    };
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed = percentage >= quiz.passingScore;

  await db.insert(userQuizAttemptsTable).values({
    userId, quizId, answers, score, maxScore, passed,
  });

  // Award certificates if quiz is passed (phase cert if quiz belongs to a phase)
  const newCertificates = passed
    ? await tryAwardCertificates(userId, courseId, quiz.phaseId ?? null)
    : [];

  // Notify for each newly awarded certificate
  if (newCertificates.length > 0) {
    const notifs = newCertificates.map(c => ({
      userId,
      type: "certificate",
      title: c.type === "phase" ? "🏅 أكملت مرحلة!" : "🎓 اجتزت الاختبار وحصلت على شهادة!",
      body: `حصلت على شهادة "${c.title}" بعد اجتياز الاختبار — أحسنت!`,
      link: `/dashboard`,
      metadata: { courseId, certificateTitle: c.title },
    }));
    const inserted = await db.insert(notificationsTable).values(notifs).returning();
    for (const n of inserted) emitToUser(userId, "notification", n);
  } else if (passed) {
    // Passed quiz but no new certificate — still notify
    emitToUser(userId, "notification", await db.insert(notificationsTable).values({
      userId,
      type: "quiz_passed",
      title: "✅ اجتزت الاختبار!",
      body: `أحسنت! اجتزت الاختبار بنجاح بنسبة ${Math.round(percentage)}%`,
      link: `/courses/${courseId}`,
      metadata: { courseId, quizId, score, percentage: Math.round(percentage) },
    }).returning().then(r => r[0]));
  }

  res.json({ score, maxScore, passed, percentage, passingScore: quiz.passingScore, results, newCertificates });
});

// GET /courses/:courseId/my-progress — returns completed lesson IDs and passed quiz IDs for the current user
router.get("/courses/:courseId/my-progress", async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const userId = getUserId(req);
  if (!userId) { res.json({ completedLessonIds: [], passedQuizIds: [] }); return; }

  const completedRows = await db.select({ lessonId: lessonProgressTable.lessonId })
    .from(lessonProgressTable)
    .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.courseId, courseId)));

  const courseQuizzes = await db.select({ id: quizzesTable.id }).from(quizzesTable)
    .where(eq(quizzesTable.courseId, courseId));

  let passedQuizIds: number[] = [];
  if (courseQuizzes.length > 0) {
    const quizIds = courseQuizzes.map(q => q.id);
    const attempts = await db.select({ quizId: userQuizAttemptsTable.quizId, passed: userQuizAttemptsTable.passed })
      .from(userQuizAttemptsTable)
      .where(and(eq(userQuizAttemptsTable.userId, userId), inArray(userQuizAttemptsTable.quizId, quizIds)));
    passedQuizIds = [...new Set(attempts.filter(a => a.passed).map(a => a.quizId))];
  }

  res.json({
    completedLessonIds: completedRows.map(r => r.lessonId),
    passedQuizIds,
  });
});

export default router;
