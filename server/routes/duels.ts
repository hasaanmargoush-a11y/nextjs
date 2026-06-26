import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable, problemsTable, duelsTable } from "../../lib/db/src/index";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { getIO } from "../socket";

const router: IRouter = Router();

function getUserIdFromToken(auth: string | undefined): number | null {
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const decoded = Buffer.from(auth.slice(7), "base64").toString("utf-8");
    const id = parseInt(decoded.split(":")[0]!, 10);
    return isNaN(id) ? null : id;
  } catch { return null; }
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

type AuthedRequest = Request & { authUserId?: number };

const JUDGE0_URL = process.env.JUDGE0_URL ?? "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_KEY ?? process.env.RAPIDAPI_KEY ?? "";
const LANGUAGE_IDS: Record<string, number> = {
  python: 71, javascript: 63, cpp: 54, java: 62,
  go: 60, rust: 73, typescript: 74,
};

async function runTestCases(code: string, lang: string, testCases: Array<{ input: string; expectedOutput?: string; output?: string }>) {
  const langId = LANGUAGE_IDS[lang.toLowerCase()] ?? 71;
  let passed = 0;
  const slice = testCases.slice(0, 5);
  for (const tc of slice) {
    const expected = tc.expectedOutput ?? tc.output ?? "";
    try {
      const r = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": JUDGE0_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({ source_code: code, language_id: langId, stdin: tc.input, expected_output: expected, cpu_time_limit: 3 }),
      });
      const data = (await r.json()) as { status: { id: number }; stdout?: string };
      if (data?.status?.id === 3) passed++;
      else if (!expected) {
        // No expected output defined — count as passed if no error
        if (data?.status?.id === 3 || data?.status?.id === 1 || data?.status?.id === 2) passed++;
      }
    } catch { /* ignore */ }
  }
  const total = Math.min(testCases.length, 5);
  return { passed, total, pct: total === 0 ? 0 : Math.round((passed / total) * 100) };
}

// GET /duels — my duels (active + history)
router.get("/duels", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as AuthedRequest).authUserId!;
  const status = (req.query.status as string) ?? "all";

  const where = status === "active"
    ? and(or(eq(duelsTable.challengerId, uid), eq(duelsTable.challengedId, uid)), or(eq(duelsTable.status, "active"), eq(duelsTable.status, "pending")))
    : or(eq(duelsTable.challengerId, uid), eq(duelsTable.challengedId, uid));

  const duels = await db.select({
    id: duelsTable.id,
    status: duelsTable.status,
    challengerProgress: duelsTable.challengerProgress,
    challengedProgress: duelsTable.challengedProgress,
    challengerSolvedAt: duelsTable.challengerSolvedAt,
    challengedSolvedAt: duelsTable.challengedSolvedAt,
    startedAt: duelsTable.startedAt,
    endedAt: duelsTable.endedAt,
    expiresAt: duelsTable.expiresAt,
    createdAt: duelsTable.createdAt,
    winnerId: duelsTable.winnerId,
    challengerId: duelsTable.challengerId,
    challengedId: duelsTable.challengedId,
    problemId: duelsTable.problemId,
  }).from(duelsTable).where(where).orderBy(desc(duelsTable.createdAt)).limit(30);

  // Enrich with user names and problem title
  const enriched = await Promise.all(duels.map(async (d) => {
    const [challenger] = await db.select({ id: usersTable.id, name: usersTable.name, username: usersTable.username, avatar: usersTable.avatar }).from(usersTable).where(eq(usersTable.id, d.challengerId)).limit(1);
    const [challenged] = await db.select({ id: usersTable.id, name: usersTable.name, username: usersTable.username, avatar: usersTable.avatar }).from(usersTable).where(eq(usersTable.id, d.challengedId)).limit(1);
    const [problem] = await db.select({ id: problemsTable.id, title: problemsTable.title, difficulty: problemsTable.difficulty }).from(problemsTable).where(eq(problemsTable.id, d.problemId)).limit(1);
    return { ...d, challenger, challenged, problem };
  }));

  res.json(enriched);
});

