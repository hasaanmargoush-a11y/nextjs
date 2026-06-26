import { Router, type IRouter } from "express";
import { db, problemsTable, submissionsTable, usersTable, badgesTable, userBadgesTable, dailyChallengesTable, userDailyChallengesTable } from "../../lib/db/src/index";
import { eq, ilike, and, type SQL, sql, desc, asc } from "drizzle-orm";
import { z } from "zod";
import { notify, checkLevelUp, getLevel, STREAK_MILESTONES } from "../lib/notifications";
import { logActivity } from "../lib/activityLogger";

const router: IRouter = Router();

// Judge0 language IDs
const JUDGE0_LANG_IDS: Record<string, number> = {
  Python: 71,
  JavaScript: 63,
  "C++": 54,
  Java: 62,
  Go: 60,
  Rust: 73,
  TypeScript: 74,
  SQL: 82,
};

interface Judge0Response {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

interface TestCase {
  input: string;
  expectedOutput: string;
}

// ─── Arabic Error Message Parser ──────────────────────────────────────────────
function parseArabicError(error: string, language: string): string {
  if (!error) return "حدث خطأ غير معروف";
  const e = error.toLowerCase();

  // Syntax errors
  if (e.includes("syntaxerror") || e.includes("syntax error")) {
    const lineMatch = error.match(/line (\d+)/i);
    const line = lineMatch ? ` في السطر ${lineMatch[1]}` : "";
    if (e.includes("unexpected indent")) return `خطأ في المسافات البادئة${line} — تحقق من المسافات (indent)`;
    if (e.includes("unexpected eof") || e.includes("unexpected end")) return `الكود غير مكتمل${line} — ربما قوس أو قيمة ناقصة`;
    if (e.includes("invalid syntax")) return `خطأ في الصياغة${line} — تحقق من الأقواس والنقطتين وعلامات الترقيم`;
    return `خطأ في الكتابة${line} — راجع بناء الجملة`;
  }

  // Name/Reference errors
  if (e.includes("nameerror") || e.includes("referenceerror")) {
    const nameMatch = error.match(/name '(\w+)' is not defined/) || error.match(/(\w+) is not defined/i);
    if (nameMatch) return `المتغير أو الدالة "${nameMatch[1]}" غير معرّفة — تحقق من الإملاء أو أنك عرّفتها قبل الاستخدام`;
    return "استخدام متغير أو دالة غير معرّفة";
  }

  // Type errors
  if (e.includes("typeerror")) {
    if (e.includes("unsupported operand")) return "عملية غير مسموح بها بين نوعَين مختلفَين (مثلاً نص + رقم)";
    if (e.includes("'nonetype'") || e.includes("is not iterable")) return "القيمة فارغة (None) أو غير قابلة للتكرار";
    if (e.includes("takes") && e.includes("argument")) return "عدد الوسائط (arguments) خاطئ عند استدعاء الدالة";
    if (e.includes("subscriptable")) return "محاولة الوصول لعنصر من نوع لا يدعم الفهرسة";
    return "خطأ في نوع البيانات — تأكد من تطابق الأنواع";
  }

  // Index/Key errors
  if (e.includes("indexerror")) {
    return "الفهرس خارج نطاق القائمة — تحقق من حجم المصفوفة قبل الوصول";
  }
  if (e.includes("keyerror")) {
    const keyMatch = error.match(/KeyError: (.+)/);
    return `المفتاح ${keyMatch ? keyMatch[1] : ""} غير موجود في القاموس`;
  }

  // Recursion
  if (e.includes("recursionerror") || e.includes("maximum recursion")) {
    return "تجاوزت الحد الأقصى للاستدعاء التكراري — تحقق من شرط التوقف في الدالة العودية";
  }

  // Zero division
  if (e.includes("zerodivisionerror") || e.includes("division by zero")) {
    return "خطأ قسمة على صفر — تحقق من قيم المقسوم عليه";
  }

  // Memory/TLE
  if (e.includes("memoryerror") || e.includes("out of memory")) {
    return "استهلاك الذاكرة تجاوز الحد — حاول تحسين كفاءة الكود";
  }
  if (e.includes("time limit") || e.includes("timed out")) {
    return "تجاوز وقت التنفيذ المسموح — حسّن تعقيد الكود (Complexity)";
  }

  // Compile errors (C++, Java)
  if (e.includes("error:") && (language === "C++" || language === "Java")) {
    const lineMatch = error.match(/:(\d+):/);
    const line = lineMatch ? ` في السطر ${lineMatch[1]}` : "";
    if (e.includes("undeclared") || e.includes("not declared")) return `متغير غير معلن${line}`;
    if (e.includes("expected")) return `رمز مفقود${line} — ربما فاصلة منقوطة أو قوس`;
    return `خطأ في الكمبايل${line} — راجع الكود`;
  }

  // JavaScript specific
  if (language === "JavaScript" || language === "TypeScript") {
    if (e.includes("cannot read")) return "محاولة قراءة خاصية من قيمة null أو undefined";
    if (e.includes("is not a function")) return "محاولة استدعاء قيمة ليست دالة";
  }

  // Truncate long errors
  if (error.length > 200) {
    return error.substring(0, 200) + "...";
  }

  return error;
}

async function runCodeOnJudge0(
  code: string,
  language: string,
  stdin: string
): Promise<{ output: string; error: string | null; statusId: number; time: number | null; memory: number | null }> {
  const langId = JUDGE0_LANG_IDS[language] ?? 71;
  const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com";
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let baseUrl = "https://ce.judge0.com";

  if (rapidApiKey) {
    baseUrl = JUDGE0_URL;
    headers["X-RapidAPI-Key"] = rapidApiKey;
    headers["X-RapidAPI-Host"] = "judge0-ce.p.rapidapi.com";
  }

  // Use base64 encoding to support Arabic and non-ASCII characters
  const encodedCode = Buffer.from(code, "utf8").toString("base64");
  const encodedStdin = Buffer.from(stdin, "utf8").toString("base64");

  const resp = await fetch(
    `${baseUrl}/submissions?base64_encoded=true&wait=true`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ source_code: encodedCode, language_id: langId, stdin: encodedStdin }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!resp.ok) throw new Error(`Judge0 error: ${resp.status}`);

