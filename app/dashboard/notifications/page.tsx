"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  Bell, BellOff, CheckCheck, Check, MessageCircle,
  Trophy, BookOpen, Megaphone, Zap, ChevronRight,
  Flame, TrendingUp, Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const TYPE_META: Record<string, { icon: React.ReactNode; bg: string; label: string }> = {
  mention:        { icon: <MessageCircle className="w-5 h-5 text-cyan-400" />,   bg: "dark:bg-cyan-500/10 bg-cyan-50",      label: "إشارة" },
  reply:          { icon: <MessageCircle className="w-5 h-5 text-blue-400" />,   bg: "dark:bg-blue-500/10 bg-blue-50",      label: "رد" },
  achievement:    { icon: <Zap className="w-5 h-5 text-amber-400" />,            bg: "dark:bg-amber-500/10 bg-amber-50",    label: "إنجاز" },
  certificate:    { icon: <Trophy className="w-5 h-5 text-amber-400" />,         bg: "dark:bg-amber-500/10 bg-amber-50",    label: "شهادة" },
  badge:          { icon: <Trophy className="w-5 h-5 text-yellow-400" />,        bg: "dark:bg-yellow-500/10 bg-yellow-50",  label: "وسام" },
  enrollment:     { icon: <BookOpen className="w-5 h-5 text-emerald-400" />,     bg: "dark:bg-emerald-500/10 bg-emerald-50", label: "كورس" },
  course:         { icon: <BookOpen className="w-5 h-5 text-violet-400" />,      bg: "dark:bg-violet-500/10 bg-violet-50",  label: "محتوى" },
  system:         { icon: <Megaphone className="w-5 h-5 text-pink-400" />,       bg: "dark:bg-pink-500/10 bg-pink-50",      label: "نظام" },
  problem_solved: { icon: <Code2 className="w-5 h-5 text-green-400" />,         bg: "dark:bg-green-500/10 bg-green-50",    label: "تحدي" },
  streak:         { icon: <Flame className="w-5 h-5 text-orange-400" />,         bg: "dark:bg-orange-500/10 bg-orange-50",  label: "سلسلة" },
  level_up:       { icon: <TrendingUp className="w-5 h-5 text-purple-400" />,    bg: "dark:bg-purple-500/10 bg-purple-50",  label: "ترقية" },
  quiz_passed:    { icon: <Zap className="w-5 h-5 text-yellow-400" />,          bg: "dark:bg-yellow-500/10 bg-yellow-50",  label: "اختبار" },
};

