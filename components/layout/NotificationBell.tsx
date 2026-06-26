"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, Check, CheckCheck, MessageCircle, Trophy,
  BookOpen, Megaphone, X, Zap, Flame, TrendingUp, Code2,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";

type NotifType =
  | "mention" | "achievement" | "enrollment" | "course"
  | "system" | "reply" | "certificate" | "problem_solved"
  | "streak" | "level_up" | "quiz_passed" | "badge";

interface Notification {
  id: number;
  type: NotifType;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  mention:        <MessageCircle className="w-4 h-4 text-cyan-400" />,
  reply:          <MessageCircle className="w-4 h-4 text-blue-400" />,
  achievement:    <Zap className="w-4 h-4 text-amber-400" />,
  certificate:    <Trophy className="w-4 h-4 text-amber-400" />,
  badge:          <Trophy className="w-4 h-4 text-yellow-400" />,
  enrollment:     <BookOpen className="w-4 h-4 text-emerald-400" />,
  course:         <BookOpen className="w-4 h-4 text-violet-400" />,
  system:         <Megaphone className="w-4 h-4 text-pink-400" />,
  problem_solved: <Code2 className="w-4 h-4 text-green-400" />,
  streak:         <Flame className="w-4 h-4 text-orange-400" />,
  level_up:       <TrendingUp className="w-4 h-4 text-purple-400" />,
  quiz_passed:    <Zap className="w-4 h-4 text-yellow-400" />,
};