  const data = (await resp.json()) as Judge0Response;

  // Decode base64 outputs
  const decodeB64 = (s: string | null): string => {
    if (!s) return "";
    try { return Buffer.from(s, "base64").toString("utf8"); } catch { return s; }
  };

  const stdout = decodeB64(data.stdout).trim();
  const rawStderr = decodeB64(data.stderr) || decodeB64(data.compile_output) || null;
  const stderr = rawStderr?.trim() || null;
  const time = data.time ? Math.round(parseFloat(data.time) * 1000) : null;
  const memory = data.memory ?? null;

  return { output: stdout, error: stderr, statusId: data.status?.id ?? 0, time, memory };
}

// ─── Badge Award Helper ───────────────────────────────────────────────────────
async function awardBadgeIfNew(userId: number, badgeKey: string) {
  const [badge] = await db.select().from(badgesTable).where(eq(badgesTable.key, badgeKey)).limit(1);
  if (!badge) return;
  const [existing] = await db.select().from(userBadgesTable)
    .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, badge.id)))
    .limit(1);
  if (existing) return;
  await db.insert(userBadgesTable).values({ userId, badgeId: badge.id });
  notify(userId, {
    type: "badge",
    title: `${badge.icon} وسام جديد!`,
    body: `حصلت على "${badge.title}" — ${badge.description}`,
    link: `/dashboard`,
    metadata: { badgeId: badge.id, badgeKey },
  }).catch(() => {/* silent */});
}

