import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable, coursesTable, chatMessagesTable, chatReactionsTable, chatMutesTable, chatBansTable, notificationsTable, enrollmentsTable } from "../../lib/db/src/index";
import { eq, and, desc, asc, isNull, or, gt, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { emitToCourseChatRoom, kickUserFromChatRoom, emitToUser } from "../socket";
import multer from "multer";
import path from "path";
import { CHAT_UPLOAD_DIR } from "../lib/chatConfig";

const router: IRouter = Router();

const chatStorage = multer.diskStorage({
  destination: CHAT_UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const chatUpload = multer({ storage: chatStorage, limits: { fileSize: 100 * 1024 * 1024 } });

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

async function getAuthUser(req: Request): Promise<{ id: number; role: string; name: string; avatar: string | null } | null> {
  let userId = req.session.userId;
  if (!userId) {
    const fromToken = getUserIdFromToken(req.headers.authorization);
    if (fromToken) { userId = fromToken; req.session.userId = fromToken; }
  }
  if (!userId) return null;
  const [user] = await db.select({ id: usersTable.id, role: usersTable.role, name: usersTable.name, avatar: usersTable.avatar })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user ?? null;
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
      (req as Request & { authUserId?: number }).authUserId = userId;
      next();
    })
    .catch(() => res.status(500).json({ error: "خطأ في الخادم" }));
}

async function enrichMessages(messages: typeof chatMessagesTable.$inferSelect[]) {
  if (messages.length === 0) return [];
  const userIds = [...new Set(messages.map(m => m.userId))];
  const users = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, role: usersTable.role })
    .from(usersTable).where(inArray(usersTable.id, userIds));
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const messageIds = messages.map(m => m.id);
  const reactions = messageIds.length > 0
    ? await db.select().from(chatReactionsTable).where(inArray(chatReactionsTable.messageId, messageIds))
    : [];

  const replyIds = messages.map(m => m.replyToId).filter(Boolean) as number[];
  let replyMessages: typeof chatMessagesTable.$inferSelect[] = [];
  if (replyIds.length > 0) {
    replyMessages = await db.select().from(chatMessagesTable).where(inArray(chatMessagesTable.id, replyIds));
  }
  const replyMap = Object.fromEntries(replyMessages.map(r => [r.id, r]));
  const replyUserIds = [...new Set(replyMessages.map(m => m.userId))];
  const replyUsers = replyUserIds.length > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, replyUserIds))
    : [];
  const replyUserMap = Object.fromEntries(replyUsers.map(u => [u.id, u]));

  return messages.map(msg => {
    const msgReactions = reactions.filter(r => r.messageId === msg.id);
    const reactionGroups: Record<string, { emoji: string; count: number; users: number[] }> = {};
    for (const r of msgReactions) {
      if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      reactionGroups[r.emoji]!.count++;
      reactionGroups[r.emoji]!.users.push(r.userId);
    }
    const replyTo = msg.replyToId ? replyMap[msg.replyToId] : null;
    const replyUser = replyTo ? replyUserMap[replyTo.userId] : null;
    return {
      ...msg,
      user: userMap[msg.userId] ?? { id: msg.userId, name: "مستخدم محذوف", avatar: null, role: "user" },
      reactions: Object.values(reactionGroups),
      replyTo: replyTo ? { ...replyTo, user: replyUser ?? { name: "مستخدم محذوف" } } : null,
    };
  });
}

// GET /chat/:courseId/members — for @mention autocomplete
router.get("/chat/:courseId/members", requireAuth, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const members = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    username: usersTable.username,
    avatar: usersTable.avatar,
    role: usersTable.role,
  }).from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id))
    .where(eq(enrollmentsTable.courseId, courseId))
    .limit(200);
  res.json(members);
});

