"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Trophy, Star, Target, BookOpen, TrendingUp, Award, Code2,
  ChevronRight, Loader2, Flame, Zap, Settings, Play, CheckCircle,
  Clock, BookMarked, BarChart3, Activity, Medal, Download, ExternalLink,
  FolderOpen, Edit3, Trash2, Plus, Calendar, Tag, FolderCheck,
  Globe, Lock, X, RefreshCw, Save,
} from "lucide-react";

interface UserStats {
  points: number;
  rank: number;
  completedCourses: number;
  enrolledCourses: number;
  solvedProblems: number;
  level: string;
  badges: string[];
}

interface EnrolledCourse {
  id: number;
  title: string;
  category: string;
  level: string;
  progress: number;
  completedLessons: number;
  thumbnail?: string | null;
  completedAt?: string | null;
}

interface ActivityItem {
  type: "submission" | "enrollment";
  status: string;
  title: string;
  problemId?: number | null;
  courseId?: number | null;
  language?: string | null;
  createdAt: string;
}

interface UserCertificate {
  id: number;
  uniqueCode: string;
  issuedAt: string;
  courseTitle: string;
  certTitle: string;
  certType: string;
}

interface UserProject {
  id: number;
  name: string;
  description: string;
  tags: string[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Edit Project Modal ─────────────────────────────────────────────────────────
function EditProjectModal({ project, onClose, onSaved }: {
  project: UserProject;
  onClose: () => void;
  onSaved: (updated: UserProject) => void;
}) {
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description ?? "");
  const [howItWorks, setHowItWorks] = useState("");
  const [requirements, setRequirements] = useState("");
  const [isPublic, setIsPublic] = useState(project.isPublic ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`/api/projects/${project.id}`, { headers, credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setHowItWorks(d.how_it_works ?? "");
          setRequirements(d.requirements ?? "");
          setIsPublic(d.is_public ?? false);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMeta(false));
  }, [project.id]);

