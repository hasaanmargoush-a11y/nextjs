"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, uploadFile, type CoursePhase, type AdminLesson, type LessonContentBlock } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit, ChevronDown, ChevronUp, Loader2,
  Video, FileText, Code, Save, X, Upload, Youtube,
  GripVertical, BookOpen, Image as ImageIcon, Download
} from "lucide-react";

interface Props {
  courseId: number;
  phases: CoursePhase[];
  lessons: AdminLesson[];
  onRefresh: () => void;
}

type BlockType = "text" | "code" | "image";

interface NewBlock {
  type: BlockType;
  content: string;
  language: string;
}

export default function PhasesTab({ courseId, phases, lessons, onRefresh }: Props) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(phases[0]?.id ?? null);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ title: "", description: "" });
  const [editPhase, setEditPhase] = useState<CoursePhase | null>(null);
  const [savingPhase, setSavingPhase] = useState(false);
  const [deletingPhase, setDeletingPhase] = useState<number | null>(null);

  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [showAddLesson, setShowAddLesson] = useState<number | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "", duration: "0:00", isFree: false,
    videoType: "youtube" as "youtube" | "upload" | "none",
    videoUrl: "", videoObjectPath: "", content: ""
  });
  const [blocks, setBlocks] = useState<LessonContentBlock[]>([]);
  const [newBlock, setNewBlock] = useState<NewBlock>({ type: "text", content: "", language: "javascript" });
  const [savingLesson, setSavingLesson] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState<number | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const phaseCount = (phaseId: number) => lessons.filter(l => l.phaseId === phaseId).length;
  const unassigned = lessons.filter(l => !l.phaseId);

  const savePhase = async () => {
    if (!phaseForm.title.trim()) { toast.error("اسم المرحلة مطلوب"); return; }
    setSavingPhase(true);
    try {
      if (editPhase) {
        await api.patch(`/admin/phases/${editPhase.id}`, phaseForm);
        toast.success("تم تحديث المرحلة");
      } else {
        await api.post(`/admin/courses/${courseId}/phases`, phaseForm);
        toast.success("تم إضافة المرحلة");
      }
      setShowAddPhase(false); setEditPhase(null); setPhaseForm({ title: "", description: "" });
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSavingPhase(false); }
  };

  const deletePhase = async (id: number) => {
    if (!confirm("حذف المرحلة سيحذف جميع دروسها. متأكد؟")) return;
    setDeletingPhase(id);
    try { await api.delete(`/admin/phases/${id}`); toast.success("تم الحذف"); onRefresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setDeletingPhase(null); }
  };

  const openEditPhase = (phase: CoursePhase) => {
    setEditPhase(phase);
    setPhaseForm({ title: phase.title, description: phase.description ?? "" });
    setShowAddPhase(true);
  };

  const openAddLesson = (phaseId: number) => {
    setShowAddLesson(phaseId);
    setEditingLesson(null);
    setLessonForm({ title: "", duration: "0:00", isFree: false, videoType: "youtube", videoUrl: "", videoObjectPath: "", content: "" });
    setBlocks([]);
  };

  const openEditLesson = async (lesson: AdminLesson) => {
    setEditingLesson(lesson);
    setShowAddLesson(lesson.phaseId ?? -1);
    setLessonForm({
      title: lesson.title,
      duration: lesson.duration,
      isFree: lesson.isFree,
      videoType: (lesson.videoType as "youtube" | "upload" | "none") ?? "youtube",
      videoUrl: lesson.videoUrl ?? "",
      videoObjectPath: lesson.videoObjectPath ?? "",
      content: lesson.content ?? ""
    });
    try {
      const full = await api.get<AdminLesson>(`/admin/lessons/${lesson.id}`);
      setBlocks(full.contentBlocks ?? []);
    } catch { setBlocks([]); }
  };

  const handleVideoUpload = async (file: File) => {
    if (file.size > 500 * 1024 * 1024) { toast.error("حجم الفيديو يجب أن يكون أقل من 500MB"); return; }
    setVideoUploading(true);
    try {
      const path = await uploadFile(file);
      setLessonForm(f => ({ ...f, videoObjectPath: path, videoUrl: "" }));
      toast.success("تم رفع الفيديو");
    } catch { toast.error("فشل رفع الفيديو"); }
    finally { setVideoUploading(false); }
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim()) { toast.error("عنوان الدرس مطلوب"); return; }
    setSavingLesson(true);
    try {
      let lessonId: number;
      if (editingLesson) {
        const updated = await api.patch<AdminLesson>(`/admin/lessons/${editingLesson.id}`, {
          ...lessonForm,
          phaseId: showAddLesson && showAddLesson > 0 ? showAddLesson : null,
          videoUrl: lessonForm.videoType === "youtube" ? lessonForm.videoUrl : null,
          videoObjectPath: lessonForm.videoType === "upload" ? lessonForm.videoObjectPath : null,
        });
        lessonId = updated.id;
        toast.success("تم تحديث الدرس");
      } else {
        const created = await api.post<AdminLesson>(`/admin/courses/${courseId}/lessons`, {
          ...lessonForm,
          phaseId: showAddLesson && showAddLesson > 0 ? showAddLesson : null,
          videoUrl: lessonForm.videoType === "youtube" ? lessonForm.videoUrl : null,
          videoObjectPath: lessonForm.videoType === "upload" ? lessonForm.videoObjectPath : null,
        });
        lessonId = created.id;
        toast.success("تم إضافة الدرس");
      }
      if (editingLesson && blocks.length > 0) {
        for (const block of blocks) {
          if (block.id < 0) {
            await api.post(`/admin/lessons/${lessonId}/blocks`, { type: block.type, content: block.content, language: block.language });
          } else {
            await api.patch(`/admin/blocks/${block.id}`, { type: block.type, content: block.content, language: block.language });
          }
        }
      }
      setShowAddLesson(null); setEditingLesson(null);
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSavingLesson(false); }
  };

  const addBlock = async () => {
    if (!newBlock.content.trim()) { toast.error("المحتوى مطلوب"); return; }
    if (editingLesson) {
      try {
        const block = await api.post<LessonContentBlock>(`/admin/lessons/${editingLesson.id}/blocks`, {
          type: newBlock.type, content: newBlock.content,
          language: newBlock.type === "code" ? newBlock.language : null,
        });
        setBlocks(prev => [...prev, block]);
        setNewBlock({ type: "text", content: "", language: "javascript" });
        toast.success("تم إضافة البلوك");
      } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    } else {
      const tempBlock: LessonContentBlock = {
        id: -(Date.now()), lessonId: 0,
        type: newBlock.type, content: newBlock.content,
        language: newBlock.type === "code" ? newBlock.language : null,
        order: blocks.length
      };
      setBlocks(prev => [...prev, tempBlock]);
      setNewBlock({ type: "text", content: "", language: "javascript" });
    }
  };

  const removeBlock = async (blockId: number) => {
    if (blockId > 0) {
      try { await api.delete(`/admin/blocks/${blockId}`); }
      catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); return; }
    }
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  const deleteLesson = async (lessonId: number) => {
    if (!confirm("حذف الدرس؟")) return;
    setDeletingLesson(lessonId);
    try { await api.delete(`/admin/lessons/${lessonId}`); toast.success("تم حذف الدرس"); onRefresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setDeletingLesson(null); }
  };

  const downloadLessonPdf = (lesson: AdminLesson) => {
    const content = `
<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>${lesson.title}</title>
<style>body{font-family:Arial,sans-serif;direction:rtl;padding:40px;max-width:800px;margin:0 auto}
h1{color:#0891b2;border-bottom:2px solid #0891b2;padding-bottom:10px}
.code-block{background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;font-family:monospace;white-space:pre-wrap;margin:12px 0}
.text-block{line-height:1.8;margin:12px 0}</style></head>
<body><h1>${lesson.title}</h1>
${lesson.content ? `<div class="text-block">${lesson.content.replace(/\n/g, "<br>")}</div>` : ""}
${blocks.map(b => b.type === "code"
  ? `<pre class="code-block"><code>${b.content}</code></pre>`
  : `<div class="text-block">${b.content.replace(/\n/g, "<br>")}</div>`
).join("")}
</body></html>`;
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${lesson.title}.html`; a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تحميل الشرح");
  };

  const isLessonFormOpen = showAddLesson !== null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold dark:text-white text-slate-900">المراحل والدروس</h2>
        <button onClick={() => { setEditPhase(null); setPhaseForm({ title: "", description: "" }); setShowAddPhase(true); }}
          className="btn-primary text-sm py-1.5 px-3">
          <Plus className="w-4 h-4" />إضافة مرحلة
        </button>
      </div>

      {phases.length === 0 && (
        <div className="text-center py-12 dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200">
          <Layers className="w-10 h-10 mx-auto mb-2 dark:text-slate-600 text-slate-300" />
          <p className="dark:text-slate-400 text-slate-500">لا توجد مراحل بعد. أضف أول مرحلة!</p>
        </div>
      )}

      {phases.map((phase) => (
        <div key={phase.id} className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 p-4 cursor-pointer hover:dark:bg-white/5 hover:bg-slate-50 transition-colors"
            onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}>
            <GripVertical className="w-4 h-4 dark:text-slate-600 text-slate-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold dark:text-white text-slate-900">{phase.title}</h3>
              {phase.description && <p className="text-xs dark:text-slate-400 text-slate-500 line-clamp-1">{phase.description}</p>}
            </div>
            <span className="text-xs dark:text-slate-500 text-slate-400 flex-shrink-0">{phaseCount(phase.id)} درس</span>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); openEditPhase(phase); }}
                className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); deletePhase(phase.id); }}
                className="w-7 h-7 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors">
                {deletingPhase === phase.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
              {expandedPhase === phase.id ? <ChevronUp className="w-4 h-4 dark:text-slate-400 text-slate-500" /> : <ChevronDown className="w-4 h-4 dark:text-slate-400 text-slate-500" />}
            </div>
          </div>

          <AnimatePresence>
            {expandedPhase === phase.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="border-t dark:border-white/5 border-slate-100">
                  {lessons.filter(l => l.phaseId === phase.id).sort((a, b) => a.order - b.order).map((lesson) => (
                    <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 border-b dark:border-white/5 border-slate-50 hover:dark:bg-white/5 hover:bg-slate-50 transition-colors">
                      <BookOpen className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm dark:text-white text-slate-900 font-medium truncate">{lesson.title}</p>
                        <p className="text-xs dark:text-slate-500 text-slate-400">
                          {lesson.duration}
                          {lesson.videoType === "youtube" && lesson.videoUrl && " · YouTube"}
                          {lesson.videoType === "upload" && lesson.videoObjectPath && " · فيديو مرفوع"}
                          {lesson.isFree && " · مجاني"}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditLesson(lesson)}
                          className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center text-cyan-400 transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteLesson(lesson.id)}
                          className="w-7 h-7 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors">
                          {deletingLesson === lesson.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="p-3">
                    <button onClick={() => openAddLesson(phase.id)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed dark:border-white/10 border-slate-200 dark:text-slate-500 text-slate-400 hover:text-cyan-400 hover:border-cyan-500 transition-colors text-sm">
                      <Plus className="w-4 h-4" />إضافة درس
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {showAddPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold dark:text-white text-slate-900">{editPhase ? "تعديل المرحلة" : "إضافة مرحلة جديدة"}</h3>
              <button onClick={() => { setShowAddPhase(false); setEditPhase(null); }}><X className="w-5 h-5 dark:text-slate-400 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">اسم المرحلة</label>
                <input value={phaseForm.title} onChange={e => setPhaseForm(f => ({ ...f, title: e.target.value }))}
                  className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" placeholder="مثال: المرحلة الأولى - الأساسيات" />
              </div>
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">الوصف (اختياري)</label>
                <textarea value={phaseForm.description} onChange={e => setPhaseForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={savePhase} disabled={savingPhase} className="btn-primary flex-1 justify-center py-2">
                  {savingPhase ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}حفظ
                </button>
                <button onClick={() => { setShowAddPhase(false); setEditPhase(null); }} className="btn-secondary flex-1 justify-center py-2">إلغاء</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {isLessonFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-2xl shadow-2xl my-4">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <h3 className="font-bold dark:text-white text-slate-900">{editingLesson ? "تعديل الدرس" : "إضافة درس جديد"}</h3>
                {editingLesson && (
                  <button onClick={() => downloadLessonPdf(editingLesson)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    <Download className="w-3 h-3" />تحميل PDF
                  </button>
                )}
              </div>
              <button onClick={() => { setShowAddLesson(null); setEditingLesson(null); setBlocks([]); }}>
                <X className="w-5 h-5 dark:text-slate-400 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">عنوان الدرس</label>
                  <input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
                    className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" placeholder="مثال: مقدمة عن Python" />
                </div>
                <div>
                  <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">المدة</label>
                  <input value={lessonForm.duration} onChange={e => setLessonForm(f => ({ ...f, duration: e.target.value }))}
                    className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" placeholder="10:30" dir="ltr" />
                </div>
              </div>

              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-2">نوع الفيديو</label>
                <div className="flex gap-2">
                  {([["youtube", "يوتيوب"], ["upload", "رفع فيديو"], ["none", "بدون فيديو"]] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setLessonForm(f => ({ ...f, videoType: val }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${lessonForm.videoType === val ? "bg-cyan-500 text-white border-cyan-500" : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500"}`}>
                      {val === "youtube" && <Youtube className="w-3.5 h-3.5 inline-block ml-1" />}
                      {val === "upload" && <Upload className="w-3.5 h-3.5 inline-block ml-1" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {lessonForm.videoType === "youtube" && (
                <div>
                  <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">رابط يوتيوب</label>
                  <input value={lessonForm.videoUrl} onChange={e => setLessonForm(f => ({ ...f, videoUrl: e.target.value }))}
                    dir="ltr" className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" placeholder="https://youtube.com/watch?v=..." />
                </div>
              )}

              {lessonForm.videoType === "upload" && (
                <div>
                  <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">رفع فيديو</label>
                  <input ref={videoFileRef} type="file" accept="video/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleVideoUpload(e.target.files[0])} />
                  <div onClick={() => videoFileRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed dark:border-white/10 border-slate-200 rounded-xl p-4 text-center hover:border-cyan-500 transition-colors">
                    {videoUploading ? (
                      <div className="flex items-center justify-center gap-2 dark:text-slate-400 text-slate-500 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />جاري رفع الفيديو...
                      </div>
                    ) : lessonForm.videoObjectPath ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                        <Video className="w-4 h-4" />تم رفع الفيديو (اضغط لتغييره)
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 dark:text-slate-400 text-slate-500 text-sm">
                        <Upload className="w-6 h-6" /><span>اضغط لاختيار ملف فيديو</span>
                        <span className="text-xs opacity-60">MP4, MOV حتى 500MB</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">الشرح الكتابي (اختياري)</label>
                <textarea value={lessonForm.content} onChange={e => setLessonForm(f => ({ ...f, content: e.target.value }))}
                  rows={3} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 resize-none" placeholder="نص الشرح..." />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={lessonForm.isFree} onChange={e => setLessonForm(f => ({ ...f, isFree: e.target.checked }))} className="w-4 h-4 accent-cyan-400" />
                <span className="text-sm dark:text-slate-300 text-slate-700">درس مجاني (متاح بدون تسجيل)</span>
              </label>

              <div className="border-t dark:border-white/10 border-slate-100 pt-4">
                <p className="text-sm font-semibold dark:text-slate-300 text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />بلوكات المحتوى
                  <span className="text-xs font-normal dark:text-slate-500 text-slate-400">({blocks.length} بلوك)</span>
                </p>

                {blocks.map((block, idx) => (
                  <div key={block.id} className="mb-2 dark:bg-white/5 bg-slate-50 rounded-xl p-3 border dark:border-white/5 border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {block.type === "code" && <Code className="w-3.5 h-3.5 text-amber-400" />}
                        {block.type === "text" && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                        {block.type === "image" && <ImageIcon className="w-3.5 h-3.5 text-green-400" />}
                        <span className="text-xs dark:text-slate-400 text-slate-500">
                          {block.type === "code" ? `كود ${block.language ?? ""}` : block.type === "text" ? "نص" : "صورة"}
                        </span>
                      </div>
                      <button onClick={() => removeBlock(block.id)} className="text-red-400 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <pre className="text-xs dark:text-slate-300 text-slate-600 line-clamp-2 whitespace-pre-wrap">{block.content}</pre>
                  </div>
                ))}

                <div className="dark:bg-white/5 bg-slate-50 rounded-xl p-3 border dark:border-white/5 border-slate-100 space-y-3">
                  <div className="flex gap-2">
                    {(["text", "code", "image"] as BlockType[]).map(t => (
                      <button key={t} onClick={() => setNewBlock(b => ({ ...b, type: t }))}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${newBlock.type === t ? "bg-cyan-500 text-white" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500"}`}>
                        {t === "code" && <Code className="w-3 h-3" />}
                        {t === "text" && <FileText className="w-3 h-3" />}
                        {t === "image" && <ImageIcon className="w-3 h-3" />}
                        {t === "text" ? "نص" : t === "code" ? "كود" : "رابط صورة"}
                      </button>
                    ))}
                    {newBlock.type === "code" && (
                      <select value={newBlock.language} onChange={e => setNewBlock(b => ({ ...b, language: e.target.value }))}
                        className="mr-auto text-xs dark:bg-[#111827] bg-white border dark:border-white/10 border-slate-200 rounded-lg px-2 py-1 dark:text-slate-300 text-slate-600">
                        {["javascript", "python", "typescript", "java", "cpp", "css", "html", "sql", "bash"].map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <textarea value={newBlock.content} onChange={e => setNewBlock(b => ({ ...b, content: e.target.value }))}
                    rows={newBlock.type === "code" ? 4 : 2}
                    className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-cyan-500 resize-none ${newBlock.type === "code" ? "font-mono dark:bg-[#0f172a] bg-slate-900 dark:text-green-400 text-green-600 dark:border-white/10 border-slate-300" : "dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 dark:text-white text-slate-900"}`}
                    placeholder={newBlock.type === "code" ? "// اكتب الكود هنا..." : newBlock.type === "image" ? "رابط الصورة https://..." : "اكتب الشرح هنا..."} />
                  <button onClick={addBlock} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                    <Plus className="w-3 h-3" />إضافة البلوك
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={saveLesson} disabled={savingLesson || videoUploading} className="btn-primary flex-1 justify-center py-2.5">
                  {savingLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingLesson ? "جاري الحفظ..." : "حفظ الدرس"}
                </button>
                <button onClick={() => { setShowAddLesson(null); setEditingLesson(null); setBlocks([]); }} className="btn-secondary flex-1 justify-center py-2.5">إلغاء</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Layers({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}