// GET /chat/:courseId/messages
router.get("/chat/:courseId/messages", requireAuth, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const before = req.query["before"] ? parseInt(req.query["before"] as string, 10) : undefined;
  const limit = Math.min(parseInt(req.query["limit"] as string || "50", 10), 100);

  const whereClause = before
    ? and(eq(chatMessagesTable.courseId, courseId), eq(chatMessagesTable.deletedForEveryone, false), sql`${chatMessagesTable.id} < ${before}`)
    : and(eq(chatMessagesTable.courseId, courseId), eq(chatMessagesTable.deletedForEveryone, false));

  const messages = await db.select().from(chatMessagesTable)
    .where(whereClause)
    .orderBy(desc(chatMessagesTable.createdAt)).limit(limit) as typeof chatMessagesTable.$inferSelect[];
  const enriched = await enrichMessages(messages.reverse());
  res.json(enriched);
});

// GET /chat/:courseId/pinned
router.get("/chat/:courseId/pinned", requireAuth, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const messages = await db.select().from(chatMessagesTable)
    .where(and(eq(chatMessagesTable.courseId, courseId), eq(chatMessagesTable.isPinned, true), eq(chatMessagesTable.deletedForEveryone, false)))
    .orderBy(desc(chatMessagesTable.createdAt)).limit(20);
  const enriched = await enrichMessages(messages);
  res.json(enriched);
});

const MessageSchema = z.object({
  content: z.string().max(5000).optional().default(""),
  type: z.enum(["text", "image", "video", "file", "audio"]).optional().default("text"),
  fileUrl: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
  replyToId: z.number().int().optional().nullable(),
  mentions: z.array(z.number()).optional().default([]),
});

// POST /chat/:courseId/messages
router.post("/chat/:courseId/messages", requireAuth, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const userId = (req as Request & { authUserId?: number }).authUserId!;

  const now = new Date();
  const ban = await db.select().from(chatBansTable)
    .where(and(
      eq(chatBansTable.userId, userId),
      or(isNull(chatBansTable.courseId), eq(chatBansTable.courseId, courseId)),
      or(isNull(chatBansTable.bannedUntil), gt(chatBansTable.bannedUntil, now))
    )).limit(1);
  if (ban.length > 0) { res.status(403).json({ error: "أنت محظور من إرسال رسائل" }); return; }

  const mute = await db.select().from(chatMutesTable)
    .where(and(
      eq(chatMutesTable.userId, userId),
      eq(chatMutesTable.courseId, courseId),
      or(isNull(chatMutesTable.mutedUntil), gt(chatMutesTable.mutedUntil, now))
    )).limit(1);
  if (mute.length > 0) { res.status(403).json({ error: "أنت مكتوم في هذا الكورس" }); return; }

  const parsed = MessageSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (!parsed.data.content.trim() && !parsed.data.fileUrl) { res.status(400).json({ error: "الرسالة فارغة" }); return; }

  const [message] = await db.insert(chatMessagesTable).values({
    courseId, userId,
    content: parsed.data.content,
    type: parsed.data.type,
    fileUrl: parsed.data.fileUrl ?? null,
    fileName: parsed.data.fileName ?? null,
    fileSize: parsed.data.fileSize ?? null,
    replyToId: parsed.data.replyToId ?? null,
  }).returning();

  const [user] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const enriched = { ...message, user, reactions: [], replyTo: null };

  const notifsToInsert: {
    userId: number; type: string; title: string; body: string; link: string; metadata: object;
  }[] = [];

  // @mention notifications
  if (parsed.data.mentions && parsed.data.mentions.length > 0) {
    parsed.data.mentions
      .filter(mid => mid !== userId)
      .forEach(mid => notifsToInsert.push({
        userId: mid,
        type: "mention",
        title: `${user?.name ?? "مستخدم"} ذكرك في الشات`,
        body: parsed.data.content.slice(0, 120),
        link: `/courses/${courseId}?chat=1&msg=${message!.id}`,
        metadata: { courseId, messageId: message!.id },
      }));
  }

  // Reply notification — notify original message author
  if (parsed.data.replyToId) {
    const [original] = await db.select({ userId: chatMessagesTable.userId, content: chatMessagesTable.content })
      .from(chatMessagesTable).where(eq(chatMessagesTable.id, parsed.data.replyToId)).limit(1);
    if (original && original.userId !== userId) {
      notifsToInsert.push({
        userId: original.userId,
        type: "reply",
        title: `${user?.name ?? "مستخدم"} رد على رسالتك`,
        body: parsed.data.content.slice(0, 120),
        link: `/courses/${courseId}?chat=1&msg=${message!.id}`,
        metadata: { courseId, messageId: message!.id, replyToId: parsed.data.replyToId },
      });
    }
  }

  if (notifsToInsert.length > 0) {
    const inserted = await db.insert(notificationsTable).values(notifsToInsert).returning();
    for (const n of inserted) emitToUser(n.userId, "notification", n);
  }

  emitToCourseChatRoom(courseId, "new_message", enriched);
  res.status(201).json(enriched);
});

