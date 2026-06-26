"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { api, type CoursePhase, type Certificate } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Loader2, Save, X, Award } from "lucide-react";

interface Props {
  courseId: number;
  phases: CoursePhase[];
  certificates: Certificate[];
  onRefresh: () => void;
}

export default function CertificatesTab({ courseId, phases, certificates, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editCert, setEditCert] = useState<Certificate | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", type: "course" as "course" | "phase",
    phaseId: "" as string | number,
    signatoryName: "", signatoryTitle: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const openAdd = () => {
    setEditCert(null);
    setForm({ title: "", description: "", type: "course", phaseId: "", signatoryName: "", signatoryTitle: "" });
    setShowForm(true);
  };

  const openEdit = (cert: Certificate) => {
    setEditCert(cert);
    setForm({
      title: cert.title, description: cert.description ?? "",
      type: cert.type as "course" | "phase",
      phaseId: cert.phaseId ?? "",
      signatoryName: cert.signatoryName ?? "",
      signatoryTitle: cert.signatoryTitle ?? "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("عنوان الشهادة مطلوب"); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        type: form.type,
        phaseId: form.phaseId ? Number(form.phaseId) : null,
        signatoryName: form.signatoryName || null,
        signatoryTitle: form.signatoryTitle || null,
        logoUrl: null,
        signatureUrl: null,
      };
      if (editCert) {
        await api.patch(`/admin/certificates/${editCert.id}`, payload);
        toast.success("تم تحديث الشهادة");
      } else {
        await api.post(`/admin/courses/${courseId}/certificates`, payload);
        toast.success("تم إضافة الشهادة");
      }
      setShowForm(false); setEditCert(null);
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const deleteCert = async (id: number) => {
    if (!confirm("حذف الشهادة؟")) return;
    setDeleting(id);
    try { await api.delete(`/admin/certificates/${id}`); toast.success("تم الحذف"); onRefresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setDeleting(null); }
  };

  const getPhaseTitle = (phaseId: number | null | undefined) =>
    phases.find(p => p.id === phaseId)?.title ?? null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold dark:text-white text-slate-900">الشهادات</h2>
        <button onClick={openAdd} className="btn-primary text-sm py-1.5 px-3">
          <Plus className="w-4 h-4" />إضافة شهادة
        </button>
      </div>

      {certificates.length === 0 && (
        <div className="text-center py-12 dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200">
          <Award className="w-10 h-10 mx-auto mb-2 dark:text-slate-600 text-slate-300" />
          <p className="dark:text-slate-400 text-slate-500">لا توجد شهادات. أضف أول شهادة!</p>
        </div>
      )}

      <div className="grid gap-4">
        {certificates.map((cert) => (
          <motion.div key={cert.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Award className="w-7 h-7 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold dark:text-white text-slate-900">{cert.title}</h3>
                    {cert.description && <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5 line-clamp-2">{cert.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cert.type === "course" ? "bg-amber-500/10 text-amber-600" : "bg-violet-500/10 text-violet-400"}`}>
                        {cert.type === "course" ? "إتمام الكورس" : `إتمام المرحلة: ${getPhaseTitle(cert.phaseId) ?? "—"}`}
                      </span>
                      {cert.signatoryName && (
                        <span className="text-xs dark:text-slate-500 text-slate-400">{cert.signatoryName} · {cert.signatoryTitle}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(cert)}
                      className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteCert(cert.id)}
                      className="w-7 h-7 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors">
                      {deleting === cert.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-lg shadow-2xl my-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold dark:text-white text-slate-900">{editCert ? "تعديل الشهادة" : "إضافة شهادة"}</h3>
              <button onClick={() => { setShowForm(false); setEditCert(null); }}><X className="w-5 h-5 dark:text-slate-400 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">عنوان الشهادة</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" placeholder="مثال: شهادة إتمام كورس Python" />
              </div>
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">الوصف (اختياري)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 resize-none" />
              </div>
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-2">نوع الشهادة</label>
                <div className="flex gap-2">
                  <button onClick={() => setForm(f => ({ ...f, type: "course", phaseId: "" }))}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${form.type === "course" ? "bg-amber-500 text-white border-amber-500" : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500"}`}>
                    إتمام الكورس
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, type: "phase" }))}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${form.type === "phase" ? "bg-violet-500 text-white border-violet-500" : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500"}`}>
                    إتمام مرحلة
                  </button>
                </div>
              </div>
              {form.type === "phase" && (
                <div>
                  <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">المرحلة</label>
                  <select value={form.phaseId} onChange={e => setForm(f => ({ ...f, phaseId: e.target.value }))}
                    className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900">
                    <option value="" className="dark:bg-[#111827]">— اختر المرحلة —</option>
                    {phases.map(p => <option key={p.id} value={p.id} className="dark:bg-[#111827]">{p.title}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">اسم الموقّع</label>
                  <input value={form.signatoryName} onChange={e => setForm(f => ({ ...f, signatoryName: e.target.value }))}
                    className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" placeholder="أ. محمد أحمد" />
                </div>
                <div>
                  <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">لقب الموقّع</label>
                  <input value={form.signatoryTitle} onChange={e => setForm(f => ({ ...f, signatoryTitle: e.target.value }))}
                    className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" placeholder="المدير التنفيذي" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center py-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}حفظ
                </button>
                <button onClick={() => { setShowForm(false); setEditCert(null); }} className="btn-secondary flex-1 justify-center py-2">إلغاء</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