// POST /duels — challenge a user
router.post("/duels", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as AuthedRequest).authUserId!;
  const { challengedUsername, problemId } = req.body as { challengedUsername: string; problemId: number };

  if (!challengedUsername || !problemId) { res.status(400).json({ error: "اسم المستخدم والمسألة مطلوبان" }); return; }

  const [challenged] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
    .where(eq(usersTable.username, challengedUsername)).limit(1);
  if (!challenged) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  if (challenged.id === uid) { res.status(400).json({ error: "لا يمكنك تحدي نفسك" }); return; }

  const [problem] = await db.select({ id: problemsTable.id, title: problemsTable.title }).from(problemsTable)
    .where(eq(problemsTable.id, problemId)).limit(1);
  if (!problem) { res.status(404).json({ error: "المسألة غير موجودة" }); return; }

  // Check no active duel between them
  const [existing] = await db.select({ id: duelsTable.id }).from(duelsTable)
    .where(and(
      or(
        and(eq(duelsTable.challengerId, uid), eq(duelsTable.challengedId, challenged.id)),
        and(eq(duelsTable.challengerId, challenged.id), eq(duelsTable.challengedId, uid))
      ),
      or(eq(duelsTable.status, "pending"), eq(duelsTable.status, "active"))
    )).limit(1);
  if (existing) { res.status(409).json({ error: "يوجد تحدٍ قائم بالفعل بينكما" }); return; }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min to accept
  const [duel] = await db.insert(duelsTable).values({
    challengerId: uid,
    challengedId: challenged.id,
    problemId,
    status: "pending",
    expiresAt,
  }).returning();

  // Notify challenged user via socket
  const io = getIO();
  if (io && duel) {
    const [challenger] = await db.select({ name: usersTable.name, username: usersTable.username, avatar: usersTable.avatar }).from(usersTable).where(eq(usersTable.id, uid)).limit(1);
    io.to(`user:${challenged.id}`).emit("duel_invite", {
      duelId: duel.id,
      challenger,
      problem: { id: problem.id, title: problem.title },
      expiresAt: expiresAt.toISOString(),
    });
  }

  res.json(duel);
});

// GET /duels/:id — get duel details
router.get("/duels/:id", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as AuthedRequest).authUserId!;
  const id = parseInt(req.params.id as string, 10);

  const [duel] = await db.select().from(duelsTable).where(eq(duelsTable.id, id)).limit(1);
  if (!duel) { res.status(404).json({ error: "المبارزة غير موجودة" }); return; }
  if (duel.challengerId !== uid && duel.challengedId !== uid) { res.status(403).json({ error: "غير مصرح" }); return; }

  const [challenger] = await db.select({ id: usersTable.id, name: usersTable.name, username: usersTable.username, avatar: usersTable.avatar, points: usersTable.points }).from(usersTable).where(eq(usersTable.id, duel.challengerId)).limit(1);
  const [challenged] = await db.select({ id: usersTable.id, name: usersTable.name, username: usersTable.username, avatar: usersTable.avatar, points: usersTable.points }).from(usersTable).where(eq(usersTable.id, duel.challengedId)).limit(1);
  const [problem] = await db.select({ id: problemsTable.id, title: problemsTable.title, difficulty: problemsTable.difficulty, description: problemsTable.description, testCases: problemsTable.testCases, starterCode: problemsTable.starterCode, points: problemsTable.points }).from(problemsTable).where(eq(problemsTable.id, duel.problemId)).limit(1);

  res.json({ ...duel, challenger, challenged, problem });
});

// PATCH /duels/:id/accept
router.patch("/duels/:id/accept", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as AuthedRequest).authUserId!;
  const id = parseInt(req.params.id as string, 10);

  const [duel] = await db.select().from(duelsTable).where(eq(duelsTable.id, id)).limit(1);
  if (!duel) { res.status(404).json({ error: "المبارزة غير موجودة" }); return; }
  if (duel.challengedId !== uid) { res.status(403).json({ error: "لست المتحدى" }); return; }
  if (duel.status !== "pending") { res.status(400).json({ error: "الدعوة لم تعد صالحة" }); return; }
  if (duel.expiresAt && duel.expiresAt < new Date()) { res.status(400).json({ error: "انتهت صلاحية الدعوة" }); return; }

  const [updated] = await db.update(duelsTable).set({ status: "active", startedAt: new Date() }).where(eq(duelsTable.id, id)).returning();

  const io = getIO();
  if (io && updated) {
    io.to(`user:${duel.challengerId}`).emit("duel_accepted", { duelId: id });
    io.to(`duel:${id}`).emit("duel_state", { status: "active", startedAt: updated.startedAt });
  }

  res.json(updated);
});

