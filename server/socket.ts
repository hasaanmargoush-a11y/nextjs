import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { db, usersTable, chatBansTable } from "../lib/db/src/index";
import { eq, and, isNull, or, gt } from "drizzle-orm";
import { logger } from "./lib/logger";

let io: Server | null = null;

// Track connected user IDs (Set deduplicates same user on multiple tabs)
const connectedUserIds = new Set<number>();

export function getOnlineCount(): number {
  return connectedUserIds.size;
}

function getUserIdFromToken(token: string | undefined): number | null {
  if (!token?.startsWith("Bearer ")) return null;
  try {
    const t = token.slice(7);
    const decoded = Buffer.from(t, "base64").toString("utf-8");
    const [idStr] = decoded.split(":");
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
  } catch { return null; }
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    path: "/api/socket.io",
    cors: { origin: true, credentials: true },
    transports: ["polling", "websocket"],
  });

  io.on("connection", async (socket) => {
    const token = socket.handshake.auth["token"] as string | undefined
      || socket.handshake.headers["authorization"] as string | undefined;
    const userId = getUserIdFromToken(token);

    if (!userId) {
      socket.disconnect();
      return;
    }

    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, role: usersTable.role })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    if (!user) { socket.disconnect(); return; }

    socket.data["userId"] = userId;
    socket.data["user"] = user;

    connectedUserIds.add(userId);
    logger.info({ userId, socketId: socket.id }, "Chat socket connected");

    socket.on("disconnect", () => {
      // Only remove if no other sockets for this user remain
      const stillConnected = [...(io?.sockets.sockets.values() ?? [])].some(
        s => s.id !== socket.id && s.data["userId"] === userId
      );
      if (!stillConnected) connectedUserIds.delete(userId);
    });

    socket.on("join_course", async (courseId: number) => {
      const now = new Date();
      const ban = await db.select().from(chatBansTable)
        .where(and(
          eq(chatBansTable.userId, userId),
          or(isNull(chatBansTable.courseId), eq(chatBansTable.courseId, courseId)),
          or(isNull(chatBansTable.bannedUntil), gt(chatBansTable.bannedUntil, now))
        )).limit(1);

      if (ban.length > 0) {
        socket.emit("error", { message: "أنت محظور من هذا الكورس" });
        return;
      }

      await socket.join(`course:${courseId}`);
      socket.emit("joined", { courseId });
    });

    socket.on("leave_course", (courseId: number) => {
      socket.leave(`course:${courseId}`);
    });

    socket.on("typing", (courseId: number) => {
      socket.to(`course:${courseId}`).emit("user_typing", {
        userId,
        name: user.name,
        avatar: user.avatar,
      });
    });

    // Join/leave duel rooms
    socket.on("join_duel", (duelId: number) => {
      socket.join(`duel:${duelId}`);
      socket.to(`duel:${duelId}`).emit("duel_opponent_online", { userId, name: user.name });
    });

    socket.on("leave_duel", (duelId: number) => {
      socket.leave(`duel:${duelId}`);
    });

    // Join personal room for direct notifications
    socket.join(`user:${userId}`);

    // Admin users join the alerts broadcast room automatically
    const ADMIN_ROLES = ["admin", "super_admin", "content_admin", "users_admin", "articles_admin"];
    if (ADMIN_ROLES.includes(user.role)) {
      socket.join("admin:alerts");
    }

    socket.on("disconnect", () => {
      logger.info({ userId, socketId: socket.id }, "Chat socket disconnected");
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitToCourseChatRoom(courseId: number, event: string, data: unknown): void {
  if (io) {
    io.to(`course:${courseId}`).emit(event, data);
  }
}

export function emitToUser(userId: number, event: string, data: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToAdmins(event: string, data: unknown): void {
  if (io) {
    io.to("admin:alerts").emit(event, data);
  }
}

export function kickBannedUser(opts: { userId?: number | null; email?: string | null; ip?: string | null }): void {
  if (!io) return;
  io.fetchSockets().then(sockets => {
    for (const socket of sockets) {
      const sid: number | undefined = socket.data["userId"];
      const sEmail: string | undefined = socket.data["user"]?.email;
      const matches =
        (opts.userId && sid === opts.userId) ||
        (opts.email  && sEmail && sEmail.toLowerCase() === opts.email.toLowerCase());
      if (matches) {
        socket.emit("force_logout", { reason: "تم حظر حسابك من الوصول للمنصة" });
        socket.disconnect(true);
      }
    }
  }).catch(() => {});
}

export function kickUserFromChatRoom(userId: number, courseId: number): void {
  if (!io) return;
  const room = `course:${courseId}`;
  io.in(room).fetchSockets().then(sockets => {
    for (const socket of sockets) {
      if (socket.data["userId"] === userId) {
        socket.leave(room);
        socket.emit("kicked", { courseId });
      }
    }
  }).catch(() => {});
}