const FILTERS = [
  { id: "all",            label: "الكل" },
  { id: "unread",         label: "غير مقروء" },
  { id: "course",         label: "الكورسات" },
  { id: "problem_solved", label: "التحديات" },
  { id: "certificate",    label: "الشهادات" },
  { id: "badge",          label: "الأوسمة" },
  { id: "mention",        label: "الإشارات" },
  { id: "system",         label: "النظام" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "الآن";
  const m = Math.floor(s / 60);
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 30) return `منذ ${d} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const authHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include", headers: authHeaders() });
      if (!res.ok) return;
      setNotifs(await res.json() as Notification[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth/login");
  }, [user, authLoading, router]);

  useEffect(() => { if (user) fetchNotifs(); }, [user, fetchNotifs]);

  const markOne = async (id: number) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await fetch(`/api/notifications/${id}/read`, { method: "PUT", credentials: "include", headers: authHeaders() }).catch(() => {});
  };

  const markAll = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    await fetch("/api/notifications/read-all", { method: "PUT", credentials: "include", headers: authHeaders() }).catch(() => {});
  };

  const filtered = notifs.filter(n => {
    if (filter === "unread") return !n.isRead;
    if (filter === "all") return true;
    // group course-related types
    if (filter === "course") return ["course", "enrollment", "quiz_passed"].includes(n.type);
    // group challenge types
    if (filter === "problem_solved") return ["problem_solved", "streak", "level_up"].includes(n.type);
    return n.type === filter;
  });

  const unreadCount = notifs.filter(n => !n.isRead).length;

  if (authLoading) return null;

  return (
    <MainLayout>
      <div className="dark:bg-[#070b14] bg-slate-50 border-b dark:border-white/5 border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="dark:text-slate-500 text-slate-400 hover:text-cyan-500 transition-colors text-sm flex items-center gap-1">
              لوحة التحكم <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black dark:text-white text-slate-900">الإشعارات</h1>
                {unreadCount > 0
                  ? <p className="text-xs dark:text-slate-400 text-slate-500">{unreadCount} إشعار غير مقروء</p>
                  : <p className="text-xs dark:text-slate-400 text-slate-500">كل شيء مقروء ✓</p>}
              </div>
            </div>
            {unreadCount > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={markAll}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 text-xs dark:text-slate-300 text-slate-600 hover:text-cyan-500 hover:border-cyan-500/40 transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                قراءة الكل
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0",
                filter === f.id
                  ? "gradient-bg text-white shadow-md shadow-cyan-500/20"
                  : "dark:bg-white/5 bg-white border dark:border-white/8 border-slate-200 dark:text-slate-400 text-slate-600 hover:border-cyan-500/40 hover:text-cyan-500",
              )}
            >
              {f.label}
              {f.id === "unread" && unreadCount > 0 && (
                <span className="mr-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-400">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl dark:bg-white/3 bg-white border dark:border-white/5 border-slate-200 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-10 h-10 rounded-2xl dark:bg-white/5 bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 rounded dark:bg-white/5 bg-slate-100" />
                  <div className="h-3 w-3/4 rounded dark:bg-white/5 bg-slate-100" />
                  <div className="h-2.5 w-1/4 rounded dark:bg-white/5 bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl dark:bg-white/5 bg-slate-100 flex items-center justify-center">
              <BellOff className="w-7 h-7 dark:text-slate-500 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold dark:text-slate-400 text-slate-600 mb-1">
                {filter === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات"}
              </p>
              <p className="text-sm dark:text-slate-500 text-slate-400">
                {filter === "unread" ? "قرأت كل شيء!" : "ستظهر إشعاراتك هنا عند ورودها"}
              </p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filtered.map((n, i) => {
                const meta = TYPE_META[n.type] ?? TYPE_META.system;

                const handleClick = () => {
                  if (!n.isRead) markOne(n.id);
                  if (n.link) router.push(n.link);
                };

                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative group"
                  >
                    <div
                      role={n.link ? "button" : undefined}
                      tabIndex={n.link ? 0 : undefined}
                      onClick={n.link ? handleClick : undefined}
                      onKeyDown={n.link ? (e) => e.key === "Enter" && handleClick() : undefined}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-2xl border transition-all",
                        n.isRead
                          ? "dark:bg-[#0d1117] bg-white dark:border-white/5 border-slate-200 hover:border-slate-300 dark:hover:border-white/10"
                          : "dark:bg-[#111827] bg-slate-50 dark:border-white/10 border-slate-300 dark:hover:bg-white/5",
                        n.link && "cursor-pointer active:scale-[0.99]",
                      )}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                        {meta.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="px-1.5 py-0.5 text-[10px] rounded-md dark:bg-white/5 bg-slate-200 dark:text-slate-400 text-slate-500 font-medium">
                                {meta.label}
                              </span>
                              <p className={cn("text-sm font-semibold", n.isRead ? "dark:text-slate-300 text-slate-700" : "dark:text-white text-slate-900")}>
                                {n.title}
                              </p>
                            </div>
                            <p className="text-xs dark:text-slate-400 text-slate-500 leading-relaxed">
                              {n.body}
                            </p>
                          </div>
                          {!n.isRead && (
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0 mt-1 shadow-sm shadow-cyan-400/50" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-[11px] dark:text-slate-600 text-slate-400">{timeAgo(n.createdAt)}</p>
                          {n.link && (
                            <span className="text-[11px] text-cyan-500 flex items-center gap-0.5">
                              اضغط للانتقال ←
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mark as read button on hover */}
                    {!n.isRead && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markOne(n.id); }}
                        className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg dark:bg-white/10 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-500 text-[10px]"
                        title="تحديد كمقروء"
                      >
                        <Check className="w-3 h-3" />
                        مقروء
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </MainLayout>
  );
}
