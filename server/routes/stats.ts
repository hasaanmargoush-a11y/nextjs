import { Router, type IRouter } from "express";
import { db, usersTable, coursesTable, lessonsTable, problemsTable, dailyChallengesTable, submissionsTable, badgesTable } from "../../lib/db/src/index";
import { eq, count, countDistinct } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats/platform", async (_req, res): Promise<void> => {
  const [studentsResult] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "user"));
  const [coursesResult] = await db.select({ count: count() }).from(coursesTable).where(eq(coursesTable.isPublished, true));
  const [lessonsResult] = await db.select({ count: count() }).from(lessonsTable);

  const instructors = await db.selectDistinct({ instructor: coursesTable.instructor }).from(coursesTable);

  res.json({
    totalStudents: studentsResult?.count ?? 0,
    totalCourses: coursesResult?.count ?? 0,
    totalInstructors: instructors.length,
    totalLessons: lessonsResult?.count ?? 0,
  });
});

router.get("/stats/challenges", async (_req, res): Promise<void> => {
  const [problemsResult] = await db.select({ count: count() }).from(problemsTable).where(eq(problemsTable.isPublished, true));
  const [dailyResult] = await db.select({ count: count() }).from(dailyChallengesTable);
  const [participantsResult] = await db.select({ count: countDistinct(submissionsTable.userId) }).from(submissionsTable);
  const [badgesResult] = await db.select({ count: count() }).from(badgesTable);

  res.json({
    totalProblems: problemsResult?.count ?? 0,
    totalDailyChallenges: dailyResult?.count ?? 0,
    totalParticipants: participantsResult?.count ?? 0,
    totalBadges: badgesResult?.count ?? 0,
  });
});

router.get("/stats/featured-courses", async (_req, res): Promise<void> => {
  const courses = await db.select().from(coursesTable)
    .where(eq(coursesTable.isPublished, true))
    .orderBy(sql`${coursesTable.createdAt} DESC`)
    .limit(6);

  res.json(courses.map(c => ({
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
  })));
});

export default router;