// ─── GET /problems ────────────────────────────────────────────────────────────
router.get("/problems", async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const difficulty = req.query.difficulty as string | undefined;
  const language = req.query.language as string | undefined;
  const category = req.query.category as string | undefined;
  const tag = req.query.tag as string | undefined;
  const company = req.query.company as string | undefined;
  const packId = req.query.packId ? parseInt(req.query.packId as string, 10) : undefined;
  const mode = req.query.mode as string | undefined;

  const conditions: SQL[] = [eq(problemsTable.isPublished, true)];
  if (search) conditions.push(ilike(problemsTable.title, `%${search}%`));
  if (difficulty) conditions.push(eq(problemsTable.difficulty, difficulty));
  if (language) conditions.push(eq(problemsTable.language, language));
  if (category) conditions.push(eq(problemsTable.category, category));
  if (packId && !isNaN(packId)) conditions.push(eq(problemsTable.packId, packId));
  if (tag) conditions.push(sql`${problemsTable.tags} @> ${JSON.stringify([tag])}::jsonb`);
  if (company) conditions.push(sql`${problemsTable.companyTags} @> ${JSON.stringify([company])}::jsonb`);
  // Free problems (not in any pack)
  if (mode === "free") conditions.push(sql`${problemsTable.packId} IS NULL`);

  const userId = req.session.userId;

  const problems = await db.select({
    id: problemsTable.id,
    title: problemsTable.title,
    difficulty: problemsTable.difficulty,
    category: problemsTable.category,
    language: problemsTable.language,
    points: problemsTable.points,
    solvedCount: problemsTable.solvedCount,
    tags: problemsTable.tags,
    companyTags: problemsTable.companyTags,
    packId: problemsTable.packId,
  }).from(problemsTable)
    .where(and(...conditions))
    .orderBy(asc(problemsTable.orderInPack), asc(sql`${problemsTable.createdAt}`));

  let solvedIds = new Set<number>();
  if (userId) {
    const subs = await db
      .select({ problemId: submissionsTable.problemId })
      .from(submissionsTable)
      .where(and(eq(submissionsTable.userId, userId), eq(submissionsTable.status, "accepted")));
    solvedIds = new Set(subs.map((s) => s.problemId));
  }

  res.json(problems.map((p) => ({ ...p, isSolved: solvedIds.has(p.id) })));
});