// DELETE /chat/messages/:id
router.delete("/chat/messages/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const userId = (req as Request & { authUserId?: number }).authUserId!;
  const user = await getAuthUser(req);
  const isAdmin = user && ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number]);

  const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, id)).limit(1);
  if (!msg) { res.status(404).json({ error: "الرسالة غير موجودة" }); return; }

  const forEveryone = req.query["forEveryone"] === "true";

  if (isAdmin || (msg.userId === userId && forEveryone)) {
    await db.update(chatMessagesTable).set({ deletedForEveryone: true, content: "", isDeleted: true, updatedAt: new Date() }).where(eq(chatMessagesTable.id, id));
    emitToCourseChatRoom(msg.courseId, "message_deleted", { id, forEveryone: true });
  } else if (msg.userId === userId) {
    await db.update(chatMessagesTable).set({ isDeleted: true, updatedAt: new Date() }).where(eq(chatMessagesTable.id, id));
    emitToCourseChatRoom(msg.courseId, "message_deleted", { id, forEveryone: false, userId });
  } else {
    res.status(403).json({ error: "غير مصرح لك" }); return;
  }

  res.json({ message: "تم الحذف" });
});

// PUT /chat/messages/:id/pin
router.put("/chat/messages/:id/pin", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, id)).limit(1);
  if (!msg) { res.status(404).json({ error: "الرسالة غير موجودة" }); return; }
  const newPinned = !msg.isPinned;
  await db.update(chatMessagesTable).set({ isPinned: newPinned, updatedAt: new Date() }).where(eq(chatMessagesTable.id, id));
  emitToCourseChatRoom(msg.courseId, "message_pinned", { id, isPinned: newPinned });
  res.json({ id, isPinned: newPinned });
});

// POST /chat/messages/:id/react
router.post("/chat/messages/:id/react", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const userId = (req as Request & { authUserId?: number }).authUserId!;
  const { emoji } = z.object({ emoji: z.string().min(1).max(10) }).parse(req.body);

  const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, id)).limit(1);
  if (!msg) { res.status(404).json({ error: "الرسالة غير موجودة" }); return; }

  const existing = await db.select().from(chatReactionsTable)
    .where(and(eq(chatReactionsTable.messageId, id), eq(chatReactionsTable.userId, userId), eq(chatReactionsTable.emoji, emoji))).limit(1);

  if (existing.length > 0) {
    await db.delete(chatReactionsTable).where(eq(chatReactionsTable.id, existing[0]!.id));
    emitToCourseChatRoom(msg.courseId, "reaction_removed", { messageId: id, userId, emoji });
    res.json({ removed: true });
  } else {
    await db.insert(chatReactionsTable).values({ messageId: id, userId, emoji });
    emitToCourseChatRoom(msg.courseId, "reaction_added", { messageId: id, userId, emoji });
    res.json({ added: true });
  }
});

// ====== ADMIN MODERATION ======