const TYPE_BG: Record<string, string> = {
  mention:        "dark:bg-cyan-500/10 bg-cyan-50",
  reply:          "dark:bg-blue-500/10 bg-blue-50",
  achievement:    "dark:bg-amber-500/10 bg-amber-50",
  certificate:    "dark:bg-amber-500/10 bg-amber-50",
  badge:          "dark:bg-yellow-500/10 bg-yellow-50",
  enrollment:     "dark:bg-emerald-500/10 bg-emerald-50",
  course:         "dark:bg-violet-500/10 bg-violet-50",
  system:         "dark:bg-pink-500/10 bg-pink-50",
  problem_solved: "dark:bg-green-500/10 bg-green-50",
  streak:         "dark:bg-orange-500/10 bg-orange-50",
  level_up:       "dark:bg-purple-500/10 bg-purple-50",
  quiz_passed:    "dark:bg-yellow-500/10 bg-yellow-50",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "الآن";
  const m = Math.floor(s / 60);
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 7) return `منذ ${d} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-EG");
}

function NotifItem({
  n,
  onMark,
  onClose,
}: {
  n: Notification;
  onMark: (id: number) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const icon = TYPE_ICON[n.type] ?? TYPE_ICON.system;
  const bg   = TYPE_BG[n.type]  ?? TYPE_BG.system;

  const handleClick = () => {
    onMark(n.id);
    onClose();
    if (n.link) router.push(n.link);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => e.key === "Enter" && handleClick()}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer active:scale-[0.98]",
        n.isRead
          ? "dark:hover:bg-white/5 hover:bg-slate-50"
          : "dark:bg-white/5 bg-slate-50 dark:hover:bg-white/8 hover:bg-slate-100",
      )}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-xs font-semibold leading-tight",
            n.isRead ? "dark:text-slate-300 text-slate-700" : "dark:text-white text-slate-900",
          )}>
            {n.title}
          </p>
          {!n.isRead && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 mt-0.5 shadow-sm shadow-cyan-400/50" />
          )}
        </div>
        <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
          {n.body}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[10px] dark:text-slate-600 text-slate-400">{timeAgo(n.createdAt)}</p>
          {n.link && (
            <span className="text-[10px] text-cyan-500 flex items-center gap-0.5">
              اضغط للانتقال <ChevronLeft className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
      {!n.isRead && (
        <button
          onClick={(e) => { e.stopPropagation(); onMark(n.id); }}
          className="w-6 h-6 rounded-md dark:bg-white/10 bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-cyan-500/20 transition-colors"
          title="تحديد كمقروء"
        >
          <Check className="w-3 h-3 dark:text-slate-300 text-slate-600" />
        </button>
      )}
    </div>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unread = notifs.filter(n => !n.isRead).length;

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications", {
        credentials: "include",
        headers: authHeaders(),
      });
      if (!res.ok) return;
      setNotifs(await res.json() as Notification[]);
    } catch { /* ignore */ }
  }, [user, authHeaders]);

  useEffect(() => {
    if (!user) { setNotifs([]); return; }
    fetchNotifs();
    pollRef.current = setInterval(fetchNotifs, 45_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user, fetchNotifs]);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }
    const token = getToken();
    if (!token) return;

    const socket = io("", {
      path: "/api/socket.io",
      auth: { token: `Bearer ${token}` },
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("notification", (n: Notification) => {
      setNotifs(prev => {
        if (prev.find(p => p.id === n.id)) return prev;
        return [n, ...prev];
      });
      toast(n.title, {
        description: n.body.slice(0, 80),
        action: n.link
          ? { label: "عرض ←", onClick: () => { window.location.href = n.link!; } }
          : undefined,
        duration: 7000,
      });
    });

    // Force logout when the account is banned by an admin
    socket.on("force_logout", ({ reason }: { reason?: string }) => {
      localStorage.removeItem("nouvil_token");
      localStorage.removeItem("nouvil_user");
      toast.error(reason ?? "تم تسجيل خروجك من النظام", { duration: Infinity });
      setTimeout(() => { window.location.href = "/auth/login"; }, 1500);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) { setLoading(true); fetchNotifs().finally(() => setLoading(false)); }
  }, [open, fetchNotifs]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (open && typeof window !== "undefined" && window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const markOne = async (id: number) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await fetch(`/api/notifications/${id}/read`, {
      method: "PUT", credentials: "include", headers: authHeaders(),
    }).catch(() => {});
  };

  const markAll = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    await fetch("/api/notifications/read-all", {
      method: "PUT", credentials: "include", headers: authHeaders(),
    }).catch(() => {});
  };

  if (!user) return null;

  const bellBtn = (
    <button
      onClick={() => setOpen(o => !o)}
      className={cn(
        "relative w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110",
        open
          ? "dark:bg-cyan-500/15 bg-cyan-50 text-cyan-500"
          : "dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400",
      )}
      aria-label="الإشعارات"
    >
      <Bell className="w-4 h-4" />
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key="badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-red-500/30"
          >
            {unread > 99 ? "99+" : unread}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );

  const listContent = (
    <>
      {loading && notifs.length === 0 ? (
        <div className="space-y-2 p-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 p-2 rounded-xl animate-pulse">
              <div className="w-9 h-9 rounded-xl dark:bg-white/5 bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded dark:bg-white/5 bg-slate-100" />
                <div className="h-2.5 w-full rounded dark:bg-white/5 bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <div className="w-14 h-14 rounded-2xl dark:bg-white/5 bg-slate-100 flex items-center justify-center">
            <BellOff className="w-6 h-6 dark:text-slate-500 text-slate-400" />
          </div>
          <p className="text-sm dark:text-slate-500 text-slate-400 font-medium">لا توجد إشعارات</p>
          <p className="text-xs dark:text-slate-600 text-slate-400 text-center px-8">
            ستصلك إشعارات عند إكمال كورس أو حل مسألة
          </p>
        </div>
      ) : (
        <div className="p-2 space-y-0.5">
          {notifs.map((n) => (
            <NotifItem key={n.id} n={n} onMark={markOne} onClose={() => setOpen(false)} />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div ref={ref} className="relative">
      {bellBtn}

      <AnimatePresence>
        {open && (
          <>
            {/* ── Desktop dropdown (sm and above) ── */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="hidden sm:block absolute left-0 top-full mt-2 w-80 sm:w-96 dark:bg-[#111827] bg-white rounded-2xl shadow-2xl dark:shadow-black/60 border dark:border-white/10 border-slate-200 overflow-hidden z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/8 border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 dark:text-slate-400 text-slate-500" />
                  <span className="font-bold dark:text-white text-slate-900 text-sm">الإشعارات</span>
                  {unread > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500/15 text-red-500">
                      {unread} جديد
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      onClick={markAll}
                      className="flex items-center gap-1 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-500 transition-colors px-2 py-1 rounded-lg hover:dark:bg-white/5"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      قراءة الكل
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center dark:text-slate-400 text-slate-500 hover:dark:bg-white/10 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto">{listContent}</div>

              {notifs.length > 0 && (
                <div className="border-t dark:border-white/8 border-slate-100 p-2">
                  <Link
                    href="/dashboard/notifications"
                    onClick={() => setOpen(false)}
                    className="block text-center text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-500 transition-colors py-2 rounded-lg hover:dark:bg-white/5 hover:bg-slate-50"
                  >
                    عرض كل الإشعارات ←
                  </Link>
                </div>
              )}
            </motion.div>

            {/* ── Mobile full-screen drawer (sm and below) ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="sm:hidden fixed bottom-0 left-0 right-0 z-[201] dark:bg-[#0d1117] bg-white rounded-t-3xl shadow-2xl flex flex-col"
              style={{ maxHeight: "85vh" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full dark:bg-white/20 bg-slate-300" />
              </div>

              {/* Mobile Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b dark:border-white/10 border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 flex items-center justify-center">
                    <Bell className="w-4.5 h-4.5 dark:text-cyan-400 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black dark:text-white text-slate-900">الإشعارات</h3>
                    <p className="text-[10px] dark:text-slate-500 text-slate-400">
                      {unread > 0 ? `${unread} إشعار جديد` : "لا يوجد جديد"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      onClick={markAll}
                      className="flex items-center gap-1.5 text-xs text-cyan-500 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-xl dark:bg-cyan-500/10 bg-cyan-50 font-bold"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      قراءة الكل
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center dark:text-slate-400 text-slate-500 hover:dark:bg-white/10 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mobile List */}
              <div className="flex-1 overflow-y-auto">{listContent}</div>

              {/* Mobile Footer */}
              <div className="px-4 py-3 border-t dark:border-white/10 border-slate-100">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl dark:bg-white/5 bg-slate-100 text-sm font-bold dark:text-slate-300 text-slate-600 hover:dark:bg-white/8 hover:bg-slate-200 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  عرض كل الإشعارات
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