// PATCH /duels/:id/reject
router.patch("/duels/:id/reject", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as AuthedRequest).authUserId!;
  const id = parseInt(req.params.id as string, 10);

  const [duel] = await db.select().from(duelsTable).where(eq(duelsTable.id, id)).limit(1);
  if (!duel) { res.status(404).json({ error: "المبارزة غير موجودة" }); return; }
  if (duel.challengedId !== uid) { res.status(403).json({ error: "لست المتحدى" }); return; }
  if (duel.status !== "pending") { res.status(400).json({ error: "الدعوة منتهية" }); return; }

  await db.update(duelsTable).set({ status: "rejected" }).where(eq(duelsTable.id, id));
  const io = getIO();
  if (io) io.to(`user:${duel.challengerId}`).emit("duel_rejected", { duelId: id });

  res.json({ ok: true });
});

// PATCH /duels/:id/cancel
router.patch("/duels/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as AuthedRequest).authUserId!;
  const id = parseInt(req.params.id as string, 10);

  const [duel] = await db.select().from(duelsTable).where(eq(duelsTable.id, id)).limit(1);
  if (!duel) { res.status(404).json({ error: "المبارزة غير موجودة" }); return; }
  if (duel.challengerId !== uid && duel.challengedId !== uid) { res.status(403).json({ error: "غير مصرح" }); return; }

  await db.update(duelsTable).set({ status: "cancelled" }).where(eq(duelsTable.id, id));
  const io = getIO();
  if (io) io.to(`duel:${id}`).emit("duel_state", { status: "cancelled" });
  res.json({ ok: true });
});

// POST /duels/:id/submit — run code and update progress
router.post("/duels/:id/submit", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as AuthedRequest).authUserId!;
  const id = parseInt(req.params.id as string, 10);
  const { code, language } = req.body as { code: string; language: string };

  if (!code || !language) { res.status(400).json({ error: "الكود واللغة مطلوبان" }); return; }

  const [duel] = await db.select().from(duelsTable).where(eq(duelsTable.id, id)).limit(1);
  if (!duel) { res.status(404).json({ error: "المبارزة غير موجودة" }); return; }
  if (duel.status !== "active") { res.status(400).json({ error: "المبارزة غير نشطة" }); return; }
  if (duel.challengerId !== uid && duel.challengedId !== uid) { res.status(403).json({ error: "لست في هذه المبارزة" }); return; }

  const isChallenger = duel.challengerId === uid;

  const [problem] = await db.select({ testCases: problemsTable.testCases }).from(problemsTable).where(eq(problemsTable.id, duel.problemId)).limit(1);
  const testCases = (problem?.testCases as Array<{ input: string; output: string }>) ?? [];

  const { passed, total, pct } = await runTestCases(code, language, testCases);
  const solved = passed === total && total > 0;
  const now = new Date();

  const updateFields = isChallenger
    ? {
        challengerCode: code,
        challengerLang: language,
        challengerProgress: pct,
        ...(solved && !duel.challengerSolvedAt ? { challengerSolvedAt: now } : {}),
      }
    : {
        challengedCode: code,
        challengedLang: language,
        challengedProgress: pct,
        ...(solved && !duel.challengedSolvedAt ? { challengedSolvedAt: now } : {}),
      };

  const [updated] = await db.update(duelsTable).set(updateFields).where(eq(duelsTable.id, id)).returning();

  // Check if duel is over
  const challengerSolved = isChallenger ? solved : !!updated?.challengerSolvedAt;
  const challengedSolved = !isChallenger ? solved : !!updated?.challengedSolvedAt;
  let finished = false;
  let winnerId: number | null = null;

  if (challengerSolved || challengedSolved) {
    if (challengerSolved && challengedSolved) {
      // Both solved — winner is whoever solved first
      const cTime = isChallenger ? now : updated?.challengerSolvedAt ?? now;
      const dTime = !isChallenger ? now : updated?.challengedSolvedAt ?? now;
      winnerId = cTime <= dTime ? duel.challengerId : duel.challengedId;
    } else {
      winnerId = challengerSolved ? duel.challengerId : duel.challengedId;
    }
    await db.update(duelsTable).set({ status: "finished", endedAt: now, winnerId }).where(eq(duelsTable.id, id));
    finished = true;
  }

  const io = getIO();
  if (io) {
    io.to(`duel:${id}`).emit("duel_progress", {
      duelId: id,
      userId: uid,
      isChallenger,
      progress: pct,
      passed,
      total,
      solved,
      finished,
      winnerId,
    });
  }

  res.json({ passed, total, pct, solved, finished, winnerId });
});

// GET /duels/pending/count — count pending invites for me
router.get("/duels/pending/count", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as AuthedRequest).authUserId!;
  const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(duelsTable)
    .where(and(eq(duelsTable.challengedId, uid), eq(duelsTable.status, "pending")));
  res.json({ count: Number(row?.count ?? 0) });
});

export default router;
