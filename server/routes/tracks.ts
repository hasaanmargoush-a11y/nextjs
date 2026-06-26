import { Router, type IRouter } from "express";
import { db, tracksTable, packsTable, problemsTable, submissionsTable, userTrackProgressTable, userBadgesTable, badgesTable } from "../../lib/db/src/index";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

// GET /tracks — list all published tracks
router.get("/tracks", async (req, res): Promise<void> => {
  const userId = req.session.userId;

  const tracks = await db
    .select()
    .from(tracksTable)
    .where(eq(tracksTable.isPublished, true))
    .orderBy(asc(tracksTable.order));

  // Compute actual pack counts from DB
  const packCounts = await db
    .select({
      trackId: packsTable.trackId,
      packCount: sql<number>`COUNT(*)::int`,
      problemCount: sql<number>`SUM(${packsTable.totalProblems})::int`,
    })
    .from(packsTable)
    .where(eq(packsTable.isPublished, true))
    .groupBy(packsTable.trackId);

  const packCountMap = new Map(packCounts.map((p) => [p.trackId, p]));

  if (!userId) {
    res.json(tracks.map((t) => ({
      ...t,
      totalPacks: packCountMap.get(t.id)?.packCount ?? 0,
      totalProblems: packCountMap.get(t.id)?.problemCount ?? t.totalProblems,
      userProgress: null,
    })));
    return;
  }

  // Get user progress per track
  const progresses = await db
    .select()
    .from(userTrackProgressTable)
    .where(and(eq(userTrackProgressTable.userId, userId), sql`${userTrackProgressTable.packId} IS NULL`));

  const progressMap = new Map(progresses.map((p) => [p.trackId, p]));

  res.json(tracks.map((t) => ({
    ...t,
    totalPacks: packCountMap.get(t.id)?.packCount ?? 0,
    totalProblems: packCountMap.get(t.id)?.problemCount ?? t.totalProblems,
    userProgress: progressMap.get(t.id) ?? null,
  })));
});

// GET /tracks/:id — track detail with packs
router.get("/tracks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const [track] = await db.select().from(tracksTable).where(eq(tracksTable.id, id)).limit(1);
  if (!track || !track.isPublished) { res.status(404).json({ error: "المسار غير موجود" }); return; }

  const packs = await db
    .select()
    .from(packsTable)
    .where(and(eq(packsTable.trackId, id), eq(packsTable.isPublished, true)))
    .orderBy(asc(packsTable.order));

  const userId = req.session.userId;
  let packProgress: Record<number, { solvedCount: number; completedAt: string | null }> = {};

  if (userId) {
    const progresses = await db
      .select()
      .from(userTrackProgressTable)
      .where(and(eq(userTrackProgressTable.userId, userId), eq(userTrackProgressTable.trackId, id)));

    for (const p of progresses) {
      if (p.packId) {
        packProgress[p.packId] = {
          solvedCount: p.solvedCount,
          completedAt: p.completedAt?.toISOString() ?? null,
        };
      }
    }
  }

  res.json({
    ...track,
    packs: packs.map((p, i) => ({
      ...p,
      isUnlocked: i === 0 || (packProgress[packs[i - 1]?.id]?.completedAt !== undefined && packProgress[packs[i - 1]?.id]?.completedAt !== null) || (packProgress[packs[i - 1]?.id]?.solvedCount ?? 0) >= packs[i - 1]?.totalProblems,
      progress: packProgress[p.id] ?? { solvedCount: 0, completedAt: null },
    })),
  });
});