// POST /chat/:courseId/mute/:userId
router.post("/chat/:courseId/mute/:userId", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  const targetUserId = parseInt(req.params.userId as string, 10);
  if (isNaN(courseId) || isNaN(targetUserId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const { minutes } = z.object({ minutes: z.number().int().optional() }).parse(req.body);
  const mutedUntil = minutes ? new Date(Date.now() + minutes * 60000) : null;

  await db.delete(chatMutesTable).where(and(eq(chatMutesTable.courseId, courseId), eq(chatMutesTable.userId, targetUserId)));
  await db.insert(chatMutesTable).values({ courseId, userId: targetUserId, mutedUntil });
  emitToCourseChatRoom(courseId, "user_muted", { userId: targetUserId, mutedUntil });
  res.json({ message: "تم كتم المستخدم" });
});

// POST /chat/:courseId/kick/:userId — admin kick from chat room
router.post("/chat/:courseId/kick/:userId", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  const targetUserId = parseInt(req.params.userId as string, 10);
  if (isNaN(courseId) || isNaN(targetUserId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  kickUserFromChatRoom(targetUserId, courseId);
  emitToCourseChatRoom(courseId, "user_kicked", { userId: targetUserId });
  res.json({ message: "تم طرد المستخدم من الشات" });
});

// DELETE /chat/:courseId/mute/:userId
router.delete("/chat/:courseId/mute/:userId", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  const targetUserId = parseInt(req.params.userId as string, 10);
  if (isNaN(courseId) || isNaN(targetUserId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  await db.delete(chatMutesTable).where(and(eq(chatMutesTable.courseId, courseId), eq(chatMutesTable.userId, targetUserId)));
  emitToCourseChatRoom(courseId, "user_unmuted", { userId: targetUserId });
  res.json({ message: "تم رفع الكتم" });
});

// POST /chat/ban/:userId
router.post("/chat/ban/:userId", requireAdmin, async (req, res): Promise<void> => {
  const targetUserId = parseInt(req.params.userId as string, 10);
  if (isNaN(targetUserId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = z.object({
    courseId: z.number().int().optional().nullable(),
    reason: z.string().optional(),
    days: z.number().int().optional(),
    ipAddress: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { courseId, reason, days, ipAddress } = parsed.data;
  const bannedUntil = days ? new Date(Date.now() + days * 86400000) : null;

  await db.insert(chatBansTable).values({
    userId: targetUserId,
    courseId: courseId ?? null,
    reason: reason ?? null,
    bannedUntil,
    ipAddress: ipAddress ?? null,
  });

  if (courseId) emitToCourseChatRoom(courseId, "user_banned", { userId: targetUserId, reason });
  res.status(201).json({ message: "تم الحظر" });
});

// DELETE /chat/ban/:userId
router.delete("/chat/ban/:userId", requireAdmin, async (req, res): Promise<void> => {
  const targetUserId = parseInt(req.params.userId as string, 10);
  if (isNaN(targetUserId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const courseId = req.query["courseId"] ? parseInt(req.query["courseId"] as string, 10) : null;
  if (courseId !== null) {
    await db.delete(chatBansTable).where(and(eq(chatBansTable.userId, targetUserId), eq(chatBansTable.courseId, courseId)));
  } else {
    await db.delete(chatBansTable).where(eq(chatBansTable.userId, targetUserId));
  }
  res.json({ message: "تم رفع الحظر" });
});

// GET /chat/:courseId/mutes
router.get("/chat/:courseId/mutes", requireAdmin, async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.courseId as string, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const mutes = await db.select({
    id: chatMutesTable.id,
    userId: chatMutesTable.userId,
    mutedUntil: chatMutesTable.mutedUntil,
    createdAt: chatMutesTable.createdAt,
    userName: usersTable.name,
    userAvatar: usersTable.avatar,
  }).from(chatMutesTable)
    .innerJoin(usersTable, eq(chatMutesTable.userId, usersTable.id))
    .where(eq(chatMutesTable.courseId, courseId));
  res.json(mutes);
});

// GET /notifications
router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { authUserId?: number }).authUserId!;
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(notifications);
});

// PUT /notifications/read-all
router.put("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { authUserId?: number }).authUserId!;
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, userId));
  res.json({ message: "تم التحديث" });
});

// PUT /notifications/:id/read
router.put("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const userId = (req as Request & { authUserId?: number }).authUserId!;
  await db.update(notificationsTable).set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
  res.json({ message: "تم التحديث" });
});

// POST /chat/upload — multipart file upload (images, videos, audio, files)
router.post("/chat/upload", requireAuth, chatUpload.single("file"), (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: "لم يتم رفع أي ملف" }); return; }
  res.json({ fileUrl: `/api/uploads/${req.file.filename}` });
});

export default router;
