"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import { Calendar, Plus, Flame, Loader2, Check, Trash2, Users } from "lucide-react";

interface Problem { id: number; title: string; difficulty: string; points: number; language: string; }
interface DailyChallenge { id: number; problemId: number; challengeDate: string; bonusMultiplier: number; }

export default function AdminDailyChallengesPage() {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ problemId: "", challengeDate: "", bonusMultiplier: "2" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<DailyChallenge[]>("/admin/daily-challenge"),
      api.get<Problem[]>("/admin/problems"),
    ]).then(([c, p]) => {
      setChallenges(c);
      setProblems(p);
    })
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
      setChallenges((prev) => {
        const exists = prev.findIndex((c) => c.challengeDate === ch.challengeDate);
        if (exists >= 0) { const next = [...prev]; next[exists] = ch; return next; }
        return [ch, ...prev].sort((a, b) => b.challengeDate.localeCompare(a.challengeDate));
      });
      toast.success("تم حفظ التحدي اليومي");
      setForm({ problemId: "", challengeDate: "", bonusMultiplier: "2" });
    } catch { toast.error("خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا التحدي اليومي؟ سيتم حذف بيانات المشاركين أيضاً.")) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/daily-challenge/${id}`);
      setChallenges((prev) => prev.filter((c) => c.id !== id));
      toast.success("تم حذف التحدي");
    } catch { toast.error("خطأ في الحذف"); }
    finally { setDeleting(null); }
  };

  const difficultyColor: Record<string, string> = {
    easy: "text-green-400", medium: "text-amber-400", hard: "text-red-400", expert: "text-violet-400",
  };
  const difficultyLabel: Record<string, string> = {
    easy: "سهل", medium: "متوسط", hard: "صعب", expert: "خبير",
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AdminSectionGuard section="problems">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black dark:text-white text-slate-900 flex items-center gap-2 mb-1">
            <Calendar className="w-6 h-6 text-amber-400" />التحدي اليومي
          </h1>
          <p className="dark:text-slate-400 text-slate-600 text-sm">حدد مسألة اليوم ومعامل المكافأة</p>
        </div>

        <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 mb-6 space-y-4">
          <h2 className="font-bold dark:text-white text-slate-900 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />إضافة / تعديل تحدي يومي
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">المسألة * ({problems.length} مسألة متاحة)</label>
              <select value={form.problemId} onChange={(e) => setForm({ ...form, problemId: e.target.value })}
                className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none">
                <option value="">-- اختر مسألة --</option>
                {problems.map((p) => (
                  <option key={p.id} value={p.id} className="dark:bg-[#111827]">
                    [{difficultyLabel[p.difficulty] ?? p.difficulty}] {p.title} — {p.language} ({p.points} نقطة)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">التاريخ *</label>
              <input type="date" value={form.challengeDate} onChange={(e) => setForm({ ...form, challengeDate: e.target.value })}
                className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">مضاعف المكافأة (1 - 5)</label>
              <input type="number" min="1" max="5" step="0.5" value={form.bonusMultiplier}
                onChange={(e) => setForm({ ...form, bonusMultiplier: e.target.value })}
                className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            حفظ التحدي
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs dark:text-slate-500 text-slate-400 mb-3">{challenges.length} تحدٍ مسجل</p>
            {challenges.map((ch) => {
              const prob = problems.find((p) => p.id === ch.problemId);
              const isToday = ch.challengeDate === today;
              const isPast = ch.challengeDate < today;
              return (
                <motion.div key={ch.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`flex items-center gap-3 p-4 rounded-xl border ${
                    isToday
                      ? "dark:bg-amber-500/5 bg-amber-50 border-amber-500/20"
                      : "dark:bg-[#111827] bg-white dark:border-white/10 border-slate-200"
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isToday ? "bg-amber-500/20" : "dark:bg-white/5 bg-slate-100"}`}>
                    {isToday ? <Flame className="w-5 h-5 text-amber-400 animate-pulse" /> : <Calendar className="w-4 h-4 dark:text-slate-400 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold dark:text-white text-slate-900 text-sm truncate">
                        {prob?.title ?? `مسألة #${ch.problemId}`}
                      </p>
                      {isToday && <span className="text-xs text-amber-400 font-semibold">اليوم</span>}
                      {isPast && <span className="text-xs dark:text-slate-500 text-slate-400">منتهي</span>}
                    </div>
                    <p className="text-xs dark:text-slate-400 text-slate-600 flex items-center gap-2 flex-wrap">
                      <span>{ch.challengeDate}</span>
                      <span>• مكافأة ×{ch.bonusMultiplier}</span>
                      {prob && (
                        <span className={difficultyColor[prob.difficulty] ?? "text-slate-400"}>
                          • {difficultyLabel[prob.difficulty] ?? prob.difficulty}
                        </span>
                      )}
                      {prob && <span className="dark:text-slate-500 text-slate-400">• {prob.language}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(ch.id)}
                    disabled={deleting === ch.id}
                    className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-red-400 transition-colors flex-shrink-0"
                  >
                    {deleting === ch.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </motion.div>
              );
            })}
            {challenges.length === 0 && (
              <div className="text-center py-10">
                <Calendar className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-2" />
                <p className="dark:text-slate-400 text-slate-600 text-sm">لا توجد تحديات يومية — أضف أول تحدٍ أعلاه</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminSectionGuard>
  );
}