// GET /tracks/:trackId/packs/:packId — pack detail with problems
router.get("/tracks/:trackId/packs/:packId", async (req, res): Promise<void> => {
  const trackId = parseInt(req.params.trackId as string, 10);
  const packId = parseInt(req.params.packId as string, 10);
  if (isNaN(trackId) || isNaN(packId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const [pack] = await db.select().from(packsTable).where(eq(packsTable.id, packId)).limit(1);
  if (!pack || pack.trackId !== trackId) { res.status(404).json({ error: "الحزمة غير موجودة" }); return; }

  const problems = await db
    .select({
      id: problemsTable.id,
      title: problemsTable.title,
      difficulty: problemsTable.difficulty,
      points: problemsTable.points,
      solvedCount: problemsTable.solvedCount,
      language: problemsTable.language,
      tags: problemsTable.tags,
      orderInPack: problemsTable.orderInPack,
    })
    .from(problemsTable)
    .where(and(eq(problemsTable.packId, packId), eq(problemsTable.isPublished, true)))
    .orderBy(asc(problemsTable.orderInPack));

  const userId = req.session.userId;
  let solvedIds = new Set<number>();

  if (userId) {
    const subs = await db
      .select({ problemId: submissionsTable.problemId })
      .from(submissionsTable)
      .where(and(eq(submissionsTable.userId, userId), eq(submissionsTable.status, "accepted")));
    solvedIds = new Set(subs.map((s) => s.problemId));

    // Update progress
    const solvedInPack = problems.filter((p) => solvedIds.has(p.id)).length;
    const [existingProgress] = await db
      .select()
      .from(userTrackProgressTable)
      .where(and(
        eq(userTrackProgressTable.userId, userId),
        eq(userTrackProgressTable.trackId, trackId),
        eq(userTrackProgressTable.packId, packId)
      ))
      .limit(1);

    if (!existingProgress) {
      await db.insert(userTrackProgressTable).values({
        userId, trackId, packId, solvedCount: solvedInPack,
      }).onConflictDoNothing();
    } else if (existingProgress.solvedCount !== solvedInPack) {
      await db.update(userTrackProgressTable)
        .set({
          solvedCount: solvedInPack,
          completedAt: solvedInPack >= problems.length ? new Date() : null,
        })
        .where(eq(userTrackProgressTable.id, existingProgress.id));
    }
  }

  res.json({
    ...pack,
    problems: problems.map((p) => ({
      ...p,
      isSolved: solvedIds.has(p.id),
    })),
    userProgress: {
      solvedCount: problems.filter((p) => solvedIds.has(p.id)).length,
      total: problems.length,
    },
  });
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /admin/tracks
router.get("/admin/tracks", requireAdmin, async (_req, res): Promise<void> => {
  const tracks = await db.select().from(tracksTable).orderBy(asc(tracksTable.order));
  const packs = await db.select().from(packsTable).orderBy(asc(packsTable.order));
  const packsByTrack = packs.reduce((acc, p) => {
    if (!acc[p.trackId]) acc[p.trackId] = [];
    acc[p.trackId].push(p);
    return acc;
  }, {} as Record<number, typeof packs>);
  res.json(tracks.map((t) => ({ ...t, packs: packsByTrack[t.id] ?? [] })));
});

// POST /admin/tracks
const TrackSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  language: z.string().default("Python"),
  difficulty: z.string().default("beginner"),
  icon: z.string().default("🐍"),
  color: z.string().default("#06b6d4"),
  order: z.number().default(0),
  isPublished: z.boolean().default(false),
});

router.post("/admin/tracks", requireAdmin, async (req, res): Promise<void> => {
  const parsed = TrackSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }
  const [track] = await db.insert(tracksTable).values(parsed.data).returning();
  res.status(201).json(track);
});

// PATCH /admin/tracks/:id
router.patch("/admin/tracks/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = TrackSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }
  const [track] = await db.update(tracksTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(tracksTable.id, id)).returning();
  res.json(track);
});

// DELETE /admin/tracks/:id
router.delete("/admin/tracks/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(tracksTable).where(eq(tracksTable.id, id));
  res.json({ success: true });
});

// POST /admin/tracks/:trackId/packs
const PackSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  order: z.number().default(0),
  isPublished: z.boolean().default(false),
});

router.post("/admin/tracks/:trackId/packs", requireAdmin, async (req, res): Promise<void> => {
  const trackId = parseInt(req.params.trackId as string, 10);
  if (isNaN(trackId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = PackSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }
  const [pack] = await db.insert(packsTable).values({ ...parsed.data, trackId }).returning();
  res.status(201).json(pack);
});

// PATCH /admin/packs/:id
router.patch("/admin/packs/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = PackSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }
  const [pack] = await db.update(packsTable).set(parsed.data).where(eq(packsTable.id, id)).returning();
  res.json(pack);
});

// DELETE /admin/packs/:id
router.delete("/admin/packs/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(packsTable).where(eq(packsTable.id, id));
  res.json({ success: true });
});

export default router;
