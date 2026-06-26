"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, BookOpen, Code2, Award, Newspaper, Shield,
  TrendingUp, Zap, Globe, GraduationCap, Layers, Star,
  Activity, Wifi, RefreshCw, FileText, FolderOpen, CheckCircle,
  Terminal, ChevronRight, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Analytics {
  onlineNow: number;
  users: {
    total: number; verified: number; byRole: Record<string, number>;
    newThisMonth: number; newThisWeek: number;
    growthChart: { date: string; مستخدمين: number }[];
  };
  courses: {
    total: number; published: number; draft: number; paid: number; free: number;
    totalEnrollments: number; totalLessons: number; completedLessons: number; completedCourses: number;
    byCategory: { name: string; value: number }[];
    byLevel: { name: string; value: number }[];
    topCourses: { name: string; students: number; level: string }[];
  };
  challenges: {
    totalProblems: number; published: number;
    byDifficulty: { name: string; value: number }[];
    totalSubmissions: number; accepted: number; acceptanceRate: number;
    totalTracks: number; totalPacks: number; dailyChallenges: number;
    dailyParticipants: number; solutions: number; duels: number;
  };
  badges: {
    total: number; awarded: number;
    top: { name: string; icon: string; count: number }[];
  };
  school: { languages: number; chapters: number; topics: number };
  articles: {
    total: number; published: number; draft: number;
    byCategory: { name: string; value: number }[];
  };
  community: { total: number; public: number; totalStars: number };
  certificates: { defined: number; issued: number };
  ide: { totalProjects: number; totalExecutions: number };
  security: { totalEvents: number; activeBans: number };
  recentActivity: {
    id: number; userId: number; action: string; ip: string;
    createdAt: string; metadata: Record<string, unknown> | null;
    userName: string | null; userAvatar: string | null;
  }[];
}

// ── Color palettes ────────────────────────────────────────────────────────────
const PIE_COLORS  = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6"];
const DIFF_COLORS: Record<string, string> = {
  easy: "#10b981", medium: "#f59e0b", hard: "#ef4444",
  سهل: "#10b981", متوسط: "#f59e0b", صعب: "#ef4444",
};
const LEVEL_COLORS: Record<string, string> = {
  مبتدئ: "#06b6d4", متوسط: "#8b5cf6", متقدم: "#ef4444", "جميع المستويات": "#10b981",
};

// ── Activity action labels ─────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  register:       { label: "تسجيل جديد",     icon: <Users className="w-3.5 h-3.5" />,     color: "text-cyan-400 bg-cyan-500/15" },
  login:          { label: "تسجيل دخول",     icon: <CheckCircle className="w-3.5 h-3.5" />, color: "text-green-400 bg-green-500/15" },
  enroll:         { label: "تسجيل بكورس",    icon: <BookOpen className="w-3.5 h-3.5" />,    color: "text-violet-400 bg-violet-500/15" },
  solve:          { label: "حل مسألة",        icon: <Code2 className="w-3.5 h-3.5" />,       color: "text-amber-400 bg-amber-500/15" },
  password_reset: { label: "تغيير كلمة مرور", icon: <Shield className="w-3.5 h-3.5" />,     color: "text-orange-400 bg-orange-500/15" },
  profile_update: { label: "تحديث الملف",    icon: <Users className="w-3.5 h-3.5" />,       color: "text-blue-400 bg-blue-500/15" },
  complete_lesson:{ label: "إتمام درس",       icon: <GraduationCap className="w-3.5 h-3.5" />, color: "text-pink-400 bg-pink-500/15" },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? { label: action, icon: <Activity className="w-3.5 h-3.5" />, color: "text-slate-400 bg-slate-500/15" };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

