import { pgTable, text, serial, integer, timestamp, boolean, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructor: text("instructor").notNull(),
  level: text("level").notNull().default("beginner"),
  category: text("category").notNull(),
  duration: text("duration").notNull().default("0 ساعة"),
  studentsCount: integer("students_count").notNull().default(0),
  rating: doublePrecision("rating").notNull().default(0),
  isPaid: boolean("is_paid").notNull().default(false),
  price: doublePrecision("price"),
  thumbnail: text("thumbnail"),
  requirements: text("requirements").array().notNull().default([]),
  whatYouLearn: text("what_you_learn").array().notNull().default([]),
  objectives: text("objectives").array().notNull().default([]),
  courseContents: text("course_contents").array().notNull().default([]),
  visibility: text("visibility").notNull().default("public"),
  slug: text("slug"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  isPublished: boolean("is_published").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const coursePhasesTable = pgTable("course_phases", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  requireProgression: boolean("require_progression").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => coursePhasesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  duration: text("duration").notNull().default("0:00"),
  order: integer("order").notNull().default(0),
  isFree: boolean("is_free").notNull().default(false),
  videoType: text("video_type").default("youtube"),
  videoUrl: text("video_url"),
  videoObjectPath: text("video_object_path"),
  content: text("content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const lessonContentBlocksTable = pgTable("lesson_content_blocks", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("text"),
  content: text("content").notNull().default(""),
  language: text("language"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => coursePhasesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  timeLimit: integer("time_limit"),
  passingScore: integer("passing_score").notNull().default(60),
  isRequired: boolean("is_required").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quizQuestionsTable = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("multiple_choice"),
  question: text("question").notNull(),
  explanation: text("explanation"),
  points: integer("points").notNull().default(1),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quizQuestionOptionsTable = pgTable("quiz_question_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => quizQuestionsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  order: integer("order").notNull().default(0),
});

export const userQuizAttemptsTable = pgTable("user_quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull().default({}),
  score: integer("score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const certificatesTable = pgTable("certificates", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => coursePhasesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("course"),
  logoUrl: text("logo_url"),
  signatureUrl: text("signature_url"),
  signatoryName: text("signatory_name"),
  signatoryTitle: text("signatory_title"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userCertificatesTable = pgTable("user_certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  certificateId: integer("certificate_id").notNull().references(() => certificatesTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  uniqueCode: text("unique_code").notNull().unique(),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
});

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id),
  progress: doublePrecision("progress").notNull().default(0),
  completedLessons: integer("completed_lessons").notNull().default(0),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});


export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit({ id: true, enrolledAt: true });
export const insertPhaseSchema = createInsertSchema(coursePhasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuizSchema = createInsertSchema(quizzesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type CoursePhase = typeof coursePhasesTable.$inferSelect;
export type Quiz = typeof quizzesTable.$inferSelect;
export type QuizQuestion = typeof quizQuestionsTable.$inferSelect;
export type Certificate = typeof certificatesTable.$inferSelect;
export type UserCertificate = typeof userCertificatesTable.$inferSelect;