  const save = async () => {
    if (!name.trim()) { setError("أدخل اسم المشروع"); return; }
    setSaving(true); setError("");
    try {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/projects/${project.id}/metadata`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), description: desc.trim(), howItWorks: howItWorks.trim(), requirements: requirements.trim(), isPublic }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "فشل التحديث"); return; }
      onSaved({ ...project, name: name.trim(), description: desc.trim(), isPublic });
    } catch (e) { setError("فشل الاتصال: " + String(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-[#111827] border border-violet-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Edit3 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-white font-black">تعديل بيانات المشروع</h3>
            <p className="text-xs text-slate-500">تعديل المعلومات فقط — الملفات لن تتأثر</p>
          </div>
          <button onClick={onClose} className="mr-auto text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {loadingMeta ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">اسم المشروع *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors"
                dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">وصف مختصر</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors resize-none"
                dir="rtl" />
            </div>

            {/* Public toggle */}
            <button type="button" onClick={() => setIsPublic(v => !v)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isPublic ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPublic ? "bg-cyan-500/25" : "bg-white/5"}`}>
                {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div className="text-right flex-1">
                <p className="text-xs font-bold">{isPublic ? "مشروع عام" : "مشروع خاص"}</p>
                <p className="text-[10px] opacity-60 mt-0.5">{isPublic ? "يظهر في مجتمع المطورين" : "لك فقط"}</p>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${isPublic ? "bg-cyan-500" : "bg-white/15"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isPublic ? "right-0.5" : "left-0.5"}`} />
              </div>
            </button>

            {/* Extra docs fields */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">كيف يعمل المشروع؟ (اختياري)</label>
              <textarea value={howItWorks} onChange={e => setHowItWorks(e.target.value)} rows={3}
                placeholder="اشرح آلية عمل مشروعك..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors resize-none"
                dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">المتطلبات (اختياري)</label>
              <textarea value={requirements} onChange={e => setRequirements(e.target.value)} rows={2}
                placeholder="مثال: متصفح حديث، Python 3.8+"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors resize-none"
                dir="rtl" />
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </button>
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold transition-colors border border-white/10">
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const statusLabels: Record<string, { label: string; color: string }> = {
  accepted: { label: "مقبول", color: "text-green-400" },
  wrong_answer: { label: "خاطئ", color: "text-red-400" },
  pending: { label: "قيد المراجعة", color: "text-amber-400" },
  error: { label: "خطأ في الكود", color: "text-orange-400" },
  enrolled: { label: "سجّل في كورس", color: "text-cyan-400" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (h < 1) return "منذ قليل";
  if (h < 24) return `منذ ${h} ساعة`;
  if (d < 30) return `منذ ${d} يوم`;
  return `منذ ${Math.floor(d / 30)} شهر`;
}

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;
}

// ── My Projects Section ───────────────────────────────────────────────────────
function MyProjectsSection() {
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<UserProject | null>(null);

  useEffect(() => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch("/api/projects", { headers, credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const deleteProject = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المشروع؟")) return;
    setDeleting(id);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE", headers, credentials: "include" });
      if (res.ok) setProjects(prev => prev.filter(p => p.id !== id));
    } finally { setDeleting(null); }
  };

  const tagColors = [
    "bg-violet-500/15 text-violet-300 border-violet-500/20",
    "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
    "bg-green-500/15 text-green-300 border-green-500/20",
    "bg-amber-500/15 text-amber-300 border-amber-500/20",
    "bg-pink-500/15 text-pink-300 border-pink-500/20",
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black dark:text-white text-slate-900 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-violet-400" /> مشاريعي
        </h2>
        <Link href="/cloud-ide"
          className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/40 rounded-lg px-3 py-1.5">
          <Plus className="w-3.5 h-3.5" /> مشروع جديد
        </Link>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-10 text-center">
          <FolderCheck className="w-14 h-14 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
          <p className="dark:text-slate-400 text-slate-500 mb-2 font-semibold">لا يوجد مشاريع محفوظة بعد</p>
          <p className="dark:text-slate-600 text-slate-400 text-xs mb-5">افتح محرر الكود وابدأ مشروعاً، ثم احفظه هنا</p>
          <Link href="/cloud-ide"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
            <Code2 className="w-4 h-4" /> افتح محرر الكود
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {projects.map((proj, i) => (
            <motion.div key={proj.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Code2 className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold dark:text-white text-slate-900 truncate text-sm group-hover:text-violet-400 transition-colors">
                    {proj.name}
                  </p>
                  {proj.description && (
                    <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5 line-clamp-1">{proj.description}</p>
                  )}
                  {/* Tags */}
                  {proj.tags && proj.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {proj.tags.map((tag, ti) => (
                        <span key={ti} className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${tagColors[ti % tagColors.length]}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-[10px] dark:text-slate-600 text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>آخر تحديث: {timeAgo(proj.updatedAt)}</span>
                  </div>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t dark:border-white/5 border-slate-100">
                <Link href={`/cloud-ide?projectId=${proj.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 hover:text-violet-200 text-xs font-bold transition-colors border border-violet-500/20">
                  <Edit3 className="w-3.5 h-3.5" /> فتح في المحرر
                </Link>
                <button
                  onClick={() => setEditingProject(proj)}
                  title="تعديل البيانات"
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-500/20">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteProject(proj.id)}
                  disabled={deleting === proj.id}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20 disabled:opacity-50">
                  {deleting === proj.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSaved={(updated) => {
            setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [certificates, setCertificates] = useState<UserCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<UserStats>("/users/stats"),
      api.get<{ courses: EnrolledCourse[] }>("/users/enrolled-courses"),
      api.get<ActivityItem[]>("/users/activity"),
      api.get<UserCertificate[]>("/my/certificates").catch(() => []),
    ])
      .then(([s, c, a, certs]) => {
        setStats(s);
        setEnrolledCourses(c.courses || []);
        setActivity(a || []);
        setCertificates(certs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center dark:bg-[#0a0f1e] bg-slate-50">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const level          = stats?.level || user.level || "مبتدئ";
  const points         = stats?.points ?? user.points ?? 0;
  const nextLevelPoints = 500;
  const levelProgress  = Math.min((points % nextLevelPoints) / nextLevelPoints * 100, 100);
  const inProgressCourses = enrolledCourses.filter(c => !c.completedAt);

  const statCards = [
    { icon: <Star className="w-5 h-5" />, label: "النقاط", value: points.toLocaleString("ar-EG"), color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { icon: <Trophy className="w-5 h-5" />, label: "الترتيب", value: stats ? `#${stats.rank}` : "—", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
    { icon: <BookOpen className="w-5 h-5" />, label: "الكورسات المكتملة", value: stats?.completedCourses ?? 0, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
    { icon: <Code2 className="w-5 h-5" />, label: "المسائل المحلولة", value: stats?.solvedProblems ?? 0, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        {/* Header */}
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 flex-wrap">
              <div className="w-14 h-14 rounded-2xl overflow-hidden gradient-bg flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-cyan-500/30 flex-shrink-0">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : user.name?.charAt(0) || "م"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="dark:text-slate-400 text-slate-500 text-xs">مرحباً بك يا</p>
                <h1 className="text-xl font-black dark:text-white text-slate-900 truncate">{user.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs dark:text-slate-500 text-slate-400">@{user.username}</span>
                  <span className="px-2 py-0.5 text-xs rounded-full dark:bg-cyan-500/20 dark:text-cyan-300 bg-cyan-50 text-cyan-700 border dark:border-cyan-500/20 border-cyan-200">{level}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400 font-bold text-xs">٧ أيام متواصلة</span>
                </div>
                <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-all text-sm">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:block">الإعدادات</span>
                </Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="mt-5 p-4 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="dark:text-slate-400 text-slate-500 flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5" /> مستوى التقدم — {level}
                </span>
                <span className="dark:text-slate-400 text-slate-500">{points % nextLevelPoints}/{nextLevelPoints} نقطة للمستوى التالي</span>
              </div>
              <div className="relative h-2 dark:bg-white/10 bg-slate-200 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} transition={{ duration: 1, delay: 0.4 }}
                  className="absolute inset-y-0 right-0 gradient-bg rounded-full" />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className={`dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 hover:${s.border} hover:border transition-all`}>
                <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
                <div className={`text-2xl font-black ${s.color} mb-1`}>
                  {loading ? <div className="h-7 w-12 dark:bg-white/10 bg-slate-200 rounded animate-pulse" /> : s.value}
                </div>
                <p className="dark:text-slate-500 text-slate-400 text-xs">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Main 3-col layout */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left 2 cols */}
            <div className="lg:col-span-2 space-y-6">

              {/* ── My Projects ── */}
              <MyProjectsSection />

              {/* ── Enrolled Courses ── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black dark:text-white text-slate-900 flex items-center gap-2">
                    <BookMarked className="w-5 h-5 text-cyan-400" /> كورساتي الحالية
                  </h2>
                  <Link href="/my-courses" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                    عرض الكل ({enrolledCourses.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <div key={i} className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 animate-pulse h-16" />)}
                  </div>
                ) : inProgressCourses.length === 0 ? (
                  <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-8 text-center">
                    <BookOpen className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
                    <p className="dark:text-slate-400 text-slate-500 mb-4 text-sm">لم تبدأ أي كورس بعد</p>
                    <Link href="/courses" className="btn-primary inline-flex"><Zap className="w-4 h-4" /> استعرض الكورسات</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inProgressCourses.slice(0, 4).map((course, i) => (
                      <motion.div key={course.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                        <div className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 hover:border-cyan-500/30 hover:shadow-md hover:shadow-cyan-500/5 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl dark:bg-cyan-500/10 bg-cyan-50 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold dark:text-white text-slate-900 truncate text-sm group-hover:text-cyan-400 transition-colors">{course.title}</p>
                              <p className="text-xs dark:text-slate-500 text-slate-400">{course.category}</p>
                              <div className="mt-1.5 relative h-1.5 dark:bg-white/10 bg-slate-200 rounded-full overflow-hidden">
                                <div className="absolute inset-y-0 right-0 gradient-bg rounded-full transition-all" style={{ width: `${course.progress}%` }} />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-bold text-cyan-400">{course.progress}%</span>
                              <Link href={`/courses/${course.id}/learn`}
                                className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white hover:scale-110 transition-transform"
                                onClick={e => e.stopPropagation()}>
                                <Play className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Activity Feed ── */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-violet-400" />
                  <h2 className="text-lg font-black dark:text-white text-slate-900">النشاط الأخير</h2>
                </div>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-3 animate-pulse h-12" />)}
                  </div>
                ) : activity.length === 0 ? (
                  <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 text-center">
                    <Target className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-2" />
                    <p className="dark:text-slate-400 text-slate-500 text-sm">لا يوجد نشاط بعد</p>
                  </div>
                ) : (
                  <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 divide-y dark:divide-white/5 divide-slate-100">
                    {activity.slice(0, 8).map((item, i) => {
                      const statusInfo = statusLabels[item.status] || { label: item.status, color: "text-slate-400" };
                      return (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 hover:dark:bg-white/5 hover:bg-slate-50 transition-colors">
                          <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${item.type === "submission" ? "bg-violet-500/10" : "bg-cyan-500/10"}`}>
                            {item.type === "submission" ? <Code2 className="w-3.5 h-3.5 text-violet-400" /> : <BookOpen className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm dark:text-white text-slate-900 truncate">
                              {item.type === "submission" ? "حل مسألة: " : ""}
                              <span className="font-medium">{item.title}</span>
                            </p>
                            <p className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</p>
                          </div>
                          <span className="text-xs dark:text-slate-600 text-slate-400 flex-shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {timeAgo(item.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Quick actions */}
              <div>
                <h2 className="text-lg font-black dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> إجراءات سريعة
                </h2>
                <div className="space-y-2.5">
                  {[
                    { href: "/cloud-ide", icon: <Code2 className="w-4 h-4" />, label: "محرر الكود السحابي", color: "text-violet-400", bg: "bg-violet-500/10" },
                    { href: "/courses", icon: <BookOpen className="w-4 h-4" />, label: "استكشف كورسات جديدة", color: "text-cyan-400", bg: "bg-cyan-500/10" },
                    { href: "/problems", icon: <TrendingUp className="w-4 h-4" />, label: "حل تحدي برمجي", color: "text-green-400", bg: "bg-green-500/10" },
                    { href: "/my-courses", icon: <BookMarked className="w-4 h-4" />, label: "كورساتي المسجلة", color: "text-amber-400", bg: "bg-amber-500/10" },
                    { href: `/profile/${user.username}`, icon: <Award className="w-4 h-4" />, label: "ملفي الشخصي", color: "text-pink-400", bg: "bg-pink-500/10" },
                    { href: "/dashboard/settings", icon: <Settings className="w-4 h-4" />, label: "إعدادات الحساب", color: "text-slate-400", bg: "dark:bg-white/5 bg-slate-100" },
                  ].map((action, i) => (
                    <Link key={i} href={action.href}>
                      <div className="flex items-center gap-3 p-3 rounded-xl dark:bg-[#111827] bg-white border dark:border-white/10 border-slate-200 hover:border-cyan-500/20 transition-all group">
                        <div className={`w-8 h-8 rounded-lg ${action.bg} ${action.color} flex items-center justify-center flex-shrink-0`}>{action.icon}</div>
                        <span className="font-medium dark:text-slate-200 text-slate-700 group-hover:text-cyan-400 transition-colors text-sm flex-1">{action.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 dark:text-slate-600 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Badges */}
              <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
                <h3 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" /> الشارات
                </h3>
                {stats?.badges && stats.badges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.badges.map((badge, i) => <span key={i} className="badge badge-violet text-xs">{badge}</span>)}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Trophy className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-2" />
                    <p className="dark:text-slate-500 text-slate-400 text-xs">أكمل الكورسات والتحديات للحصول على شارات</p>
                  </div>
                )}
              </div>

              {/* Certificates */}
              <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
                <h3 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                  <Medal className="w-5 h-5 text-yellow-400" /> شهاداتي
                </h3>
                {loading ? (
                  <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-14 dark:bg-white/5 bg-slate-100 rounded-xl animate-pulse" />)}</div>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-4">
                    <Award className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-2" />
                    <p className="dark:text-slate-500 text-slate-400 text-xs">أكمل الكورسات للحصول على شهادات</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {certificates.map(cert => (
                      <div key={cert.id} className="flex items-start gap-3 p-3 rounded-xl dark:bg-yellow-400/5 bg-yellow-50 border dark:border-yellow-400/10 border-yellow-200">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow shadow-amber-400/20">
                          <Award className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold dark:text-yellow-300 text-yellow-700 text-xs truncate">{cert.certTitle}</p>
                          <p className="text-xs dark:text-slate-500 text-slate-400 truncate">{cert.courseTitle}</p>
                          <p className="text-xs dark:text-slate-600 text-slate-300 mt-0.5 font-mono">{cert.uniqueCode}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button title="نسخ رابط التحقق"
                            onClick={() => {
                              const url = `${window.location.origin}/verify/${cert.uniqueCode}`;
                              navigator.clipboard.writeText(url).then(() => {
                                const el = document.getElementById(`copied-${cert.id}`);
                                if (el) { el.style.display = "block"; setTimeout(() => { el.style.display = "none"; }, 1800); }
                              });
                            }}
                            className="relative w-7 h-7 flex items-center justify-center rounded-lg dark:bg-green-500/10 bg-green-50 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors cursor-pointer">
                            <ExternalLink className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                            <span id={`copied-${cert.id}`} style={{ display: "none" }} className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded whitespace-nowrap">نُسخ!</span>
                          </button>
                          <Link href={`/certificates/${cert.uniqueCode}`} target="_blank" title="عرض وتحميل الشهادة PDF"
                            className="w-7 h-7 flex items-center justify-center rounded-lg dark:bg-amber-500/10 bg-amber-100 hover:bg-amber-200 dark:hover:bg-amber-500/20 transition-colors">
                            <Download className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed courses */}
              {enrolledCourses.filter(c => c.completedAt).length > 0 && (
                <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
                  <h3 className="font-bold dark:text-white text-slate-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" /> الكورسات المكتملة
                  </h3>
                  <div className="space-y-2">
                    {enrolledCourses.filter(c => c.completedAt).map(c => (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        <span className="dark:text-slate-300 text-slate-600 truncate">{c.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
