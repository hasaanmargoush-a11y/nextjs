"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import {
  Plus, Trash2, Edit2, ChevronDown, ChevronUp, Loader2,
  BookOpen, Code2, Check, X, Package, Eye, EyeOff, Move
} from "lucide-react";

interface Pack { id: number; title: string; description: string; order: number; totalProblems: number; isPublished: boolean; }
interface Track { id: number; title: string; description: string; language: string; difficulty: string; icon: string; color: string; order: number; totalProblems: number; isPublished: boolean; packs: Pack[]; }

const LANGUAGES = ["Python", "JavaScript", "C++", "Java", "Go", "Rust", "TypeScript", "SQL"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];
const difficultyLabels: Record<string, string> = { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", expert: "خبير" };
const TRACK_ICONS = ["🐍", "⚡", "☕", "🦀", "🐹", "📊", "🌐", "🔷", "🎯", "🛠️", "🧠", "📱"];
const COLORS = ["#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#f97316", "#ec4899"];

function TrackForm({ initial, onSave, onCancel }: {
  initial?: Partial<Track>;
  onSave: (data: Partial<Track>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    language: initial?.language ?? "Python",
    difficulty: initial?.difficulty ?? "beginner",
    icon: initial?.icon ?? "🐍",
    color: initial?.color ?? "#06b6d4",
    order: initial?.order ?? 0,
    isPublished: initial?.isPublished ?? false,
  });
  return (
    <div className="dark:bg-[#0d1525] bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200 p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">اسم المسار *</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
        </div>
        <div className="col-span-2">
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">الوصف</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2} className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none resize-none" />
        </div>
        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">اللغة</label>
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none">
            {LANGUAGES.map((l) => <option key={l} value={l} className="dark:bg-[#111827]">{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">المستوى</label>
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none">
            {DIFFICULTIES.map((d) => <option key={d} value={d} className="dark:bg-[#111827]">{difficultyLabels[d]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">الترتيب</label>
          <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: +e.target.value })}
            className="w-full p-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">نشر</label>
          <button onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${form.isPublished ? "bg-green-500/10 border-green-500/30 text-green-400" : "dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600"}`}>
            {form.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {form.isPublished ? "منشور" : "مسودة"}
          </button>
        </div>
        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">الأيقونة</label>
          <div className="flex flex-wrap gap-1.5">
            {TRACK_ICONS.map((ico) => (
              <button key={ico} onClick={() => setForm({ ...form, icon: ico })}
                className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === ico ? "ring-2 ring-cyan-400 dark:bg-white/10 bg-slate-100" : "dark:hover:bg-white/5 hover:bg-slate-100"}`}>
                {ico}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600 mb-1 block">اللون</label>
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setForm({ ...form, color: c })}
                className={`w-8 h-8 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-white scale-110" : ""}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(form)} className="btn-primary text-sm py-2">
          <Check className="w-4 h-4" />حفظ
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm py-2">
          <X className="w-4 h-4" />إلغاء
        </button>
      </div>
    </div>
  );
}

function PackForm({ trackId, initial, onSave, onCancel }: {
  trackId: number; initial?: Partial<Pack>; onSave: (data: Partial<Pack>) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    order: initial?.order ?? 0,
    isPublished: initial?.isPublished ?? false,
  });
  return (
    <div className="dark:bg-[#0d1525] bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200 p-4 space-y-3 mt-3">
      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="اسم الحزمة *"
        className="w-full p-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
      <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="وصف الحزمة"
        className="w-full p-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
      <div className="flex items-center gap-3">
        <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: +e.target.value })}
          placeholder="الترتيب"
          className="w-24 p-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none" />
        <button onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-all ${form.isPublished ? "bg-green-500/10 border-green-500/30 text-green-400" : "dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600"}`}>
          {form.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {form.isPublished ? "منشور" : "مسودة"}
        </button>
        <button onClick={() => onSave(form)} className="btn-primary text-xs py-2"><Check className="w-3.5 h-3.5" />حفظ</button>
        <button onClick={onCancel} className="btn-secondary text-xs py-2"><X className="w-3.5 h-3.5" />إلغاء</button>
      </div>
    </div>
  );
}

export default function AdminTracksPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [editingTrack, setEditingTrack] = useState<number | null>(null);
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null);
  const [addingPackTo, setAddingPackTo] = useState<number | null>(null);
  const [editingPack, setEditingPack] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setTracks(await api.get<Track[]>("/admin/tracks")); }
    catch { toast.error("خطأ في تحميل المسارات"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAddTrack = async (data: Partial<Track>) => {
    if (!data.title) { toast.error("اسم المسار مطلوب"); return; }
    setSaving(true);
    try {
      const track = await api.post<Track>("/admin/tracks", data);
      setTracks((prev) => [...prev, track]);
      setShowAddTrack(false);
      toast.success("تم إضافة المسار");
    } catch { toast.error("خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  const handleEditTrack = async (id: number, data: Partial<Track>) => {
    setSaving(true);
    try {
      const updated = await api.patch<Track>(`/admin/tracks/${id}`, data);
      setTracks((prev) => prev.map((t) => t.id === id ? { ...t, ...updated } : t));
      setEditingTrack(null);
      toast.success("تم التحديث");
    } catch { toast.error("خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  const handleDeleteTrack = async (id: number) => {
    if (!confirm("حذف هذا المسار وجميع حزمه؟")) return;
    try {
      await api.delete(`/admin/tracks/${id}`);
      setTracks((prev) => prev.filter((t) => t.id !== id));
      toast.success("تم الحذف");
    } catch { toast.error("خطأ في الحذف"); }
  };

  const handleAddPack = async (trackId: number, data: Partial<Pack>) => {
    if (!data.title) { toast.error("اسم الحزمة مطلوب"); return; }
    try {
      const pack = await api.post<Pack>(`/admin/tracks/${trackId}/packs`, data);
      setTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, packs: [...t.packs, pack] } : t));
      setAddingPackTo(null);
      toast.success("تم إضافة الحزمة");
    } catch { toast.error("خطأ في الحفظ"); }
  };

  const handleEditPack = async (packId: number, trackId: number, data: Partial<Pack>) => {
    try {
      const updated = await api.patch<Pack>(`/admin/packs/${packId}`, data);
      setTracks((prev) => prev.map((t) => t.id === trackId ? {
        ...t, packs: t.packs.map((p) => p.id === packId ? { ...p, ...updated } : p)
      } : t));
      setEditingPack(null);
      toast.success("تم التحديث");
    } catch { toast.error("خطأ في الحفظ"); }
  };

  const handleDeletePack = async (packId: number, trackId: number) => {
    if (!confirm("حذف هذه الحزمة؟")) return;
    try {
      await api.delete(`/admin/packs/${packId}`);
      setTracks((prev) => prev.map((t) => t.id === trackId ? {
        ...t, packs: t.packs.filter((p) => p.id !== packId)
      } : t));
      toast.success("تم الحذف");
    } catch { toast.error("خطأ في الحذف"); }
  };

  return (
    <AdminSectionGuard section="problems">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black dark:text-white text-slate-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-cyan-400" />مسارات التعلم
            </h1>
            <p className="dark:text-slate-400 text-slate-600 text-sm mt-1">{tracks.length} مسار</p>
          </div>
          <button onClick={() => setShowAddTrack(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />مسار جديد
          </button>
        </div>

        <AnimatePresence>
          {showAddTrack && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-5">
              <TrackForm onSave={handleAddTrack} onCancel={() => setShowAddTrack(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
            <p className="dark:text-slate-400 text-slate-600">لا توجد مسارات — أضف أول مسار</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track) => (
              <motion.div key={track.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
                {editingTrack === track.id ? (
                  <div className="p-4">
                    <TrackForm initial={track} onSave={(d) => handleEditTrack(track.id, d)} onCancel={() => setEditingTrack(null)} />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 p-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: `${track.color}22`, border: `2px solid ${track.color}40` }}>
                        {track.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <h3 className="font-bold dark:text-white text-slate-900 truncate">{track.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${track.isPublished ? "bg-green-500/10 text-green-400" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600"}`}>
                            {track.isPublished ? "منشور" : "مسودة"}
                          </span>
                        </div>
                        <p className="text-xs dark:text-slate-400 text-slate-600">
                          {track.language} • {difficultyLabels[track.difficulty]} • {track.packs?.length ?? 0} حزمة
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setExpandedTrack(expandedTrack === track.id ? null : track.id)}
                          className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 dark:text-slate-400 text-slate-600 transition-colors">
                          {expandedTrack === track.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingTrack(track.id)}
                          className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-cyan-400 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteTrack(track.id)}
                          className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedTrack === track.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t dark:border-white/5 border-slate-100">
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold dark:text-white text-slate-900 text-sm flex items-center gap-2">
                                <Package className="w-4 h-4 text-violet-400" />الحزم ({track.packs?.length ?? 0})
                              </h4>
                              <button onClick={() => setAddingPackTo(track.id)}
                                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                                <Plus className="w-3.5 h-3.5" />حزمة جديدة
                              </button>
                            </div>

                            {addingPackTo === track.id && (
                              <PackForm trackId={track.id}
                                onSave={(d) => handleAddPack(track.id, d)}
                                onCancel={() => setAddingPackTo(null)} />
                            )}

                            {(track.packs ?? []).map((pack) => (
                              <div key={pack.id}>
                                {editingPack === pack.id ? (
                                  <PackForm trackId={track.id} initial={pack}
                                    onSave={(d) => handleEditPack(pack.id, track.id, d)}
                                    onCancel={() => setEditingPack(null)} />
                                ) : (
                                  <div className="flex items-center gap-3 p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-100">
                                    <Package className="w-4 h-4 dark:text-slate-400 text-slate-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium dark:text-white text-slate-900 truncate">{pack.title}</p>
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${pack.isPublished ? "text-green-400" : "dark:text-slate-500 text-slate-400"}`}>
                                          {pack.isPublished ? "منشور" : "مسودة"}
                                        </span>
                                      </div>
                                      {pack.description && <p className="text-xs dark:text-slate-500 text-slate-400 truncate">{pack.description}</p>}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <button onClick={() => setEditingPack(pack.id)}
                                        className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-cyan-400 transition-colors">
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => handleDeletePack(pack.id, track.id)}
                                        className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-red-400 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {(track.packs ?? []).length === 0 && addingPackTo !== track.id && (
                              <p className="text-xs dark:text-slate-500 text-slate-400 text-center py-3">لا توجد حزم — أضف أولى الحزم</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
