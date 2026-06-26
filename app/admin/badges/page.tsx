"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import { Plus, Trash2, Edit2, Loader2, Award, Users, X, Check } from "lucide-react";

interface Badge {
  id: number;
  key: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  condition: string;
  conditionValue: number;
  createdAt: string;
  earnedCount: number;
}

const CONDITION_OPTIONS = [
  { value: "solved_count", label: "عدد المسائل المحلولة" },
  { value: "streak_days", label: "أيام المتابعة المتتالية" },
  { value: "points_total", label: "إجمالي النقاط" },
  { value: "daily_solved", label: "تحديات يومية محلولة" },
  { value: "first_solve", label: "أول حل للمسألة" },
  { value: "speed_solve", label: "حل سريع (بالثانية)" },
];

const BADGE_ICONS = ["🏆", "⭐", "🔥", "💎", "🎯", "🚀", "⚡", "🦁", "🧠", "👑", "🥇", "🎖️", "🛡️", "⚔️", "🌟"];
const BADGE_COLORS = ["#f59e0b", "#06b6d4", "#8b5cf6", "#22c55e", "#ef4444", "#f97316", "#3b82f6", "#ec4899"];

const emptyForm = {
  key: "", title: "", description: "", icon: "🏆", color: "#f59e0b",
  condition: "solved_count", conditionValue: 1,
};

function BadgeForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<Badge>;
  onSave: (data: typeof emptyForm) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({ ...emptyForm, ...initial });
  const isEdit = !!initial?.id;

  return (
    <div className="dark:bg-[#0d1525] bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200 p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {!isEdit && (
          <div>
            <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">المفتاح (key) *</label>
            <input
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
              placeholder="first_solve"
              className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none"
              dir="ltr"
            />
          </div>
        )}
        <div className={isEdit ? "col-span-2" : ""}>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">اسم الشارة *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="محلول أول"
            className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">الوصف *</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="حل أول مسألة برمجية"
            className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">الشرط</label>
          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
            className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none"
          >
            {CONDITION_OPTIONS.map((c) => (
              <option key={c.value} value={c.value} className="dark:bg-[#111827]">{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">قيمة الشرط</label>
          <input
            type="number"
            min={1}
            value={form.conditionValue}
            onChange={(e) => setForm({ ...form, conditionValue: parseInt(e.target.value) || 1 })}
            className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none"
            dir="ltr"
          />
        </div>
        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-2 block">الأيقونة</label>
          <div className="flex flex-wrap gap-1.5">
            {BADGE_ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setForm({ ...form, icon })}
                className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                  form.icon === icon
                    ? "ring-2 ring-cyan-500 bg-cyan-500/20"
                    : "dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 hover:scale-110"
                }`}
              >{icon}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-2 block">اللون</label>
          <div className="flex flex-wrap gap-1.5">
            {BADGE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setForm({ ...form, color })}
                style={{ backgroundColor: color }}
                className={`w-7 h-7 rounded-full transition-all ${
                  form.color === color ? "ring-2 ring-offset-2 dark:ring-offset-[#0d1525] ring-offset-white ring-white scale-110" : "hover:scale-110"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form as typeof emptyForm)}
          disabled={saving || !form.title || !form.description || (!isEdit && !form.key)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-white text-sm font-semibold disabled:opacity-50 hover:bg-cyan-400 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isEdit ? "حفظ التعديلات" : "إضافة الشارة"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 text-sm dark:text-slate-300 text-slate-700 hover:border-red-400 transition-colors">
          إلغاء
        </button>
      </div>
    </div>
  );
}

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Badge[]>("/admin/badges")
      .then(setBadges)
      .catch(() => toast.error("فشل تحميل الشارات"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (form: typeof emptyForm) => {
    setSaving(true);
    try {
      await api.post("/admin/badges", { ...form, conditionValue: Number(form.conditionValue) });
      toast.success("تمت إضافة الشارة");
      setShowAdd(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "فشل الإضافة";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleEdit = async (form: typeof emptyForm) => {
    if (!editId) return;
    setSaving(true);
    try {
      await api.patch(`/admin/badges/${editId}`, { ...form, conditionValue: Number(form.conditionValue) });
      toast.success("تم تحديث الشارة");
      setEditId(null);
      load();
    } catch { toast.error("فشل التحديث"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشارة؟ سيتم حذفها من جميع المستخدمين الذين حصلوا عليها.")) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/badges/${id}`);
      toast.success("تم حذف الشارة");
      setBadges((prev) => prev.filter((b) => b.id !== id));
    } catch { toast.error("فشل الحذف"); } finally { setDeleting(null); }
  };

  const conditionLabel = (condition: string) =>
    CONDITION_OPTIONS.find((c) => c.value === condition)?.label ?? condition;

  return (
    <AdminSectionGuard section="problems">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black dark:text-white text-slate-900">إدارة الشارات</h1>
            <p className="text-sm dark:text-slate-400 text-slate-600 mt-1">
              {badges.length} شارة مسجلة — تُمنح تلقائياً عند استيفاء الشرط
            </p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditId(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            شارة جديدة
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <BadgeForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : badges.length === 0 ? (
          <div className="text-center py-16 dark:bg-white/2 bg-slate-50 rounded-2xl border dark:border-white/5 border-slate-200">
            <Award className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
            <p className="dark:text-slate-400 text-slate-600">لا توجد شارات بعد — أضف أول شارة!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <motion.div
                key={badge.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="dark:bg-white/3 bg-white rounded-2xl border dark:border-white/8 border-slate-200 p-5 relative overflow-hidden"
              >
                {editId === badge.id ? (
                  <BadgeForm
                    initial={badge}
                    onSave={handleEdit}
                    onCancel={() => setEditId(null)}
                    saving={saving}
                  />
                ) : (
                  <>
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                      style={{ backgroundColor: badge.color }}
                    />
                    <div className="flex items-start justify-between mb-3 mt-1">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                          style={{ backgroundColor: badge.color + "22", border: `2px solid ${badge.color}44` }}
                        >
                          {badge.icon}
                        </div>
                        <div>
                          <h3 className="font-bold dark:text-white text-slate-900 text-sm">{badge.title}</h3>
                          <p className="text-xs dark:text-slate-500 text-slate-400 font-mono">{badge.key}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditId(badge.id); setShowAdd(false); }}
                          className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 transition-colors dark:text-slate-400 text-slate-500 hover:text-cyan-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(badge.id)}
                          disabled={deleting === badge.id}
                          className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 transition-colors dark:text-slate-400 text-slate-500 hover:text-red-400 disabled:opacity-50"
                        >
                          {deleting === badge.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs dark:text-slate-400 text-slate-600 mb-3">{badge.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs dark:text-slate-500 text-slate-400">
                        <span className="dark:bg-white/8 bg-slate-100 rounded-lg px-2 py-0.5">
                          {conditionLabel(badge.condition)} ≥ {badge.conditionValue}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs dark:text-slate-500 text-slate-400">
                        <Users className="w-3 h-3" />
                        {badge.earnedCount} مستخدم
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminSectionGuard>
  );
}
