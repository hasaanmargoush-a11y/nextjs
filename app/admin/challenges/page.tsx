"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import Link from "next/link";
import {
  BarChart3, Code2, Calendar, Flame, Loader2,
  ChevronDown, ChevronUp, Plus, Edit2, Trash2,
  Check, X, Eye, EyeOff, Package, Users, Trophy,
  TrendingUp, Zap, ExternalLink, Search,
  CheckCircle, XCircle, AlertCircle, Map,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Track {
  id: number; title: string; description: string; language: string;
  difficulty: string; icon: string; color: string; order: number;
  totalProblems: number; isPublished: boolean; packs: Pack[];
}
interface Pack {
  id: number; title: string; description: string; order: number;
  totalProblems: number; isPublished: boolean;
}
interface Problem {
  id: number; title: string; difficulty: string; language: string;
  points: number; packId: number | null; isPublished: boolean;
  testCasesCount: number; submissions: number; accepted: number;
}
interface Submission {
  id: number; userId: number; userName: string | null;
  status: string; language: string; executionTime: number | null; createdAt: string;
}
interface DailyChallenge { id: number; problemId: number; challengeDate: string; bonusMultiplier: number; }
interface SimpleProblem { id: number; title: string; difficulty: string; points: number; language: string; }
interface Overview {
  totalProblems: number; freeProblems: number; totalSubmissions: number;
  acceptedSubmissions: number; participants: number; totalTracks: number;
  totalPacks: number; hasToday: boolean;
  topProblems: Array<{ id: number; title: string; difficulty: string; total: number; accepted: number; }>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TRACK_DIFFS = ["beginner", "intermediate", "advanced", "expert"];
const TRACK_DIFF_LABELS: Record<string, string> = { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", expert: "خبير" };
const DIFF_LABELS: Record<string, string> = { easy: "سهل", medium: "متوسط", hard: "صعب", expert: "خبير" };
const DIFF_COLORS: Record<string, string> = { easy: "text-green-400", medium: "text-amber-400", hard: "text-red-400", expert: "text-violet-400" };
const LANGUAGES = ["Python", "JavaScript", "C++", "Java", "Go", "Rust", "TypeScript", "SQL"];
const TRACK_ICONS = ["🐍", "⚡", "☕", "🦀", "🐹", "📊", "🌐", "🔷", "🎯", "🛠️", "🧠", "📱"];
const PALETTE = ["#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#f97316", "#ec4899"];

// ─── Submissions Modal ────────────────────────────────────────────────────────

function SubmissionsModal({ problem, onClose }: { problem: Problem; onClose: () => void }) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Submission[]>(`/admin/problems/${problem.id}/submissions`)
      .then(setSubs).catch(() => toast.error("خطأ في تحميل المحاولات"))
      .finally(() => setLoading(false));
  }, [problem.id]);

  const accepted = subs.filter(s => s.status === "accepted").length;
  const wrong = subs.filter(s => s.status === "wrong_answer").length;
  const errors = subs.filter(s => s.status !== "accepted" && s.status !== "wrong_answer").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-2xl max-h-[80vh] flex flex-col dark:bg-[#070b14] bg-white rounded-2xl border dark:border-white/10 border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b dark:border-white/10 border-slate-200 flex-shrink-0">
          <div>
            <h2 className="font-bold dark:text-white text-slate-900 text-base">{problem.title}</h2>
            <p className="text-xs dark:text-slate-400 text-slate-600 mt-0.5">{subs.length} محاولة إجمالية</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl dark:hover:bg-white/10 hover:bg-slate-100 dark:text-slate-400 text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 p-4 border-b dark:border-white/10 border-slate-100 flex-shrink-0">
          {[
            { label: "مقبول", value: accepted, color: "bg-green-500/10 text-green-400", icon: <CheckCircle className="w-4 h-4" /> },
            { label: "خطأ", value: wrong, color: "bg-red-500/10 text-red-400", icon: <XCircle className="w-4 h-4" /> },
            { label: "أخطاء أخرى", value: errors, color: "bg-amber-500/10 text-amber-400", icon: <AlertCircle className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl ${s.color} text-sm flex-1 justify-center font-semibold`}>
              {s.icon}{s.value} {s.label}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
          ) : subs.length === 0 ? (
            <div className="text-center py-10 dark:text-slate-500 text-slate-400 text-sm">لا توجد محاولات بعد</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="dark:bg-white/5 bg-slate-50 sticky top-0">
                <tr>
                  {["المستخدم", "الحالة", "اللغة", "الوقت (ms)", "التاريخ"].map(h => (
                    <th key={h} className="text-right px-4 py-2.5 text-xs font-semibold dark:text-slate-400 text-slate-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} className="border-t dark:border-white/5 border-slate-100 dark:hover:bg-white/3 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 dark:text-white text-slate-900 font-medium">{s.userName ?? `مستخدم #${s.userId}`}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.status === "accepted" ? "bg-green-500/10 text-green-400" :
                        s.status === "wrong_answer" ? "bg-red-500/10 text-red-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>
                        {s.status === "accepted" ? "مقبول" : s.status === "wrong_answer" ? "خطأ" : "خطأ تشغيل"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 dark:text-slate-400 text-slate-600 text-xs">{s.language}</td>
                    <td className="px-4 py-2.5 dark:text-slate-400 text-slate-600 text-xs font-mono">{s.executionTime ?? "—"}</td>
                    <td className="px-4 py-2.5 dark:text-slate-400 text-slate-600 text-xs">{new Date(s.createdAt).toLocaleString("ar-EG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ overview, loading }: { overview: Overview | null; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;
  if (!overview) return <div className="text-center py-20 dark:text-slate-500 text-slate-400">تعذر تحميل الإحصائيات</div>;

  const acceptRate = overview.totalSubmissions > 0
    ? Math.round((overview.acceptedSubmissions / overview.totalSubmissions) * 100) : 0;

  const cards = [
    { label: "إجمالي المسائل", value: overview.totalProblems, sub: `${overview.freeProblems} حرة`, icon: <Code2 className="w-5 h-5" />, gradient: "from-cyan-500 to-blue-600" },
    { label: "المسارات والحزم", value: overview.totalTracks, sub: `${overview.totalPacks} حزمة`, icon: <Map className="w-5 h-5" />, gradient: "from-violet-500 to-purple-600" },
    { label: "إجمالي المحاولات", value: overview.totalSubmissions, sub: `${overview.acceptedSubmissions} مقبول`, icon: <TrendingUp className="w-5 h-5" />, gradient: "from-emerald-500 to-teal-600" },
    { label: "نسبة القبول", value: `${acceptRate}%`, sub: "من كل المحاولات", icon: <Trophy className="w-5 h-5" />, gradient: "from-amber-500 to-orange-600" },
    { label: "المشاركون", value: overview.participants, sub: "مستخدم فريد حلّوا", icon: <Users className="w-5 h-5" />, gradient: "from-pink-500 to-rose-600" },
    {
      label: "تحدي اليوم",
      value: overview.hasToday ? "محدد ✓" : "غير محدد",
      sub: overview.hasToday ? "التحدي متاح اليوم" : "لم يُضف تحدي بعد",
      icon: <Flame className="w-5 h-5" />,
      gradient: overview.hasToday ? "from-orange-500 to-amber-600" : "from-slate-600 to-slate-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(c => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white flex-shrink-0 shadow-lg`}>
              {c.icon}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black dark:text-white text-slate-900 leading-tight">{c.value}</p>
              <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 truncate">{c.label}</p>
              <p className="text-xs dark:text-slate-500 text-slate-500 truncate">{c.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {overview.topProblems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b dark:border-white/10 border-slate-200">
            <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-cyan-400" />أكثر المسائل محاولةً
            </h3>
            <span className="text-xs dark:text-slate-500 text-slate-400">أعلى 10 مسائل</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="dark:bg-white/5 bg-slate-50">
                <tr>
                  {["المسألة", "الصعوبة", "المحاولات", "مقبول", "نسبة القبول"].map(h => (
                    <th key={h} className="text-right px-4 py-2.5 text-xs font-semibold dark:text-slate-400 text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.topProblems.map((p, i) => {
                  const rate = p.total > 0 ? Math.round((p.accepted / p.total) * 100) : 0;
                  return (
                    <tr key={p.id} className="border-t dark:border-white/5 border-slate-100 dark:hover:bg-white/3 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full dark:bg-white/10 bg-slate-100 flex items-center justify-center text-xs dark:text-slate-400 text-slate-600 flex-shrink-0">{i + 1}</span>
                          <span className="dark:text-white text-slate-900 font-medium truncate max-w-[180px]">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold ${DIFF_COLORS[p.difficulty] ?? "dark:text-slate-400 text-slate-500"}`}>
                          {DIFF_LABELS[p.difficulty] ?? p.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 dark:text-slate-300 text-slate-700 font-semibold">{p.total}</td>
                      <td className="px-4 py-2.5 text-green-400 font-semibold">{p.accepted}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-14 dark:bg-white/10 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: rate >= 60 ? "#22c55e" : rate >= 30 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                          <span className="text-xs dark:text-slate-400 text-slate-600">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {overview.topProblems.length === 0 && (
        <div className="text-center py-10 dark:text-slate-500 text-slate-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">لا توجد محاولات بعد — ستظهر هنا إحصائيات المحاولات</p>
        </div>
      )}
    </div>
  );
}

// ─── Track Form ───────────────────────────────────────────────────────────────

function TrackForm({ initial, onSave, onCancel }: {
  initial?: Partial<Track>; onSave: (d: Partial<Track>) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "", description: initial?.description ?? "",
    language: initial?.language ?? "Python", difficulty: initial?.difficulty ?? "beginner",
    icon: initial?.icon ?? "🐍", color: initial?.color ?? "#06b6d4",
    order: initial?.order ?? 0, isPublished: initial?.isPublished ?? false,
  });
  return (
    <div className="dark:bg-[#0d1525] bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="اسم المسار *"
            className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
        </div>
        <div className="col-span-2">
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="وصف المسار" rows={2}
            className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none resize-none" />
        </div>
        <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
          className="p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none">
          {LANGUAGES.map(l => <option key={l} value={l} className="dark:bg-[#111827]">{l}</option>)}
        </select>
        <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}
          className="p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none">
          {TRACK_DIFFS.map(d => <option key={d} value={d} className="dark:bg-[#111827]">{TRACK_DIFF_LABELS[d]}</option>)}
        </select>
        <div>
          <p className="text-xs dark:text-slate-500 text-slate-400 mb-1.5">الأيقونة</p>
          <div className="flex flex-wrap gap-1">
            {TRACK_ICONS.map(ico => (
              <button key={ico} type="button" onClick={() => setForm({ ...form, icon: ico })}
                className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === ico ? "ring-2 ring-cyan-400 dark:bg-white/10 bg-slate-100" : "dark:hover:bg-white/5 hover:bg-slate-100"}`}>
                {ico}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs dark:text-slate-500 text-slate-400 mb-1.5">اللون</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PALETTE.map(c => (
              <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 dark:ring-offset-[#0d1525] ring-offset-slate-50 ring-white scale-110" : ""}`}
                style={{ background: c }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={form.order} onChange={e => setForm({ ...form, order: +e.target.value })} placeholder="الترتيب"
              className="w-20 p-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
            <button type="button" onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-all ${form.isPublished ? "bg-green-500/10 border-green-500/30 text-green-400" : "dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600"}`}>
              {form.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {form.isPublished ? "منشور" : "مسودة"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} className="btn-primary text-xs py-2"><Check className="w-3.5 h-3.5" />حفظ</button>
        <button onClick={onCancel} className="btn-secondary text-xs py-2"><X className="w-3.5 h-3.5" />إلغاء</button>
      </div>
    </div>
  );
}

// ─── Pack Form ────────────────────────────────────────────────────────────────

function PackForm({ initial, onSave, onCancel }: {
  initial?: Partial<Pack>; onSave: (d: Partial<Pack>) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "", description: initial?.description ?? "",
    order: initial?.order ?? 0, isPublished: initial?.isPublished ?? false,
  });
  return (
    <div className="dark:bg-white/5 bg-slate-50 rounded-xl border dark:border-white/10 border-slate-100 p-3 space-y-2">
      <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="اسم الحزمة *"
        className="w-full p-2 rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
      <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="وصف الحزمة"
        className="w-full p-2 rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
      <div className="flex items-center gap-2 flex-wrap">
        <input type="number" value={form.order} onChange={e => setForm({ ...form, order: +e.target.value })} placeholder="الترتيب"
          className="w-20 p-2 rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-xs outline-none" />
        <button type="button" onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs border transition-all ${form.isPublished ? "bg-green-500/10 border-green-500/30 text-green-400" : "dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600"}`}>
          {form.isPublished ? "منشور" : "مسودة"}
        </button>
        <button onClick={() => onSave(form)} className="btn-primary text-xs py-2"><Check className="w-3 h-3" />حفظ</button>
        <button onClick={onCancel} className="btn-secondary text-xs py-2"><X className="w-3 h-3" />إلغاء</button>
      </div>
    </div>
  );
}

// ─── Tracks Tab ───────────────────────────────────────────────────────────────

function TracksTab({ problems, onViewSubmissions }: { problems: Problem[]; onViewSubmissions: (p: Problem) => void }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null);
  const [expandedPack, setExpandedPack] = useState<number | null>(null);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [editingTrack, setEditingTrack] = useState<number | null>(null);
  const [addingPackTo, setAddingPackTo] = useState<number | null>(null);
  const [editingPack, setEditingPack] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { setTracks(await api.get<Track[]>("/admin/tracks")); }
    catch { toast.error("خطأ في تحميل المسارات"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddTrack = async (data: Partial<Track>) => {
    if (!data.title) { toast.error("اسم المسار مطلوب"); return; }
    try {
      const t = await api.post<Track>("/admin/tracks", data);
      setTracks(p => [...p, { ...t, packs: [] }]);
      setShowAddTrack(false);
      toast.success("تم إضافة المسار");
    } catch { toast.error("خطأ في الحفظ"); }
  };

  const handleEditTrack = async (id: number, data: Partial<Track>) => {
    try {
      const updated = await api.patch<Track>(`/admin/tracks/${id}`, data);
      setTracks(p => p.map(t => t.id === id ? { ...t, ...updated } : t));
      setEditingTrack(null);
      toast.success("تم التحديث");
    } catch { toast.error("خطأ في الحفظ"); }
  };

  const handleDeleteTrack = async (id: number) => {
    if (!confirm("حذف هذا المسار وجميع حزمه؟")) return;
    try {
      await api.delete(`/admin/tracks/${id}`);
      setTracks(p => p.filter(t => t.id !== id));
      toast.success("تم الحذف");
    } catch { toast.error("خطأ في الحذف"); }
  };

  const handleAddPack = async (trackId: number, data: Partial<Pack>) => {
    if (!data.title) { toast.error("اسم الحزمة مطلوب"); return; }
    try {
      const pack = await api.post<Pack>(`/admin/tracks/${trackId}/packs`, data);
      setTracks(p => p.map(t => t.id === trackId ? { ...t, packs: [...(t.packs ?? []), pack] } : t));
      setAddingPackTo(null);
      toast.success("تم إضافة الحزمة");
    } catch { toast.error("خطأ في الحفظ"); }
  };

  const handleEditPack = async (packId: number, trackId: number, data: Partial<Pack>) => {
    try {
      const updated = await api.patch<Pack>(`/admin/packs/${packId}`, data);
      setTracks(p => p.map(t => t.id === trackId ? {
        ...t, packs: (t.packs ?? []).map(pk => pk.id === packId ? { ...pk, ...updated } : pk)
      } : t));
      setEditingPack(null);
      toast.success("تم التحديث");
    } catch { toast.error("خطأ في الحفظ"); }
  };

  const handleDeletePack = async (packId: number, trackId: number) => {
    if (!confirm("حذف هذه الحزمة ومسائلها؟")) return;
    try {
      await api.delete(`/admin/packs/${packId}`);
      setTracks(p => p.map(t => t.id === trackId ? { ...t, packs: (t.packs ?? []).filter(pk => pk.id !== packId) } : t));
      toast.success("تم الحذف");
    } catch { toast.error("خطأ في الحذف"); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  const totalPacks = tracks.reduce((s, t) => s + (t.packs?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm dark:text-slate-400 text-slate-600">
          {tracks.length} مسار • {totalPacks} حزمة
        </p>
        <button onClick={() => setShowAddTrack(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />مسار جديد
        </button>
      </div>

      <AnimatePresence>
        {showAddTrack && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <TrackForm onSave={handleAddTrack} onCancel={() => setShowAddTrack(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {tracks.length === 0 && !showAddTrack && (
        <div className="text-center py-20">
          <Map className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
          <p className="dark:text-slate-400 text-slate-600">لا توجد مسارات — أضف أول مسار</p>
        </div>
      )}

      <div className="space-y-3">
        {tracks.map(track => {
          const trackProbs = problems.filter(p => (track.packs ?? []).some(pk => pk.id === p.packId));
          const trackSubs = trackProbs.reduce((s, p) => s + p.submissions, 0);
          const trackAccepted = trackProbs.reduce((s, p) => s + p.accepted, 0);

          return (
            <motion.div key={track.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">

              {editingTrack === track.id ? (
                <div className="p-4">
                  <TrackForm initial={track} onSave={d => handleEditTrack(track.id, d)} onCancel={() => setEditingTrack(null)} />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${track.color}22`, border: `2px solid ${track.color}44` }}>
                      {track.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="font-bold dark:text-white text-slate-900 truncate">{track.title}</h3>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${track.isPublished ? "bg-green-500/10 text-green-400" : "dark:bg-white/5 bg-slate-100 dark:text-slate-500 text-slate-500"}`}>
                          {track.isPublished ? "منشور" : "مسودة"}
                        </span>
                      </div>
                      <p className="text-xs dark:text-slate-400 text-slate-600">
                        {track.language} • {TRACK_DIFF_LABELS[track.difficulty] ?? track.difficulty} • {track.packs?.length ?? 0} حزمة
                        {trackSubs > 0 && <span className="mr-2 dark:text-slate-500 text-slate-400">• {trackSubs} محاولة ({trackAccepted} مقبول)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setExpandedTrack(expandedTrack === track.id ? null : track.id)}
                        className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 dark:text-slate-400 text-slate-500 transition-colors">
                        {expandedTrack === track.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setEditingTrack(track.id)}
                        className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-cyan-400 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTrack(track.id)}
                        className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedTrack === track.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t dark:border-white/5 border-slate-100">
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-violet-400" />الحزم ({track.packs?.length ?? 0})
                            </p>
                            <button onClick={() => setAddingPackTo(track.id)}
                              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                              <Plus className="w-3 h-3" />حزمة جديدة
                            </button>
                          </div>

                          {addingPackTo === track.id && (
                            <PackForm onSave={d => handleAddPack(track.id, d)} onCancel={() => setAddingPackTo(null)} />
                          )}

                          {(track.packs ?? []).sort((a, b) => a.order - b.order).map(pack => {
                            const packProbs = problems.filter(p => p.packId === pack.id).sort((a, b) => a.id - b.id);
                            const packSubs = packProbs.reduce((s, p) => s + p.submissions, 0);
                            const packAccepted = packProbs.reduce((s, p) => s + p.accepted, 0);
                            const packRate = packSubs > 0 ? Math.round((packAccepted / packSubs) * 100) : 0;

                            return (
                              <div key={pack.id} className="dark:bg-white/3 bg-slate-50 rounded-xl border dark:border-white/5 border-slate-100 overflow-hidden">
                                {editingPack === pack.id ? (
                                  <div className="p-3">
                                    <PackForm initial={pack} onSave={d => handleEditPack(pack.id, track.id, d)} onCancel={() => setEditingPack(null)} />
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 p-3">
                                      <button onClick={() => setExpandedPack(expandedPack === pack.id ? null : pack.id)}
                                        className="p-1 rounded dark:hover:bg-white/10 hover:bg-slate-100 dark:text-slate-500 text-slate-400 transition-colors flex-shrink-0">
                                        {expandedPack === pack.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </button>
                                      <Package className="w-3.5 h-3.5 dark:text-violet-400 text-violet-500 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold dark:text-white text-slate-900 truncate">{pack.title}</p>
                                        <p className="text-xs dark:text-slate-500 text-slate-400">
                                          {packProbs.length} مسألة
                                          {packSubs > 0 && ` • ${packSubs} محاولة • ${packRate}% قبول`}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${pack.isPublished ? "text-green-400" : "dark:text-slate-600 text-slate-400"}`}>
                                          {pack.isPublished ? "منشور" : "مسودة"}
                                        </span>
                                        <button onClick={() => setEditingPack(pack.id)}
                                          className="p-1 rounded dark:hover:bg-white/10 hover:bg-white text-cyan-400 transition-colors">
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => handleDeletePack(pack.id, track.id)}
                                          className="p-1 rounded dark:hover:bg-white/10 hover:bg-white text-red-400 transition-colors">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                        <Link href="/admin/problems" target="_blank"
                                          className="p-1 rounded dark:hover:bg-white/10 hover:bg-white text-violet-400 transition-colors" title="إضافة مسألة">
                                          <Plus className="w-3 h-3" />
                                        </Link>
                                      </div>
                                    </div>

                                    <AnimatePresence>
                                      {expandedPack === pack.id && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden border-t dark:border-white/5 border-slate-100">
                                          <div className="p-2 space-y-0.5">
                                            {packProbs.length === 0 ? (
                                              <p className="text-xs dark:text-slate-500 text-slate-400 text-center py-4">
                                                لا توجد مسائل — أضفها من{" "}
                                                <Link href="/admin/problems" target="_blank" className="text-cyan-400 hover:underline">محرر المسائل</Link>
                                              </p>
                                            ) : packProbs.map(prob => {
                                              const rate = prob.submissions > 0 ? Math.round((prob.accepted / prob.submissions) * 100) : 0;
                                              return (
                                                <div key={prob.id}
                                                  className="flex items-center gap-2 p-2 rounded-lg dark:hover:bg-white/5 hover:bg-white cursor-pointer group transition-colors"
                                                  onClick={() => onViewSubmissions(prob)}>
                                                  <Code2 className="w-3.5 h-3.5 dark:text-slate-500 text-slate-400 flex-shrink-0" />
                                                  <p className="text-xs dark:text-white text-slate-900 flex-1 truncate font-medium">{prob.title}</p>
                                                  <span className={`text-xs flex-shrink-0 ${DIFF_COLORS[prob.difficulty] ?? ""}`}>
                                                    {DIFF_LABELS[prob.difficulty] ?? prob.difficulty}
                                                  </span>
                                                  {prob.testCasesCount === 0 && (
                                                    <span className="text-xs text-red-400 flex-shrink-0" title="بدون حالات اختبار">⚠️</span>
                                                  )}
                                                  <div className="flex items-center gap-1 text-xs dark:text-slate-400 text-slate-600 flex-shrink-0">
                                                    <Users className="w-3 h-3" />
                                                    <span>{prob.submissions}</span>
                                                    {prob.submissions > 0 && (
                                                      <span className="text-green-400">({rate}%)</span>
                                                    )}
                                                  </div>
                                                  <Link href="/admin/problems" target="_blank" onClick={e => e.stopPropagation()}
                                                    className="opacity-0 group-hover:opacity-100 p-1 rounded dark:hover:bg-white/10 hover:bg-slate-100 text-cyan-400 transition-all flex-shrink-0">
                                                    <ExternalLink className="w-3 h-3" />
                                                  </Link>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </>
                                )}
                              </div>
                            );
                          })}

                          {(track.packs ?? []).length === 0 && addingPackTo !== track.id && (
                            <p className="text-xs dark:text-slate-500 text-slate-400 text-center py-3">لا توجد حزم — أضف أول حزمة</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Problems Tab ─────────────────────────────────────────────────────────────

function ProblemsTab({ problems, loading, onSearch, onViewSubmissions }: {
  problems: Problem[]; loading: boolean;
  onSearch: (q: string) => void; onViewSubmissions: (p: Problem) => void;
}) {
  const [filterDiff, setFilterDiff] = useState("");
  const [filterPack, setFilterPack] = useState<"all" | "free" | "inpack">("all");

  const filtered = problems.filter(p => {
    if (filterDiff && p.difficulty !== filterDiff) return false;
    if (filterPack === "free" && p.packId !== null) return false;
    if (filterPack === "inpack" && p.packId === null) return false;
    return true;
  });

  const noTestCases = filtered.filter(p => p.testCasesCount === 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 flex-1 min-w-48">
          <Search className="w-4 h-4 dark:text-slate-400 text-slate-500 flex-shrink-0" />
          <input
            onChange={e => onSearch(e.target.value)}
            placeholder="بحث بالاسم..."
            className="bg-transparent dark:text-white text-slate-900 text-sm outline-none flex-1 min-w-0" />
        </div>
        <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
          className="px-3 py-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none">
          <option value="">كل المستويات</option>
          {["easy", "medium", "hard", "expert"].map(d => <option key={d} value={d} className="dark:bg-[#111827]">{DIFF_LABELS[d]}</option>)}
        </select>
        <select value={filterPack} onChange={e => setFilterPack(e.target.value as "all" | "free" | "inpack")}
          className="px-3 py-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none">
          <option value="all">الكل</option>
          <option value="free" className="dark:bg-[#111827]">حرة فقط</option>
          <option value="inpack" className="dark:bg-[#111827]">في مسار</option>
        </select>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="dark:text-slate-400 text-slate-600">{filtered.length} مسألة</span>
        {noTestCases > 0 && (
          <span className="text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{noTestCases} بدون حالات اختبار
          </span>
        )}
        <Link href="/admin/problems" target="_blank" className="text-cyan-400 hover:underline flex items-center gap-1 mr-auto">
          <ExternalLink className="w-3 h-3" />محرر المسائل المتقدم
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-cyan-400" /></div>
      ) : (
        <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="dark:bg-white/5 bg-slate-50">
                <tr>
                  {["#", "المسألة", "الصعوبة", "اللغة", "الاختبارات", "محاولات", "مقبول", "نسبة %", "الحالة", ""].map(h => (
                    <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold dark:text-slate-400 text-slate-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const rate = p.submissions > 0 ? Math.round((p.accepted / p.submissions) * 100) : 0;
                  return (
                    <tr key={p.id} className="border-t dark:border-white/5 border-slate-100 dark:hover:bg-white/3 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => onViewSubmissions(p)}>
                      <td className="px-3 py-2.5 dark:text-slate-500 text-slate-400 text-xs font-mono">{p.id}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="dark:text-white text-slate-900 font-medium max-w-[180px] truncate block">{p.title}</span>
                          {p.packId === null && <span className="text-xs text-cyan-400 flex-shrink-0">حرة</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-semibold ${DIFF_COLORS[p.difficulty] ?? ""}`}>{DIFF_LABELS[p.difficulty] ?? p.difficulty}</span>
                      </td>
                      <td className="px-3 py-2.5 dark:text-slate-400 text-slate-600 text-xs whitespace-nowrap">{p.language}</td>
                      <td className="px-3 py-2.5">
                        {p.testCasesCount > 0 ? (
                          <span className="text-xs text-green-400 font-semibold">{p.testCasesCount} ✓</span>
                        ) : (
                          <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">⚠️ لا يوجد</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 dark:text-slate-300 text-slate-700 font-semibold text-center">{p.submissions}</td>
                      <td className="px-3 py-2.5 text-green-400 font-semibold text-center">{p.accepted}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-12 dark:bg-white/10 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                            <div className="h-full rounded-full" style={{
                              width: `${rate}%`,
                              background: rate >= 60 ? "#22c55e" : rate >= 30 ? "#f59e0b" : "#ef4444"
                            }} />
                          </div>
                          <span className="text-xs dark:text-slate-400 text-slate-600">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.isPublished ? "bg-green-500/10 text-green-400" : "dark:bg-white/5 bg-slate-100 dark:text-slate-500 text-slate-400"}`}>
                          {p.isPublished ? "منشور" : "مسودة"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href="/admin/problems" target="_blank" onClick={e => e.stopPropagation()}
                          className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-cyan-400 inline-flex transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-10 text-center dark:text-slate-500 text-slate-400">لا توجد نتائج</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Daily Tab ────────────────────────────────────────────────────────────────

function DailyTab() {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [problems, setProblems] = useState<SimpleProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    problemId: "",
    challengeDate: new Date().toISOString().slice(0, 10),
    bonusMultiplier: "2",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<DailyChallenge[]>("/admin/daily-challenge"),
      api.get<SimpleProblem[]>("/admin/problems"),
    ]).then(([c, p]) => { setChallenges(c); setProblems(p); })
      .catch(() => toast.error("خطأ في التحميل"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.problemId || !form.challengeDate) { toast.error("اختر المسألة والتاريخ"); return; }
    setSaving(true);
    try {
      const ch = await api.post<DailyChallenge>("/admin/daily-challenge", {
        problemId: parseInt(form.problemId, 10),
        challengeDate: form.challengeDate,
        bonusMultiplier: parseFloat(form.bonusMultiplier) || 2,
      });
      setChallenges(prev => {
        const exists = prev.findIndex(c => c.challengeDate === ch.challengeDate);
        if (exists >= 0) { const next = [...prev]; next[exists] = ch; return next; }
        return [ch, ...prev].sort((a, b) => b.challengeDate.localeCompare(a.challengeDate));
      });
      toast.success("تم حفظ التحدي اليومي");
      setForm(f => ({ ...f, problemId: "" }));
    } catch { toast.error("خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا التحدي اليومي؟")) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/daily-challenge/${id}`);
      setChallenges(prev => prev.filter(c => c.id !== id));
      toast.success("تم الحذف");
    } catch { toast.error("خطأ في الحذف"); }
    finally { setDeleting(null); }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 space-y-4">
        <h2 className="font-bold dark:text-white text-slate-900 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" />جدولة تحدٍ يومي
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">المسألة * ({problems.length} مسألة متاحة)</label>
            <select value={form.problemId} onChange={e => setForm({ ...form, problemId: e.target.value })}
              className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none">
              <option value="">-- اختر مسألة --</option>
              {problems.map(p => (
                <option key={p.id} value={p.id} className="dark:bg-[#111827]">
                  [{DIFF_LABELS[p.difficulty] ?? p.difficulty}] {p.title} — {p.language}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">التاريخ *</label>
            <input type="date" value={form.challengeDate} onChange={e => setForm({ ...form, challengeDate: e.target.value })}
              className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">مضاعف المكافأة (1–5)</label>
            <input type="number" min="1" max="5" step="0.5" value={form.bonusMultiplier}
              onChange={e => setForm({ ...form, bonusMultiplier: e.target.value })}
              className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          حفظ التحدي
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-7 h-7 animate-spin text-cyan-400" /></div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs dark:text-slate-500 text-slate-400">{challenges.length} تحدٍ مجدول</p>
          {challenges.map(ch => {
            const prob = problems.find(p => p.id === ch.problemId);
            const isToday = ch.challengeDate === today;
            const isPast = ch.challengeDate < today;
            return (
              <motion.div key={ch.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`flex items-center gap-3 p-4 rounded-xl border ${isToday ? "dark:bg-amber-500/5 bg-amber-50 border-amber-500/20" : "dark:bg-[#111827] bg-white dark:border-white/10 border-slate-200"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isToday ? "bg-amber-500/20" : "dark:bg-white/5 bg-slate-100"}`}>
                  {isToday
                    ? <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                    : <Calendar className="w-4 h-4 dark:text-slate-400 text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold dark:text-white text-slate-900 text-sm truncate">
                      {prob?.title ?? `مسألة #${ch.problemId}`}
                    </p>
                    {isToday && <span className="text-xs text-amber-400 font-bold">اليوم</span>}
                    {isPast && !isToday && <span className="text-xs dark:text-slate-500 text-slate-400">منتهي</span>}
                    {!isPast && !isToday && <span className="text-xs text-blue-400">قادم</span>}
                  </div>
                  <p className="text-xs dark:text-slate-400 text-slate-600 flex items-center gap-2">
                    <span>{ch.challengeDate}</span>
                    <span>• مكافأة ×{ch.bonusMultiplier}</span>
                    {prob && (
                      <span className={DIFF_COLORS[prob.difficulty] ?? ""}>
                        • {DIFF_LABELS[prob.difficulty] ?? prob.difficulty}
                      </span>
                    )}
                  </p>
                </div>
                <button onClick={() => handleDelete(ch.id)} disabled={deleting === ch.id}
                  className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-red-400 flex-shrink-0 transition-colors">
                  {deleting === ch.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </motion.div>
            );
          })}
          {challenges.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-2" />
              <p className="dark:text-slate-400 text-slate-600 text-sm">لا توجد تحديات مجدولة — أضف أول تحدٍ</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "overview" | "tracks" | "problems" | "daily";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "نظرة عامة", icon: <BarChart3 className="w-4 h-4" /> },
  { key: "tracks", label: "المسارات والحزم", icon: <Map className="w-4 h-4" /> },
  { key: "problems", label: "المسائل", icon: <Code2 className="w-4 h-4" /> },
  { key: "daily", label: "التحدي اليومي", icon: <Calendar className="w-4 h-4" /> },
];

export default function AdminChallengesPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<Overview>("/admin/challenges/overview")
      .then(setOverview).catch(() => toast.error("خطأ في تحميل الإحصائيات"))
      .finally(() => setOverviewLoading(false));

    api.get<Problem[]>("/admin/problems-stats")
      .then(setProblems).catch(() => toast.error("خطأ في تحميل المسائل"))
      .finally(() => setProblemsLoading(false));
  }, []);

  const handleSearch = useCallback((q: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const url = q.trim() ? `/admin/problems-stats?search=${encodeURIComponent(q)}` : "/admin/problems-stats";
        setProblems(await api.get<Problem[]>(url));
      } catch { /* silent */ }
    }, 350);
  }, []);

  return (
    <AdminSectionGuard section="problems">
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black dark:text-white text-slate-900 flex items-center gap-2 mb-1">
            <Zap className="w-6 h-6 text-cyan-400" />التحديات البرمجية
          </h1>
          <p className="dark:text-slate-400 text-slate-600 text-sm">إدارة شاملة للمسائل والمسارات والتحديات اليومية</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 p-1 rounded-2xl dark:bg-white/5 bg-slate-100 mb-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? "gradient-bg text-white shadow-lg shadow-cyan-500/20"
                  : "dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900"
              }`}>
              {t.icon}<span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            {tab === "overview" && <OverviewTab overview={overview} loading={overviewLoading} />}
            {tab === "tracks" && <TracksTab problems={problems} onViewSubmissions={setSelectedProblem} />}
            {tab === "problems" && (
              <ProblemsTab problems={problems} loading={problemsLoading} onSearch={handleSearch} onViewSubmissions={setSelectedProblem} />
            )}
            {tab === "daily" && <DailyTab />}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {selectedProblem && (
            <SubmissionsModal problem={selectedProblem} onClose={() => setSelectedProblem(null)} />
          )}
        </AnimatePresence>
      </div>
    </AdminSectionGuard>
  );
}