// ── Skeleton loader ──────────────────────────────────────────────────────────
function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse dark:bg-white/8 bg-slate-200 rounded-lg", className)} />;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiProps {
  icon: React.ReactNode; label: string; value: number | string;
  sub?: string; color: string; bg: string; pulse?: boolean; delay?: number;
}
function KpiCard({ icon, label, value, sub, color, bg, pulse, delay = 0 }: KpiProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="relative dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/8 border-slate-200 p-5 overflow-hidden group hover:shadow-lg transition-shadow"
    >
      {pulse && (
        <span className="absolute top-3 left-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", bg, color)}>
          {icon}
        </div>
      </div>
      <div className={cn("text-2xl font-black mb-0.5", color)}>
        {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
      </div>
      <p className="dark:text-slate-300 text-slate-700 text-sm font-medium">{label}</p>
      {sub && <p className="dark:text-slate-500 text-slate-400 text-xs mt-0.5">{sub}</p>}
      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl", "bg-gradient-to-br from-transparent to-current/3")} />
    </motion.div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, color, children, delay = 0 }: {
  title: string; icon: React.ReactNode; color: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/8 border-slate-200 p-6"
    >
      <h2 className={cn("font-bold dark:text-white text-slate-900 mb-5 flex items-center gap-2 text-base", color)}>
        {icon}{title}
      </h2>
      {children}
    </motion.div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dark:bg-[#1e293b] bg-white border dark:border-white/10 border-slate-200 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="dark:text-slate-400 text-slate-500 mb-1" dir="ltr">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>{p.name}: {p.value.toLocaleString("ar-EG")}</p>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const d = await api.get<Analytics>("/admin/analytics");
      setData(d);
      setLastUpdated(new Date());
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const n = data;

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Sk className="h-7 w-40 mb-2" /><Sk className="h-4 w-56" /></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-28" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Sk className="h-72" /><Sk className="h-72" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Sk className="h-64" /><Sk className="h-64" /><Sk className="h-64" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black dark:text-white text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            نظرة عامة على المنصة
          </h1>
          <p className="dark:text-slate-400 text-slate-500 text-sm mt-0.5">
            مرحباً <span className="text-cyan-400 font-semibold">{user?.name}</span>
            {lastUpdated && <span className="mr-2 text-xs dark:text-slate-600 text-slate-400">• آخر تحديث {lastUpdated.toLocaleTimeString("ar-EG")}</span>}
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl dark:bg-white/5 bg-slate-100 text-sm dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} /> تحديث
        </button>
      </div>

      {/* ── Top KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard delay={0}    icon={<Users className="w-5 h-5" />}       label="المستخدمون"       value={n?.users.total ?? 0}              sub={`+${n?.users.newThisWeek ?? 0} هذا الأسبوع`} color="text-cyan-400"   bg="bg-cyan-500/10"   />
        <KpiCard delay={0.05} icon={<Wifi className="w-5 h-5" />}        label="أونلاين الآن"     value={n?.onlineNow ?? 0}                sub="مستخدم متصل"                              color="text-green-400" bg="bg-green-500/10"  pulse />
        <KpiCard delay={0.1}  icon={<BookOpen className="w-5 h-5" />}    label="الكورسات"         value={n?.courses.published ?? 0}        sub={`${n?.courses.totalEnrollments ?? 0} تسجيل`} color="text-violet-400" bg="bg-violet-500/10" />
        <KpiCard delay={0.15} icon={<Code2 className="w-5 h-5" />}       label="التحديات"         value={n?.challenges.published ?? 0}     sub={`${n?.challenges.totalSubmissions ?? 0} محاولة`} color="text-amber-400" bg="bg-amber-500/10" />
        <KpiCard delay={0.2}  icon={<Newspaper className="w-5 h-5" />}   label="المقالات"         value={n?.articles.published ?? 0}       sub={`${n?.articles.total ?? 0} إجمالي`}          color="text-rose-400"  bg="bg-rose-500/10"  />
        <KpiCard delay={0.25} icon={<Shield className="w-5 h-5" />}      label="بانات نشطة"       value={n?.security.activeBans ?? 0}      sub={`${n?.security.totalEvents ?? 0} حدث أمني`}  color="text-orange-400" bg="bg-orange-500/10" />
      </div>

      {/* ── User Growth Chart + Online / Registration stats ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="نمو المستخدمين — آخر 30 يوم" icon={<TrendingUp className="w-4 h-4" />} color="text-cyan-400" delay={0.3} >
          <div className="lg:col-span-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={n?.users.growthChart ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="مستخدمين" stroke="#06b6d4" strokeWidth={2} fill="url(#userGrad)" dot={false} activeDot={{ r: 4, fill: "#06b6d4" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="توزيع صعوبة التحديات" icon={<Code2 className="w-4 h-4" />} color="text-amber-400" delay={0.35}>
          <div className="h-52 flex flex-col gap-3 justify-center">
            {(n?.challenges.byDifficulty ?? []).map((d) => {
              const total = n?.challenges.byDifficulty.reduce((s, x) => s + x.value, 0) || 1;
              const pct = Math.round((d.value / total) * 100);
              const color = DIFF_COLORS[d.name] ?? "#06b6d4";
              return (
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="dark:text-slate-300 text-slate-700 font-medium">{d.name}</span>
                    <span className="font-bold" style={{ color }}>{d.value.toLocaleString("ar-EG")} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 dark:bg-white/8 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="mt-2 pt-2 border-t dark:border-white/5 border-slate-100 grid grid-cols-3 text-center">
              <div>
                <p className="text-xs font-black text-amber-400">{n?.challenges.acceptanceRate ?? 0}%</p>
                <p className="text-[10px] dark:text-slate-500 text-slate-400">نسبة القبول</p>
              </div>
              <div>
                <p className="text-xs font-black text-cyan-400">{(n?.challenges.totalSubmissions ?? 0).toLocaleString("ar-EG")}</p>
                <p className="text-[10px] dark:text-slate-500 text-slate-400">محاولة</p>
              </div>
              <div>
                <p className="text-xs font-black text-green-400">{(n?.challenges.accepted ?? 0).toLocaleString("ar-EG")}</p>
                <p className="text-[10px] dark:text-slate-500 text-slate-400">مقبولة</p>
              </div>
            </div>
          </div>
        </Section>

        <Section title="الكورسات حسب المستوى" icon={<Layers className="w-4 h-4" />} color="text-violet-400" delay={0.4}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%" innerRadius="25%" outerRadius="90%"
                data={(n?.courses.byLevel ?? []).map(l => ({ ...l, fill: LEVEL_COLORS[l.name] ?? "#06b6d4" }))}
              >
                <RadialBar dataKey="value" cornerRadius={6} label={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs dark:text-slate-300 text-slate-600">{v}</span>} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* ── Courses by Category + Top Courses ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="التسجيلات حسب تصنيف الكورس" icon={<BookOpen className="w-4 h-4" />} color="text-violet-400" delay={0.45}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={n?.courses.byCategory ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} angle={-30} textAnchor="end" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="كورسات" radius={[6, 6, 0, 0]}>
                  {(n?.courses.byCategory ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="أكثر 5 كورسات تسجيلاً" icon={<Star className="w-4 h-4" />} color="text-amber-400" delay={0.5}>
          <div className="space-y-3">
            {(n?.courses.topCourses ?? []).length === 0 && (
              <p className="text-sm dark:text-slate-500 text-slate-400 text-center py-8">لا توجد بيانات</p>
            )}
            {(n?.courses.topCourses ?? []).map((c, i) => {
              const max = n?.courses.topCourses[0]?.students || 1;
              const pct = Math.round((c.students / max) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg dark:bg-white/5 bg-slate-100 text-xs font-black dark:text-slate-400 text-slate-500 flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="dark:text-slate-200 text-slate-800 font-medium truncate max-w-[180px]">{c.name}</span>
                      <span className="text-amber-400 font-bold mr-2">{c.students}</span>
                    </div>
                    <div className="h-1.5 dark:bg-white/8 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t dark:border-white/5 border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-sm font-black text-violet-400">{n?.courses.totalLessons ?? 0}</p><p className="text-[10px] dark:text-slate-500 text-slate-400">درس</p></div>
            <div><p className="text-sm font-black text-cyan-400">{n?.courses.totalEnrollments ?? 0}</p><p className="text-[10px] dark:text-slate-500 text-slate-400">تسجيل</p></div>
            <div><p className="text-sm font-black text-green-400">{n?.courses.completedLessons ?? 0}</p><p className="text-[10px] dark:text-slate-500 text-slate-400">درس مكتمل</p></div>
          </div>
        </Section>
      </div>

      {/* ── Articles by Category + Challenges Stats ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="المقالات حسب التصنيف" icon={<Newspaper className="w-4 h-4" />} color="text-rose-400" delay={0.55}>
          <div className="h-56 flex gap-4">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={n?.articles.byCategory.length ? n.articles.byCategory : [{ name: "لا توجد بيانات", value: 1 }]}
                    cx="50%" cy="50%" outerRadius="80%" innerRadius="45%"
                    dataKey="value" paddingAngle={3}
                  >
                    {(n?.articles.byCategory ?? []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 justify-center text-xs w-32">
              {(n?.articles.byCategory ?? []).slice(0, 6).map((c, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="dark:text-slate-300 text-slate-700 truncate">{c.name}</span>
                  <span className="font-bold dark:text-slate-400 text-slate-500 mr-auto">{c.value}</span>
                </div>
              ))}
              {!n?.articles.byCategory.length && <p className="dark:text-slate-500 text-slate-400 text-center">لا توجد بيانات</p>}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t dark:border-white/5 border-slate-100 flex gap-4 text-center">
            <div className="flex-1"><p className="text-lg font-black text-rose-400">{n?.articles.published ?? 0}</p><p className="text-xs dark:text-slate-500 text-slate-400">منشورة</p></div>
            <div className="flex-1"><p className="text-lg font-black dark:text-slate-400 text-slate-500">{n?.articles.draft ?? 0}</p><p className="text-xs dark:text-slate-500 text-slate-400">مسودة</p></div>
            <div className="flex-1"><p className="text-lg font-black text-cyan-400">{n?.articles.total ?? 0}</p><p className="text-xs dark:text-slate-500 text-slate-400">إجمالي</p></div>
          </div>
        </Section>

        <Section title="إحصائيات التحديات المفصّلة" icon={<Zap className="w-4 h-4" />} color="text-amber-400" delay={0.6}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "المسارات",       value: n?.challenges.totalTracks ?? 0,      color: "text-cyan-400",   bg: "dark:bg-cyan-500/8 bg-cyan-50" },
              { label: "الحزم",          value: n?.challenges.totalPacks ?? 0,       color: "text-violet-400", bg: "dark:bg-violet-500/8 bg-violet-50" },
              { label: "التحدي اليومي", value: n?.challenges.dailyChallenges ?? 0,  color: "text-amber-400",  bg: "dark:bg-amber-500/8 bg-amber-50" },
              { label: "المشاركون اليومي", value: n?.challenges.dailyParticipants ?? 0, color: "text-green-400", bg: "dark:bg-green-500/8 bg-green-50" },
              { label: "الحلول المنشورة", value: n?.challenges.solutions ?? 0,      color: "text-rose-400",   bg: "dark:bg-rose-500/8 bg-rose-50" },
              { label: "المبارزات",      value: n?.challenges.duels ?? 0,           color: "text-orange-400", bg: "dark:bg-orange-500/8 bg-orange-50" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.65 + i * 0.05 }}
                className={cn("rounded-xl p-3 text-center", item.bg)}
              >
                <p className={cn("text-xl font-black", item.color)}>{item.value.toLocaleString("ar-EG")}</p>
                <p className="text-[11px] dark:text-slate-400 text-slate-600 mt-0.5">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Platform Modules row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "مدرسة المبرمجين", icon: <Globe className="w-5 h-5" />, color: "text-emerald-400", bg: "bg-emerald-500/10",
            stats: [{ l: "لغات", v: n?.school.languages ?? 0 }, { l: "فصول", v: n?.school.chapters ?? 0 }, { l: "مواضيع", v: n?.school.topics ?? 0 }] },
          { title: "الشارات", icon: <Award className="w-5 h-5" />, color: "text-amber-400", bg: "bg-amber-500/10",
            stats: [{ l: "شارات", v: n?.badges.total ?? 0 }, { l: "ممنوحة", v: n?.badges.awarded ?? 0 }, { l: "المستخدمون", v: n?.users.total ?? 0 }] },
          { title: "الشهادات", icon: <GraduationCap className="w-5 h-5" />, color: "text-cyan-400", bg: "bg-cyan-500/10",
            stats: [{ l: "محددة", v: n?.certificates.defined ?? 0 }, { l: "مُصدَرة", v: n?.certificates.issued ?? 0 }, { l: "نسبة", v: `${n?.certificates.defined ? Math.round(((n?.certificates.issued ?? 0) / n.certificates.defined) * 100) : 0}%` }] },
          { title: "مشاريع المجتمع", icon: <FolderOpen className="w-5 h-5" />, color: "text-violet-400", bg: "bg-violet-500/10",
            stats: [{ l: "إجمالي", v: n?.community.total ?? 0 }, { l: "عامة", v: n?.community.public ?? 0 }, { l: "نجوم", v: n?.community.totalStars ?? 0 }] },
          { title: "Cloud IDE", icon: <Terminal className="w-5 h-5" />, color: "text-rose-400", bg: "bg-rose-500/10",
            stats: [{ l: "مشاريع", v: n?.ide.totalProjects ?? 0 }, { l: "تنفيذات", v: n?.ide.totalExecutions ?? 0 }, { l: "أمان", v: n?.security.activeBans ?? 0 }] },
          { title: "المستخدمون", icon: <Users className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-500/10",
            stats: [{ l: "موثّقون", v: n?.users.verified ?? 0 }, { l: "جديد/شهر", v: n?.users.newThisMonth ?? 0 }, { l: "أونلاين", v: n?.onlineNow ?? 0 }] },
        ].map((mod, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.05 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/8 border-slate-200 p-4"
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", mod.bg, mod.color)}>
              {mod.icon}
            </div>
            <p className="text-xs font-bold dark:text-white text-slate-900 mb-3">{mod.title}</p>
            <div className="space-y-2">
              {mod.stats.map((s, j) => (
                <div key={j} className="flex justify-between text-xs">
                  <span className="dark:text-slate-500 text-slate-400">{s.l}</span>
                  <span className={cn("font-bold", mod.color)}>{typeof s.v === "number" ? s.v.toLocaleString("ar-EG") : s.v}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Top Badges + Recent Activity ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="أكثر الشارات منحاً" icon={<Award className="w-4 h-4" />} color="text-amber-400" delay={0.85}>
          {(n?.badges.top ?? []).length === 0 ? (
            <p className="text-sm dark:text-slate-500 text-slate-400 text-center py-8">لا توجد شارات بعد</p>
          ) : (
            <div className="space-y-3">
              {(n?.badges.top ?? []).map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-2xl w-9 h-9 flex items-center justify-center dark:bg-white/5 bg-slate-50 rounded-xl">{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-slate-200 text-slate-800">{b.name}</p>
                    <div className="h-1.5 dark:bg-white/8 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((b.count / ((n?.badges.top[0]?.count || 1))) * 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.9 + i * 0.1 }}
                        className="h-full bg-amber-400 rounded-full"
                      />
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-400 w-10 text-left">{b.count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="آخر النشاطات" icon={<Activity className="w-4 h-4" />} color="text-cyan-400" delay={0.9}>
          {(n?.recentActivity ?? []).length === 0 ? (
            <p className="text-sm dark:text-slate-500 text-slate-400 text-center py-8">لا توجد نشاطات حديثة</p>
          ) : (
            <div className="space-y-0 divide-y dark:divide-white/5 divide-slate-100 max-h-72 overflow-y-auto">
              <AnimatePresence>
                {(n?.recentActivity ?? []).map((act, i) => {
                  const cfg = getActionConfig(act.action);
                  return (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.95 + i * 0.03 }}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", cfg.color)}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold dark:text-slate-200 text-slate-800 truncate">
                            {act.userName ?? "مستخدم"}
                          </span>
                          <span className="text-[10px] dark:text-slate-500 text-slate-400">{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] dark:text-slate-600 text-slate-400 mt-0.5">
                          <span dir="ltr" className="font-mono">{act.ip !== "unknown" ? act.ip : ""}</span>
                          <span className="mr-auto">{timeAgo(act.createdAt as unknown as string)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </Section>
      </div>

      {/* ── User roles breakdown ── */}
      <Section title="توزيع أدوار المستخدمين" icon={<Users className="w-4 h-4" />} color="text-blue-400" delay={1.0}>
        <div className="flex flex-wrap gap-3">
          {Object.entries(n?.users.byRole ?? {}).map(([role, cnt], i) => {
            const roleAr: Record<string, string> = {
              user: "مستخدم", admin: "أدمن", super_admin: "سوبر أدمن",
              content_admin: "محرر محتوى", users_admin: "مشرف مستخدمين", articles_admin: "محرر مقالات",
            };
            const total = Object.values(n?.users.byRole ?? {}).reduce((a, b) => a + b, 0) || 1;
            const pct = Math.round((cnt / total) * 100);
            return (
              <div key={role} className="flex items-center gap-2 dark:bg-white/5 bg-slate-50 rounded-xl px-3 py-2.5">
                <Circle className="w-2 h-2" style={{ color: PIE_COLORS[i % PIE_COLORS.length], fill: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs dark:text-slate-300 text-slate-700">{roleAr[role] ?? role}</span>
                <span className="text-xs font-black" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{cnt.toLocaleString("ar-EG")}</span>
                <span className="text-[10px] dark:text-slate-600 text-slate-400">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
