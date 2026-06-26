"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/admin-roles";
import {
  ArrowRight, LogIn, LogOut, BookOpen, CheckSquare, Code2,
  Trophy, FolderOpen, Users, Heart, GitFork, MessageSquare,
  User, Star, Loader2, RefreshCw, Filter, Clock, ChevronDown,
  Activity, Shield, Calendar,
} from "lucide-react";

interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  entityType: string | null;
  entityId: number | null;
  entityTitle: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

interface StatsData {
  user: { id: number; name: string; email: string; username: string; avatar: string | null; role: string; points: number; level: string; createdAt: string } | null;
  stats: { enrollments: number; solvedChallenges: number; totalSubmissions: number; projects: number };
  actionCounts: Record<string, number>;
}

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  register:        { label: "تسجيل حساب",         icon: <User className="w-4 h-4" />,        color: "text-green-400",  bg: "bg-green-500/10" },
  login:           { label: "تسجيل دخول",          icon: <LogIn className="w-4 h-4" />,        color: "text-cyan-400",   bg: "bg-cyan-500/10" },
  logout:          { label: "تسجيل خروج",          icon: <LogOut className="w-4 h-4" />,       color: "text-slate-400",  bg: "bg-slate-500/10" },
  enroll_course:   { label: "انضم لكورس",           icon: <BookOpen className="w-4 h-4" />,     color: "text-violet-400", bg: "bg-violet-500/10" },
  view_lesson:     { label: "شاهد درساً",           icon: <CheckSquare className="w-4 h-4" />,  color: "text-blue-400",   bg: "bg-blue-500/10" },
  complete_lesson: { label: "أكمل درساً",           icon: <CheckSquare className="w-4 h-4" />,  color: "text-emerald-400",bg: "bg-emerald-500/10" },
  submit_challenge:{ label: "قدّم حلاً للتحدي",    icon: <Code2 className="w-4 h-4" />,        color: "text-orange-400", bg: "bg-orange-500/10" },
  solve_challenge: { label: "حلّ تحدياً بنجاح",    icon: <Trophy className="w-4 h-4" />,       color: "text-yellow-400", bg: "bg-yellow-500/10" },
  create_project:  { label: "أنشأ مشروعاً",         icon: <FolderOpen className="w-4 h-4" />,   color: "text-indigo-400", bg: "bg-indigo-500/10" },
  update_project:  { label: "عدّل مشروعاً",         icon: <FolderOpen className="w-4 h-4" />,   color: "text-indigo-300", bg: "bg-indigo-500/8" },
  publish_project: { label: "نشر مشروعاً",          icon: <Users className="w-4 h-4" />,        color: "text-pink-400",   bg: "bg-pink-500/10" },
  like_project:    { label: "أعجب بمشروع",          icon: <Heart className="w-4 h-4" />,        color: "text-rose-400",   bg: "bg-rose-500/10" },
  fork_project:    { label: "نسخ مشروع (fork)",     icon: <GitFork className="w-4 h-4" />,      color: "text-teal-400",   bg: "bg-teal-500/10" },
  run_code:        { label: "شغّل كوداً في الـ IDE", icon: <Code2 className="w-4 h-4" />,       color: "text-purple-400", bg: "bg-purple-500/10" },
  send_chat:       { label: "أرسل رسالة شات",       icon: <MessageSquare className="w-4 h-4" />,color: "text-sky-400",    bg: "bg-sky-500/10" },
  update_profile:  { label: "عدّل الملف الشخصي",    icon: <User className="w-4 h-4" />,         color: "text-amber-400",  bg: "bg-amber-500/10" },
};

const ALL_ACTIONS = Object.keys(ACTION_META);

