"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { api, type CoursePhase, type Certificate } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Loader2, Save, X, Award, Eye } from "lucide-react";

interface Props {
  courseId: number;
  courseTitle: string;
  phases: CoursePhase[];
  certificates: Certificate[];
  onRefresh: () => void;
}

interface CertForm {
  title: string;
  description: string;
  type: "course" | "phase";
  phaseId: number | null;
  signatoryName: string;
  signatoryTitle: string;
}

function defaultForm(courseTitle: string): CertForm {
  return {
    title: `شهادة إتمام ${courseTitle}`,
    description: "",
    type: "course",
    phaseId: null,
    signatoryName: "إدارة نوفيل",
    signatoryTitle: "المؤسس والمدير التنفيذي",
  };
}

// ─── Certificate Preview (HTML — mirrors the actual certificate design) ────────
function CertPreviewHtml({
  cert, courseTitle, sampleName,
}: {
  cert: CertForm | Certificate;
  courseTitle: string;
  sampleName: string;
}) {
  const name = sampleName || "محمد أحمد";
  const sigName = "signatoryName" in cert ? cert.signatoryName || "" : "";
  const sigTitle = "signatoryTitle" in cert ? cert.signatoryTitle || "" : "";
  const certTitle = cert.title;
  const certType = "type" in cert ? cert.type : "course";

  const today = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div dir="rtl" style={{
      width: "100%", aspectRatio: "1123/794",
      fontFamily: "'Tajawal','Arial',sans-serif",
      background: "linear-gradient(150deg,#fefdf5 0%,#fffef9 50%,#fdf8ec 100%)",
      position: "relative", overflow: "hidden", boxSizing: "border-box",
    }}>
      {/* Watermark */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: "repeating-linear-gradient(45deg,#b8963e 0,#b8963e 1px,transparent 0,transparent 50%)", backgroundSize: "18px 18px" }} />

      {/* Outer border */}
      <div style={{ position: "absolute", inset: "1.3%", border: "3px solid #b8963e", borderRadius: 4 }} />
      {/* Inner border */}
      <div style={{ position: "absolute", inset: "2%", border: "1px solid #c9a84c", borderRadius: 2, opacity: 0.6 }} />

      {/* Corner ornaments */}
      {[
        { top: "1%", right: "1%", transform: "none" },
        { top: "1%", left: "1%", transform: "scaleX(-1)" },
        { bottom: "1%", right: "1%", transform: "scaleY(-1)" },
        { bottom: "1%", left: "1%", transform: "scale(-1,-1)" },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: "5%", height: "7%", ...s }}>
          <svg viewBox="0 0 56 56" width="100%" height="100%">
            <path d="M56,0 L56,56 M0,0 L56,0" stroke="#b8963e" strokeWidth="3" fill="none" />
            <path d="M48,0 L48,8 M0,8 L8,8 M8,0 L8,8" stroke="#c9a84c" strokeWidth="1.2" fill="none" opacity="0.7" />
            <circle cx="56" cy="0" r="5" fill="#b8963e" opacity="0.5" />
          </svg>
        </div>
      ))}

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 10, width: "100%", height: "100%",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "5% 9%", boxSizing: "border-box", textAlign: "center",
      }}>
        {/* Platform name */}
        <p style={{ color: "#8a6d20", fontSize: "1.1%", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", margin: "0 0 0.2%" }}>
          NOUVIL PLATFORM
        </p>
        <p style={{ color: "#3d2e07", fontSize: "1.5%", fontWeight: 800, margin: "0 0 2%", letterSpacing: "0.05em" }}>
          منصة نوفيل للتعليم
        </p>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "1%", marginBottom: "2%", width: "42%" }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,#c9a84c)" }} />
          <div style={{ width: 8, height: 8, background: "#b8963e", transform: "rotate(45deg)" }} />
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#c9a84c,transparent)" }} />
        </div>

        <p style={{ color: "#8a6d20", fontSize: "1.1%", fontWeight: 600, letterSpacing: "0.1em", margin: "0 0 1%" }}>
          شهادة إتمام &nbsp;·&nbsp; Certificate of Completion
        </p>

        <h1 style={{ color: "#1a1206", fontSize: "2.6%", fontWeight: 900, margin: "0 0 2.2%", lineHeight: 1.3, maxWidth: "63%" }}>
          {certTitle}
        </h1>

        <p style={{ color: "#5c4a1e", fontSize: "1.2%", fontWeight: 400, margin: "0 0 0.8%", letterSpacing: "0.04em" }}>
          تُقدَّم هذه الشهادة إلى
        </p>

        <p style={{ color: "#8a6010", fontSize: "3.3%", fontWeight: 900, margin: "0 0 0.8%" }}>
          {name}
        </p>

        {/* Name underline */}
        <div style={{ width: "19%", height: 2, background: "linear-gradient(90deg,transparent,#b8963e,transparent)", marginBottom: "1.4%" }} />

        <p style={{ color: "#5c4a1e", fontSize: "1.2%", fontWeight: 400, margin: "0 0 0.8%" }}>
          لإتمامه/ا بنجاح دورة
        </p>

        <p style={{ color: "#1a1206", fontSize: "1.9%", fontWeight: 700, margin: "0 0 2.2%", maxWidth: "55%", lineHeight: 1.4 }}>
          {courseTitle}
        </p>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.7%",
          padding: "0.7% 2.2%",
          border: "1px solid #c9a84c", borderRadius: 100, marginBottom: "2.5%",
          background: "rgba(184,150,62,0.06)",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#b8963e" />
          </svg>
          <span style={{ color: "#6b4f10", fontSize: "1.1%", fontWeight: 600 }}>
            {certType === "course" ? "شهادة إتمام الكورس" : "شهادة إتمام المرحلة"}
          </span>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          width: "78%",
          borderTop: "1px solid rgba(184,150,62,0.35)", paddingTop: "1.7%", gap: "2%",
        }}>
          <div style={{ textAlign: "right", minWidth: "15%" }}>
            <p style={{ color: "#8a7a50", fontSize: "0.9%", margin: "0 0 0.3%", fontWeight: 500 }}>تاريخ الإصدار</p>
            <p style={{ color: "#3d2e07", fontSize: "1.2%", fontWeight: 700, margin: 0 }}>{today}</p>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            {sigName ? (
              <>
                <div style={{ width: "9%", minWidth: 70, height: 1, background: "#c9a84c", margin: "0 auto 0.5%", opacity: 0.5 }} />
                <p style={{ color: "#3d2e07", fontSize: "1.1%", fontWeight: 700, margin: 0 }}>{sigName}</p>
                {sigTitle && <p style={{ color: "#8a7a50", fontSize: "0.9%", margin: "0.2% 0 0", fontWeight: 500 }}>{sigTitle}</p>}
              </>
            ) : (
              <p style={{ color: "#8a6d20", fontSize: "1%", fontWeight: 600 }}>منصة نوفيل للتعليم</p>
            )}
          </div>
          <div style={{ textAlign: "left", minWidth: "15%" }}>
            <p style={{ color: "#8a7a50", fontSize: "0.9%", margin: "0 0 0.3%", fontWeight: 500 }}>رمز التحقق</p>
            <p style={{ color: "#8a6010", fontSize: "1%", fontWeight: 700, fontFamily: "monospace", margin: 0, letterSpacing: "0.06em" }}>
              NOUVIL-XXXX
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab component ─────────────────────────────────────────────────────────────
export default function CertificatePreviewTab({ courseId, courseTitle, phases, certificates, onRefresh }: Props) {
  const [selected, setSelected] = useState<Certificate | null>(certificates[0] ?? null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<CertForm>(defaultForm(courseTitle));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sampleName, setSampleName] = useState("محمد أحمد");

  const openEdit = (cert: Certificate) => {
    setSelected(cert);
    setForm({
      title: cert.title,
      description: cert.description ?? "",
      type: cert.type as "course" | "phase",
      phaseId: cert.phaseId ?? null,
      signatoryName: cert.signatoryName ?? "",
      signatoryTitle: cert.signatoryTitle ?? "",
    });
    setEditing(true);
    setAdding(false);
  };

  const openAdd = () => {
    setForm(defaultForm(courseTitle));
    setAdding(true);
    setEditing(false);
    setSelected(null);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("عنوان الشهادة مطلوب"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        phaseId: form.type === "phase" ? form.phaseId : null,
        logoUrl: null,
        signatureUrl: null,
      };
      if (editing && selected) {
        const updated = await api.patch<Certificate>(`/admin/certificates/${selected.id}`, payload);
        setSelected(updated);
      } else {
        const created = await api.post<Certificate>(`/admin/courses/${courseId}/certificates`, payload);
        setSelected(created);
      }
      setEditing(false);
      setAdding(false);
      toast.success(editing ? "تم تحديث الشهادة" : "تم إضافة الشهادة");
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSaving(false); }
  };

  const deleteCert = async (id: number) => {
    if (!confirm("حذف الشهادة نهائياً؟")) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/certificates/${id}`);
      if (selected?.id === id) setSelected(null);
      setEditing(false);
      toast.success("تم الحذف");
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setDeleting(false); }
  };

  const inputCls = "input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm w-full";
  const previewForm = editing || adding ? form : selected ? {
    title: selected.title,
    description: selected.description ?? "",
    type: selected.type as "course" | "phase",
    phaseId: selected.phaseId ?? null,
    signatoryName: selected.signatoryName ?? "",
    signatoryTitle: selected.signatoryTitle ?? "",
  } : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold dark:text-white text-slate-900">الشهادات</h2>
        <button onClick={openAdd} className="btn-primary text-sm py-1.5 px-3">
          <Plus className="w-4 h-4" />إضافة شهادة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cert list + form */}
        <div className="space-y-3">
          {certificates.length === 0 && !adding && (
            <div className="text-center py-14 dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200">
              <Award className="w-10 h-10 dark:text-slate-600 text-slate-300 mx-auto mb-2" />
              <p className="dark:text-slate-400 text-slate-500 mb-3">لا توجد شهادات بعد</p>
              <button onClick={openAdd} className="btn-primary text-sm py-2 px-4"><Plus className="w-4 h-4" />أضف أول شهادة</button>
            </div>
          )}
          {certificates.map(cert => (
            <div key={cert.id}
              className={`dark:bg-[#111827] bg-white rounded-2xl border transition-colors cursor-pointer p-4 ${selected?.id === cert.id && !adding ? "dark:border-amber-500 border-amber-400" : "dark:border-white/10 border-slate-200"}`}
              onClick={() => { setSelected(cert); setEditing(false); setAdding(false); }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium dark:text-white text-slate-900 truncate text-sm">{cert.title}</p>
                  <p className="text-xs dark:text-slate-400 text-slate-500">
                    {cert.type === "course" ? "شهادة الكورس" : "شهادة مرحلة"}
                    {cert.signatoryName && ` · ${cert.signatoryName}`}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(cert); }}
                    className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center text-amber-500 transition-colors">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteCert(cert.id); }}
                    className="w-7 h-7 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Form */}
          {(editing || adding) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-amber-500/30 border-amber-300 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold dark:text-white text-slate-900 text-sm">{editing ? "تعديل الشهادة" : "شهادة جديدة"}</h3>
                <button onClick={() => { setEditing(false); setAdding(false); }}><X className="w-4 h-4 dark:text-slate-400 text-slate-500" /></button>
              </div>
              <div><label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">عنوان الشهادة</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">الوصف (اختياري)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-none`} /></div>

              <div>
                <label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">نوع الشهادة</label>
                <div className="flex gap-2">
                  <button onClick={() => setForm(f => ({ ...f, type: "course", phaseId: null }))}
                    className={`flex-1 py-2 rounded-xl text-xs border font-medium transition-all ${form.type === "course" ? "bg-amber-500 text-white border-amber-500" : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500"}`}>
                    شهادة الكورس
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, type: "phase" }))}
                    className={`flex-1 py-2 rounded-xl text-xs border font-medium transition-all ${form.type === "phase" ? "bg-violet-500 text-white border-violet-500" : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500"}`}>
                    شهادة مرحلة
                  </button>
                </div>
                {form.type === "phase" && phases.length > 0 && (
                  <select value={form.phaseId ?? ""} onChange={e => setForm(f => ({ ...f, phaseId: Number(e.target.value) }))} className={`${inputCls} mt-2`}>
                    <option value="">اختر المرحلة</option>
                    {phases.map(p => <option key={p.id} value={p.id} className="dark:bg-[#111827]">{p.title}</option>)}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">اسم الموقّع</label>
                  <input value={form.signatoryName} onChange={e => setForm(f => ({ ...f, signatoryName: e.target.value }))} className={inputCls} placeholder="أ. محمد أحمد" /></div>
                <div><label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">منصب الموقّع</label>
                  <input value={form.signatoryTitle} onChange={e => setForm(f => ({ ...f, signatoryTitle: e.target.value }))} className={inputCls} placeholder="مؤسس نوفيل" /></div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center py-2.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}حفظ الشهادة
                </button>
                <button onClick={() => { setEditing(false); setAdding(false); }} className="btn-secondary flex-1 justify-center py-2.5">إلغاء</button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-3">
          {previewForm ? (
            <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold dark:text-white text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-500" />معاينة الشهادة
                </p>
                <input value={sampleName} onChange={e => setSampleName(e.target.value)}
                  className="text-xs py-1.5 px-2.5 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none w-36"
                  placeholder="اسم المتدرب" />
              </div>
              <div className="rounded-xl overflow-hidden shadow-md shadow-amber-900/10">
                <CertPreviewHtml cert={previewForm} courseTitle={courseTitle} sampleName={sampleName} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200">
              <div className="text-center">
                <Award className="w-10 h-10 dark:text-slate-600 text-slate-300 mx-auto mb-2" />
                <p className="text-sm dark:text-slate-400 text-slate-500">اختر شهادة لمعاينتها</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