// ─── GET /problems/:id ────────────────────────────────────────────────────────
router.get("/problems/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const [problem] = await db.select().from(problemsTable)
    .where(and(eq(problemsTable.id, id), eq(problemsTable.isPublished, true)))
    .limit(1);

  if (!problem) { res.status(404).json({ error: "المسألة غير موجودة" }); return; }

  const userId = req.session.userId;
  let isSolved = false;
  let userSubmissions: Array<{
    id: number; status: string; code: string; language: string;
    output?: string; errorMessage?: string; executionTime?: number; createdAt: string;
  }> = [];

  if (userId) {
    const subs = await db.select().from(submissionsTable)
      .where(and(eq(submissionsTable.userId, userId), eq(submissionsTable.problemId, id)))
      .orderBy(desc(submissionsTable.createdAt))
      .limit(10);
    isSolved = subs.some((s) => s.status === "accepted");
    userSubmissions = subs.map((s) => ({
      id: s.id,
      status: s.status,
      code: s.code,
      language: s.language,
      output: s.output ?? undefined,
      errorMessage: s.errorMessage ?? undefined,
      executionTime: s.executionTime ?? undefined,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  // Performance stats for this problem
  const [perfStats] = await db
    .select({
      avgTime: sql<number>`ROUND(AVG(${submissionsTable.executionTime}))::int`,
      solverCount: sql<number>`COUNT(DISTINCT ${submissionsTable.userId})::int`,
    })
    .from(submissionsTable)
    .where(and(eq(submissionsTable.problemId, id), eq(submissionsTable.status, "accepted")));

  const testCases = (problem.testCases as TestCase[]) ?? [];

  // Check if this problem is today's daily challenge
  const today = new Date().toISOString().slice(0, 10);
  const [dailyChallenge] = await db
    .select()
    .from(dailyChallengesTable)
    .where(and(eq(dailyChallengesTable.problemId, id), eq(dailyChallengesTable.challengeDate, today)))
    .limit(1);

  let isDailyChallenge = !!dailyChallenge;
  let dailyChallengeId = dailyChallenge?.id ?? null;
  let dailyBonusMultiplier = dailyChallenge?.bonusMultiplier ?? 2;
  let dailySolvedToday = false;

  if (isDailyChallenge && userId && dailyChallenge) {
    const [ds] = await db.select().from(userDailyChallengesTable)
      .where(and(
        eq(userDailyChallengesTable.userId, userId),
        eq(userDailyChallengesTable.dailyChallengeId, dailyChallenge.id)
      ))
      .limit(1);
    dailySolvedToday = !!ds;
  }

  res.json({
    id: problem.id,
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    category: problem.category,
    language: problem.language,
    points: problem.points,
    solvedCount: problem.solvedCount,
    examples: problem.examples,
    constraints: problem.constraints,
    starterCode: problem.starterCode ?? "",
    hints: problem.hints,
    tags: problem.tags ?? [],
    companyTags: problem.companyTags ?? [],
    packId: problem.packId,
    hasTestCases: testCases.length > 0,
    testCasesCount: testCases.length,
    isSolved,
    userSubmissions,
    performanceStats: {
      avgTime: perfStats?.avgTime ?? null,
      solverCount: perfStats?.solverCount ?? 0,
    },
    dailyChallenge: isDailyChallenge ? {
      id: dailyChallengeId,
      bonusMultiplier: dailyBonusMultiplier,
      isSolvedToday: dailySolvedToday,
    } : null,
  });
});

// ─── POST /problems/:id/submit ────────────────────────────────────────────────
const SubmitSchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
  dailyChallengeId: z.number().optional(),
});

router.post("/problems/:id/submit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }

  const parsed = SubmitSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }

  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, id)).limit(1);
  if (!problem) { res.status(404).json({ error: "المسألة غير موجودة" }); return; }

  const testCases = (problem.testCases as TestCase[]) ?? [];

  if (testCases.length === 0) {
    res.status(400).json({
      error: "هذه المسألة لم يتم إعداد حالات الاختبار لها بعد — تواصل مع الإدارة",
      code: "NO_TEST_CASES",
    });
    return;
  }

  let status: "accepted" | "wrong_answer" | "error" = "accepted";
  let outputLog = "";
  let errorMsg: string | null = null;
  let totalTime = 0;
  let maxMemory = 0;
  let testCaseResults: Array<{
    input: string; expected: string; got: string; passed: boolean; executionTime: number | null;
  }> = [];

  if (testCases.length > 0) {
    try {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const isVisible = i < 3; // first 3 are visible, rest are hidden

        const result = await runCodeOnJudge0(
          parsed.data.code,
          parsed.data.language,
          tc.input
        );

        if (result.time) totalTime += result.time;
        if (result.memory) maxMemory = Math.max(maxMemory, result.memory);

        if (result.statusId === 6 || result.statusId >= 11) {
          status = "error";
          const rawErr = result.error ?? "خطأ في تنفيذ الكود";
          errorMsg = parseArabicError(rawErr, parsed.data.language);
          outputLog = result.output;
          testCaseResults.push({
            input: isVisible ? tc.input : "مخفي",
            expected: isVisible ? tc.expectedOutput.trim() : "مخفي",
            got: result.output || "خطأ في التنفيذ",
            passed: false,
            executionTime: result.time,
          });
          break;
        }

        const expected = tc.expectedOutput.trim();
        const got = result.output.trim();
        const passed = got === expected;

        testCaseResults.push({
          input: isVisible ? tc.input : "مخفي",
          expected: isVisible ? expected : "مخفي",
          got: isVisible ? got : (passed ? "✓" : "✗"),
          passed,
          executionTime: result.time,
        });

        if (!passed) {
          status = "wrong_answer";
          outputLog = got;
          break;
        }
        outputLog = got;
      }
    } catch {
      status = "wrong_answer";
      errorMsg = "تعذّر تنفيذ الكود، تحقق من صياغته وحاول مرة أخرى";
    }
  }

  const alreadyAccepted = await db.select({ id: submissionsTable.id })
    .from(submissionsTable)
    .where(and(
      eq(submissionsTable.userId, userId),
      eq(submissionsTable.problemId, id),
      eq(submissionsTable.status, "accepted")
    ))
    .limit(1);

  const avgTime = totalTime > 0 ? Math.round(totalTime / testCases.length) : null;

  const [submission] = await db.insert(submissionsTable).values({
    userId,
    problemId: id,
    code: parsed.data.code,
    language: parsed.data.language,
    status,
    output: outputLog || null,
    errorMessage: errorMsg,
    executionTime: avgTime,
    memoryUsed: maxMemory > 0 ? maxMemory : null,
  }).returning();

  logActivity({
    userId,
    action: status === "accepted" ? "solve_challenge" : "submit_challenge",
    entityType: "problem",
    entityId: id,
    entityTitle: problem.title,
    metadata: { language: parsed.data.language, status, points: problem.points },
  });

  let finalStreak = 0;
  let bonusPointsEarned = 0;
  let isDailyBonus = false;
  let newBadges: Array<{ key: string; icon: string; title: string }> = [];

  if (status === "accepted" && alreadyAccepted.length === 0) {
    await db.update(problemsTable)
      .set({ solvedCount: problem.solvedCount + 1 })
      .where(eq(problemsTable.id, id));

    const [currentUser] = await db.select({
      points: usersTable.points,
      streak: usersTable.streak,
      maxStreak: usersTable.maxStreak,
      lastSolvedAt: usersTable.lastSolvedAt,
      username: usersTable.username,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    // Streak calculation
    const today = new Date().toISOString().slice(0, 10);
    const last = currentUser?.lastSolvedAt ?? null;
    let newStreak = 1;
    if (last) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (last === today) newStreak = currentUser.streak;
      else if (last === yesterday) newStreak = (currentUser.streak ?? 0) + 1;
      else newStreak = 1;
    }
    const newMax = Math.max(newStreak, currentUser?.maxStreak ?? 0);

    // Daily challenge bonus
    let bonusMultiplier = 1;
    if (parsed.data.dailyChallengeId) {
      const [daily] = await db.select().from(dailyChallengesTable)
        .where(eq(dailyChallengesTable.id, parsed.data.dailyChallengeId))
        .limit(1);
      if (daily && daily.problemId === id) {
        const [alreadySolvedDaily] = await db.select().from(userDailyChallengesTable)
          .where(and(
            eq(userDailyChallengesTable.userId, userId),
            eq(userDailyChallengesTable.dailyChallengeId, daily.id)
          ))
          .limit(1);
        if (!alreadySolvedDaily) {
          bonusMultiplier = daily.bonusMultiplier;
          isDailyBonus = true;
          await db.insert(userDailyChallengesTable).values({ userId, dailyChallengeId: daily.id });
        }
      }
    }

    const basePoints = problem.points;
    const totalPoints = basePoints * bonusMultiplier;
    bonusPointsEarned = totalPoints - basePoints;

    await db.update(usersTable)
      .set({
        points: sql`${usersTable.points} + ${totalPoints}`,
        streak: newStreak,
        maxStreak: newMax,
        lastSolvedAt: today,
      })
      .where(eq(usersTable.id, userId));

    finalStreak = newStreak;

    // ── Badge checking ────────────────────────────────────────────────────────
    // Count total solved problems
    const [solvedCountResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${submissionsTable.problemId})::int` })
      .from(submissionsTable)
      .where(and(eq(submissionsTable.userId, userId), eq(submissionsTable.status, "accepted")));
    const totalSolved = (solvedCountResult?.count ?? 0);

    const solveCountBadges: Array<{ key: string; threshold: number }> = [
      { key: "first_solve", threshold: 1 },
      { key: "problem_5", threshold: 5 },
      { key: "problem_10", threshold: 10 },
      { key: "problem_25", threshold: 25 },
      { key: "problem_50", threshold: 50 },
      { key: "problem_100", threshold: 100 },
    ];

    for (const { key, threshold } of solveCountBadges) {
      if (totalSolved >= threshold) {
        const before = await db.select({ id: userBadgesTable.id })
          .from(userBadgesTable)
          .innerJoin(badgesTable, eq(badgesTable.id, userBadgesTable.badgeId))
          .where(and(eq(userBadgesTable.userId, userId), eq(badgesTable.key, key)))
          .limit(1);
        if (before.length === 0) {
          await awardBadgeIfNew(userId, key);
          const [b] = await db.select().from(badgesTable).where(eq(badgesTable.key, key)).limit(1);
          if (b) newBadges.push({ key, icon: b.icon, title: b.title });
        }
      }
    }

    // Streak badges
    const streakBadgeKeys = [
      { key: "streak_3", threshold: 3 },
      { key: "streak_7", threshold: 7 },
      { key: "streak_30", threshold: 30 },
      { key: "streak_100", threshold: 100 },
    ];
    for (const { key, threshold } of streakBadgeKeys) {
      if (newStreak >= threshold) {
        const before = await db.select({ id: userBadgesTable.id })
          .from(userBadgesTable)
          .innerJoin(badgesTable, eq(badgesTable.id, userBadgesTable.badgeId))
          .where(and(eq(userBadgesTable.userId, userId), eq(badgesTable.key, key)))
          .limit(1);
        if (before.length === 0) {
          await awardBadgeIfNew(userId, key);
          const [b] = await db.select().from(badgesTable).where(eq(badgesTable.key, key)).limit(1);
          if (b) newBadges.push({ key, icon: b.icon, title: b.title });
        }
      }
    }

    // Difficulty badges
    if (problem.difficulty === "expert") {
      const before = await db.select({ id: userBadgesTable.id })
        .from(userBadgesTable)
        .innerJoin(badgesTable, eq(badgesTable.id, userBadgesTable.badgeId))
        .where(and(eq(userBadgesTable.userId, userId), eq(badgesTable.key, "expert_solver")))
        .limit(1);
      if (before.length === 0) {
        await awardBadgeIfNew(userId, "expert_solver");
        newBadges.push({ key: "expert_solver", icon: "🧠", title: "صانع الخوارزميات" });
      }
    }

    // Speed badge
    if (avgTime && avgTime < 10000) {
      await awardBadgeIfNew(userId, "speed_demon");
    }

    // Polyglot badge — check distinct languages
    const [langCount] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${submissionsTable.language})::int` })
      .from(submissionsTable)
      .where(and(eq(submissionsTable.userId, userId), eq(submissionsTable.status, "accepted")));
    if ((langCount?.count ?? 0) >= 3) {
      await awardBadgeIfNew(userId, "polyglot");
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    notify(userId, {
      type: "problem_solved",
      title: "🎯 مسألة محلولة!",
      body: isDailyBonus
        ? `أحسنت! حللت التحدي اليومي "${problem.title}" وكسبت ${totalPoints} نقطة (×${bonusMultiplier} مضاعفة)!`
        : `أحسنت! حللت "${problem.title}" وكسبت ${totalPoints} نقطة`,
      link: `/problems/${id}`,
      metadata: { problemId: id, points: totalPoints },
    }).catch(() => {/* silent */});

    if (STREAK_MILESTONES.includes(newStreak)) {
      notify(userId, {
        type: "streak",
        title: `🔥 ${newStreak} يوم متتالي!`,
        body: `أنت تحل مسائل ${newStreak} يوماً على التوالي — استمر!`,
        link: `/leaderboard`,
        metadata: { streak: newStreak },
      }).catch(() => {/* silent */});
    }

    const oldPoints = currentUser?.points ?? 0;
    checkLevelUp(userId, oldPoints, totalPoints).then((newLevel) => {
      if (newLevel) {
        const icons: Record<string, string> = { "متوسط": "⚡", "متقدم": "🚀", "خبير": "👑" };
        notify(userId, {
          type: "level_up",
          title: `${icons[newLevel] ?? "⬆️"} ترقية المستوى!`,
          body: `مبروك! وصلت لمستوى "${newLevel}"`,
          link: currentUser?.username ? `/profile/${currentUser.username}` : `/dashboard`,
          metadata: { newLevel },
        }).catch(() => {/* silent */});
      }
    }).catch(() => {/* silent */});
  }

  const passedCount = testCaseResults.filter((t) => t.passed).length;

  res.status(201).json({
    id: submission.id,
    status,
    message: status === "accepted"
      ? `أحسنت! جميع حالات الاختبار (${testCases.length}) اجتازت بنجاح ✅`
      : status === "error"
      ? errorMsg ?? "حدث خطأ في تنفيذ الكود"
      : `إجابة خاطئة ❌ — نجح ${passedCount} من ${testCaseResults.length} حالات اختبار`,
    output: outputLog,
    errorMessage: errorMsg,
    pointsEarned: status === "accepted" && alreadyAccepted.length === 0 ? problem.points : 0,
    bonusPointsEarned,
    isDailyBonus,
    testCasesCount: testCases.length,
    testCaseResults,
    passedCount,
    streak: finalStreak,
    executionTime: avgTime,
    newBadges,
  });
});

export default router;