function getToken(): string { return localStorage.getItem("nouvil_token") ?? ""; }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  if (h < 24) return `منذ ${h} ساعة`;
  if (d < 30) return `منذ ${d} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-EG");
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold dark:text-white text-slate-900">{value.toLocaleString("ar")}</p>
        <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function UserActivityPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const userId  = parseInt(id, 10);

  const [stats,   setStats]   = useState<StatsData | null>(null);
  const [logs,    setLogs]    = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter,  setFilter]  = useState("");

  const fetchStats = useCallback(async () => {
    const r = await fetch(`/api/admin/users/${userId}/activity/stats`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (r.ok) setStats(await r.json());
  }, [userId]);

  const fetchLogs = useCallback(async (before?: number, actionFilter?: string) => {
    const params = new URLSearchParams({ limit: "50" });
    if (before)       params.set("before", String(before));
    if (actionFilter) params.set("action", actionFilter);
    const r = await fetch(`/api/admin/users/${userId}/activity?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!r.ok) return [];
    const data: ActivityLog[] = await r.json();
    return data;
  }, [userId]);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchStats();
    const data = await fetchLogs(undefined, filter || undefined);
    setLogs(data);
    setHasMore(data.length === 50);
    setLoading(false);
  }, [fetchStats, fetchLogs, filter]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || logs.length === 0) return;
    setLoadingMore(true);
    const last = logs[logs.length - 1];
    const more = await fetchLogs(last.id, filter || undefined);
    setLogs(prev => [...prev, ...more]);
    setHasMore(more.length === 50);
    setLoadingMore(false);
  };

  const user = stats?.user;

  return (
    <AdminSectionGuard section="users">
      <div className="p-6 space-y-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:dark:bg-white/10 hover:bg-slate-200 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              سجل نشاط المستخدم
            </h1>
            {user && (
              <p className="text-sm dark:text-slate-400 text-slate-500 mt-0.5">
                {user.name} · @{user.username} · {user.email}
              </p>
            )}
          </div>
          <button onClick={load} className="mr-auto w-9 h-9 rounded-xl dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:dark:bg-white/10 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* User info card */}
            {user && (
              <div className="glass-card rounded-2xl p-5 flex flex-wrap items-center gap-5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden gradient-bg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : user.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold dark:text-white text-slate-900">{user.name}</h2>
                    <span className={`badge text-xs ${ROLE_COLORS[user.role] || "bg-slate-500/15 text-slate-400"}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                    <span className="badge text-xs bg-amber-500/10 text-amber-400 flex items-center gap-1">
                      <Star className="w-3 h-3" />{user.points?.toLocaleString("ar")} نقطة
                    </span>
                    <span className="badge text-xs dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600">{user.level}</span>
                  </div>
                  <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">@{user.username} · {user.email}</p>
                  <p className="text-xs dark:text-slate-500 text-slate-400 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    انضم {new Date(user.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                <Link href={`/profile/${user.username}`} target="_blank"
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                  <User className="w-3.5 h-3.5" /> الملف الشخصي
                </Link>
              </div>
            )}

            {/* Stats grid */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="كورسات مسجّل بها"   value={stats.stats.enrollments}      icon={<BookOpen className="w-6 h-6" />}  color="bg-violet-500/15 text-violet-400" />
                <StatCard label="تحديات محلولة"       value={stats.stats.solvedChallenges} icon={<Trophy className="w-6 h-6" />}    color="bg-yellow-500/15 text-yellow-400" />
                <StatCard label="محاولات الحل الكلية" value={stats.stats.totalSubmissions} icon={<Code2 className="w-6 h-6" />}     color="bg-orange-500/15 text-orange-400" />
                <StatCard label="مشاريع IDE"           value={stats.stats.projects}         icon={<FolderOpen className="w-6 h-6" />}color="bg-indigo-500/15 text-indigo-400" />
              </div>
            )}

            {/* Action breakdown */}
            {stats && Object.keys(stats.actionCounts).length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-sm font-semibold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" /> توزيع الأنشطة
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(stats.actionCounts).sort((a, b) => b[1] - a[1]).map(([action, total]) => {
                    const meta = ACTION_META[action];
                    if (!meta) return null;
                    return (
                      <button key={action} onClick={() => setFilter(f => f === action ? "" : action)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${filter === action ? meta.bg + " ring-1 ring-white/10" : "dark:hover:bg-white/5 hover:bg-slate-50"}`}>
                        <span className={meta.color}>{meta.icon}</span>
                        <span className="dark:text-slate-300 text-slate-600 flex-1 text-right">{meta.label}</span>
                        <span className={`font-bold tabular-nums ${meta.color}`}>{total}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter bar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm dark:text-slate-400 text-slate-500">
                <Filter className="w-4 h-4" />
                {filter ? (
                  <span className="flex items-center gap-1.5">
                    يعرض: <span className="text-cyan-400">{ACTION_META[filter]?.label ?? filter}</span>
                    <button onClick={() => setFilter("")} className="text-xs text-red-400 hover:text-red-300 mr-1">✕ مسح</button>
                  </span>
                ) : (
                  <span>كل الأنشطة ({logs.length}+)</span>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="glass-card rounded-2xl overflow-hidden">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 dark:text-slate-500 text-slate-400">
                  <Activity className="w-10 h-10 mb-3 opacity-50" />
                  <p className="text-sm">لا يوجد نشاط مسجّل حتى الآن</p>
                </div>
              ) : (
                <div className="divide-y dark:divide-white/5 divide-slate-100">
                  {logs.map((log, i) => {
                    const meta = ACTION_META[log.action] ?? { label: log.action, icon: <Clock className="w-4 h-4" />, color: "text-slate-400", bg: "bg-slate-500/10" };
                    const meta2 = log.metadata as Record<string, unknown> | null;
                    return (
                      <motion.div key={log.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.015, 0.3) }}
                        className="flex items-start gap-4 px-5 py-3.5 hover:dark:bg-white/3 hover:bg-slate-50 transition-colors">
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.bg}`}>
                          <span className={meta.color}>{meta.icon}</span>
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                            {log.entityTitle && (
                              <span className="text-xs dark:text-slate-300 text-slate-600 bg-black/10 dark:bg-white/5 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                                {log.entityTitle}
                              </span>
                            )}
                            {log.action === "solve_challenge" && (meta2 as Record<string, unknown> | null)?.points !== undefined && (
                              <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                                +{String((meta2 as Record<string, unknown> | null)?.points ?? 0)} نقطة
                              </span>
                            )}
                            {log.action === "submit_challenge" && (meta2 as Record<string, unknown> | null)?.status !== undefined && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${(meta2 as Record<string, unknown> | null)?.status === "accepted" ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>
                                {(meta2 as Record<string, unknown> | null)?.status === "accepted" ? "✓ مقبول" : "✗ مرفوض"}
                              </span>
                            )}
                            {(log.action === "run_code" || log.action === "submit_challenge" || log.action === "solve_challenge") && (meta2 as Record<string, unknown> | null)?.language !== undefined && (
                              <span className="text-[10px] font-mono dark:text-slate-500 text-slate-400 bg-black/10 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                {String((meta2 as Record<string, unknown> | null)?.language ?? "")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs dark:text-slate-500 text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{timeAgo(log.createdAt)}
                            </span>
                            <span className="text-xs dark:text-slate-600 text-slate-400">
                              {new Date(log.createdAt).toLocaleString("ar-EG")}
                            </span>
                            {log.ip && log.ip !== "unknown" && (
                              <span className="text-[10px] font-mono dark:text-slate-600 text-slate-400">{log.ip}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Load more */}
              {hasMore && logs.length > 0 && (
                <div className="flex justify-center py-4 border-t dark:border-white/5 border-slate-100">
                  <button onClick={loadMore} disabled={loadingMore}
                    className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50">
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                    تحميل المزيد
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminSectionGuard>
  );
}
