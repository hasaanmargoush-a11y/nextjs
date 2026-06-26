"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, uploadFile, type CoursePhase, type AdminLesson, type Quiz, type QuizQuestion, type LessonContentBlock } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit, ChevronDown, ChevronUp, Loader2,
  Save, X, Upload, Youtube, GripVertical, BookOpen,
  ClipboardList, Video, FileText, Code, Image as ImageIcon,
  CheckCircle, AlertCircle, ChevronRight, ChevronLeft,
  ArrowUp, ArrowDown, Lock, Unlock, MoreVertical
} from "lucide-react";

interface Props {
  courseId: number;
  phases: CoursePhase[];
  lessons: AdminLesson[];
  quizzes: Quiz[];
  onRefresh: () => void;
}

type VideoType = "youtube" | "upload" | "none";
type BlockType = "text" | "code" | "image";
type QType = "multiple_choice" | "true_false" | "short_answer";

type PhaseItem =
  | ({ _type: "lesson" } & AdminLesson)
  | ({ _type: "quiz" } & Quiz);

interface LessonForm { title: string; duration: string; isFree: boolean; videoType: VideoType; videoUrl: string; videoObjectPath: string; content: string; }
interface QuizForm { title: string; description: string; timeLimit: string; passingScore: number; isRequired: boolean; }
interface QuestionDraft { type: QType; question: string; explanation: string; points: number; options: { text: string; isCorrect: boolean }[]; }

const defaultLesson = (): LessonForm => ({ title: "", duration: "0:00", isFree: false, videoType: "youtube", videoUrl: "", videoObjectPath: "", content: "" });
const defaultQuiz = (): QuizForm => ({ title: "", description: "", timeLimit: "", passingScore: 60, isRequired: false });
const defaultQ = (): QuestionDraft => ({ type: "multiple_choice", question: "", explanation: "", points: 1, options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }] });

const inputCls = "input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm w-full";

function getImagePreviewSrc(content: string): string {
  if (!content) return "";
  if (content.startsWith("http://") || content.startsWith("https://") || content.startsWith("//")) return content;
  const path = content.startsWith("/") ? content : `/${content}`;
  return `/api/storage/objects${path}`;
}

export default function ContentTab({ courseId, phases, lessons, quizzes, onRefresh }: Props) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(phases[0]?.id ?? null);
  const [savingPhase, setSavingPhase] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const [phaseModal, setPhaseModal] = useState<{ open: boolean; phase?: CoursePhase }>({ open: false });
  const [phaseForm, setPhaseForm] = useState({ title: "", description: "", requireProgression: false });

  const [lessonModal, setLessonModal] = useState<{ open: boolean; phaseId: number | null; lesson?: AdminLesson } | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonForm>(defaultLesson());
  const [blocks, setBlocks] = useState<LessonContentBlock[]>([]);
  const [newBlock, setNewBlock] = useState<{ type: BlockType; content: string; language: string }>({ type: "text", content: "", language: "javascript" });
  const [savingLesson, setSavingLesson] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [editingBlock, setEditingBlock] = useState<{ id: number; content: string; language: string } | null>(null);
  const [reorderingBlock, setReorderingBlock] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const [quizModal, setQuizModal] = useState<{ open: boolean; phaseId: number | null; quiz?: Quiz } | null>(null);
  const [quizForm, setQuizForm] = useState<QuizForm>(defaultQuiz());
  const [questions, setQuestions] = useState<(QuizQuestion & { _draft?: QuestionDraft })[]>([]);
  const [showQForm, setShowQForm] = useState(false);
  const [qDraft, setQDraft] = useState<QuestionDraft>(defaultQ());
  const [savingQuiz, setSavingQuiz] = useState(false);

  // ---- UNIFIED PHASE ITEMS ----
  const getPhaseItems = (phaseId: number): PhaseItem[] => {
    const ls: PhaseItem[] = lessons.filter(l => l.phaseId === phaseId).map(l => ({ ...l, _type: "lesson" as const }));
    const qs: PhaseItem[] = quizzes.filter(q => q.phaseId === phaseId).map(q => ({ ...q, _type: "quiz" as const }));
    return [...ls, ...qs].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a._type === b._type) return a.id - b.id;
      return a._type === "lesson" ? -1 : 1;
    });
  };

  const finalQuizzes = quizzes.filter(q => !q.phaseId);

  const nextPhaseItemOrder = (phaseId: number): number => {
    const items = getPhaseItems(phaseId);
    if (items.length === 0) return 0;
    return Math.max(...items.map(i => i.order)) + 1;
  };

  const movePhaseItem = async (item: PhaseItem, direction: "up" | "down", phaseId: number) => {
    const items = getPhaseItems(phaseId);
    const idx = items.findIndex(i => i._type === item._type && i.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const swapItem = items[swapIdx]!;

    const myOrder = item.order;
    const theirOrder = swapItem.order === myOrder ? (direction === "up" ? myOrder - 1 : myOrder + 1) : swapItem.order;

    setReordering(true);
    try {
      const pA = item._type === "lesson"
        ? api.patch(`/admin/lessons/${item.id}`, { order: theirOrder })
        : api.patch(`/admin/quizzes/${item.id}`, { order: theirOrder });
      const pB = swapItem._type === "lesson"
        ? api.patch(`/admin/lessons/${swapItem.id}`, { order: myOrder })
        : api.patch(`/admin/quizzes/${swapItem.id}`, { order: myOrder });
      await Promise.all([pA, pB]);
      onRefresh();
    } catch { toast.error("فشل تحديث الترتيب"); }
    finally { setReordering(false); }
  };

  // ---- PHASE CRUD ----
  const openAddPhase = () => { setPhaseForm({ title: "", description: "", requireProgression: false }); setPhaseModal({ open: true }); };
  const openEditPhase = (phase: CoursePhase) => {
    setPhaseForm({ title: phase.title, description: phase.description ?? "", requireProgression: (phase as CoursePhase & { requireProgression?: boolean }).requireProgression ?? false });
    setPhaseModal({ open: true, phase });
  };
  const savePhase = async () => {
    if (!phaseForm.title.trim()) { toast.error("اسم المرحلة مطلوب"); return; }
    setSavingPhase(true);
    try {
      if (phaseModal.phase) { await api.patch(`/admin/phases/${phaseModal.phase.id}`, phaseForm); toast.success("تم تحديث المرحلة"); }
      else { await api.post(`/admin/courses/${courseId}/phases`, phaseForm); toast.success("تم إضافة المرحلة"); }
      setPhaseModal({ open: false });
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSavingPhase(false); }
  };
  const deletePhase = async (id: number) => {
    if (!confirm("حذف المرحلة سيحذف جميع دروسها واختباراتها. متأكد؟")) return;
    setDeletingId(id);
    try { await api.delete(`/admin/phases/${id}`); toast.success("تم الحذف"); onRefresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setDeletingId(null); }
  };

  // ---- LESSON CRUD ----
  const openAddLesson = (phaseId: number) => {
    setLessonForm({ ...defaultLesson() });
    setBlocks([]);
    setNewBlock({ type: "text", content: "", language: "javascript" });
    setEditingBlock(null);
    setLessonModal({ open: true, phaseId });
  };
  const openEditLesson = async (lesson: AdminLesson, phaseId: number) => {
    setLessonForm({
      title: lesson.title, duration: lesson.duration, isFree: lesson.isFree,
      videoType: (lesson.videoType as VideoType) ?? "youtube",
      videoUrl: lesson.videoUrl ?? "", videoObjectPath: lesson.videoObjectPath ?? "",
      content: lesson.content ?? "",
    });
    setEditingBlock(null);
    setLessonModal({ open: true, phaseId, lesson });
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

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const path = await uploadFile(file);
      setNewBlock(b => ({ ...b, content: path }));
      toast.success("تم رفع الصورة");
    } catch { toast.error("فشل رفع الصورة"); }
    finally { setImageUploading(false); }
  };

  const addBlock = async () => {
    if (newBlock.type !== "image" && !newBlock.content.trim()) { toast.error("المحتوى مطلوب"); return; }
    if (newBlock.type === "image" && !newBlock.content.trim()) { toast.error("يرجى رفع صورة أولاً"); return; }
    const lesson = lessonModal?.lesson;
    if (lesson) {
      try {
        const block = await api.post<LessonContentBlock>(`/admin/lessons/${lesson.id}/blocks`, {
          type: newBlock.type, content: newBlock.content,
          language: newBlock.type === "code" ? newBlock.language : null,
        });
        setBlocks(prev => [...prev, block]);
        setNewBlock(b => ({ ...b, content: "" }));
        toast.success("تم إضافة البلوك");
      } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    } else {
      const temp: LessonContentBlock = {
        id: -Date.now(), lessonId: 0, type: newBlock.type,
        content: newBlock.content, language: newBlock.type === "code" ? newBlock.language : null, order: blocks.length,
      };
      setBlocks(prev => [...prev, temp]);
      setNewBlock(b => ({ ...b, content: "" }));
    }
  };

  const removeBlock = async (blockId: number) => {
    if (blockId > 0) { try { await api.delete(`/admin/blocks/${blockId}`); } catch { toast.error("فشل الحذف"); return; } }
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  const moveBlock = async (blockId: number, direction: "up" | "down") => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx]!, newBlocks[idx]!];
    const reordered = newBlocks.map((b, i) => ({ ...b, order: i }));
    setBlocks(reordered);
    const lesson = lessonModal?.lesson;
    if (lesson && blockId > 0) {
      setReorderingBlock(true);
      try {
        await api.put(`/admin/lessons/${lesson.id}/blocks/reorder`, {
          items: reordered.filter(b => b.id > 0).map(b => ({ id: b.id, order: b.order })),
        });
      } catch { toast.error("فشل تحديث الترتيب"); }
      finally { setReorderingBlock(false); }
    }
  };

  const startEditBlock = (block: LessonContentBlock) => {
    setEditingBlock({ id: block.id, content: block.content, language: block.language ?? "javascript" });
  };

  const saveEditBlock = async () => {
    if (!editingBlock) return;
    if (editingBlock.id > 0) {
      try {
        const updated = await api.patch<LessonContentBlock>(`/admin/blocks/${editingBlock.id}`, {
          content: editingBlock.content, language: editingBlock.language || null,
        });
        setBlocks(prev => prev.map(b => b.id === editingBlock.id ? { ...b, content: updated.content, language: updated.language } : b));
        toast.success("تم تحديث البلوك");
      } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    } else {
      setBlocks(prev => prev.map(b => b.id === editingBlock.id ? { ...b, content: editingBlock.content, language: editingBlock.language } : b));
    }
    setEditingBlock(null);
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim()) { toast.error("عنوان الدرس مطلوب"); return; }
    setSavingLesson(true);
    try {
      const payload = {
        ...lessonForm, phaseId: lessonModal?.phaseId ?? null,
        videoUrl: lessonForm.videoType === "youtube" ? lessonForm.videoUrl : null,
        videoObjectPath: lessonForm.videoType === "upload" ? lessonForm.videoObjectPath : null,
        order: lessonModal?.lesson ? lessonModal.lesson.order : nextPhaseItemOrder(lessonModal?.phaseId ?? 0),
      };
      let lessonId: number;
      if (lessonModal?.lesson) {
        const updated = await api.patch<AdminLesson>(`/admin/lessons/${lessonModal.lesson.id}`, payload);
        lessonId = updated.id;
        for (const block of blocks) {
          if (block.id < 0) {
            await api.post(`/admin/lessons/${lessonId}/blocks`, { type: block.type, content: block.content, language: block.language });
          }
        }
        toast.success("تم تحديث الدرس");
      } else {
        const created = await api.post<AdminLesson>(`/admin/courses/${courseId}/lessons`, payload);
        lessonId = created.id;
        for (const block of blocks) {
          await api.post(`/admin/lessons/${lessonId}/blocks`, { type: block.type, content: block.content, language: block.language });
        }
        toast.success("تم إضافة الدرس");
      }
      setLessonModal(null);
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSavingLesson(false); }
  };

  const deleteLesson = async (id: number) => {
    if (!confirm("حذف الدرس؟")) return;
    setDeletingId(id);
    try { await api.delete(`/admin/lessons/${id}`); toast.success("تم حذف الدرس"); onRefresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setDeletingId(null); }
  };

  // ---- QUIZ CRUD ----
  const openAddQuiz = (phaseId: number | null) => {
    setQuizForm(defaultQuiz());
    setQuestions([]);
    setShowQForm(true);
    setQDraft(defaultQ());
    setQuizModal({ open: true, phaseId });
  };
  const openEditQuiz = useCallback(async (quiz: Quiz, phaseId: number | null) => {
    setQuizForm({ title: quiz.title, description: quiz.description ?? "", timeLimit: quiz.timeLimit ? String(quiz.timeLimit) : "", passingScore: quiz.passingScore, isRequired: quiz.isRequired });
    setShowQForm(false);
    setQDraft(defaultQ());
    setQuizModal({ open: true, phaseId, quiz });
    try {
      const full = await api.get<Quiz>(`/admin/quizzes/${quiz.id}`);
      setQuestions((full.questions ?? []) as (QuizQuestion & { _draft?: QuestionDraft })[]);
    } catch { setQuestions([]); }
  }, []);

  const deleteQuiz = async (id: number) => {
    if (!confirm("حذف الاختبار وجميع أسئلته؟")) return;
    setDeletingId(id);
    try { await api.delete(`/admin/quizzes/${id}`); toast.success("تم الحذف"); onRefresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setDeletingId(null); }
  };

  const addQuestionToDraft = () => {
    if (!qDraft.question.trim()) { toast.error("نص السؤال مطلوب"); return; }
    if (qDraft.type !== "short_answer" && !qDraft.options.some(o => o.isCorrect)) { toast.error("يجب تحديد إجابة صحيحة"); return; }
    if (qDraft.type !== "short_answer" && qDraft.options.some(o => !o.text.trim())) { toast.error("يرجى ملء جميع الخيارات"); return; }

    const tempQuestion: QuizQuestion & { _draft?: QuestionDraft } = {
      id: -Date.now(),
      quizId: 0,
      type: qDraft.type,
      question: qDraft.question,
      explanation: qDraft.explanation || null,
      points: qDraft.points,
      order: questions.length,
      options: qDraft.options.map((o, i) => ({ id: -i, questionId: 0, text: o.text, isCorrect: o.isCorrect, order: i })),
      _draft: { ...qDraft },
    };
    setQuestions(prev => [...prev, tempQuestion]);
    setQDraft(defaultQ());
    setShowQForm(false);
    toast.success("تم إضافة السؤال (سيتم حفظه مع الاختبار)");
  };

  const addQuestionToExisting = async (quizId: number) => {
    if (!qDraft.question.trim()) { toast.error("نص السؤال مطلوب"); return; }
    if (qDraft.type !== "short_answer" && !qDraft.options.some(o => o.isCorrect)) { toast.error("يجب تحديد إجابة صحيحة"); return; }
    try {
      const saved = await api.post<QuizQuestion>(`/admin/quizzes/${quizId}/questions`, {
        type: qDraft.type, question: qDraft.question, explanation: qDraft.explanation || null,
        points: qDraft.points, options: qDraft.type !== "short_answer" ? qDraft.options : [],
      });
      setQuestions(prev => [...prev, saved as (QuizQuestion & { _draft?: QuestionDraft })]);
      setQDraft(defaultQ());
      setShowQForm(false);
      toast.success("تم إضافة السؤال");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
  };

  const deleteQuestion = async (id: number) => {
    if (id < 0) { setQuestions(prev => prev.filter(q => q.id !== id)); return; }
    try { await api.delete(`/admin/questions/${id}`); setQuestions(prev => prev.filter(q => q.id !== id)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
  };

  const saveQuiz = async () => {
    if (!quizForm.title.trim()) { toast.error("عنوان الاختبار مطلوب"); return; }
    setSavingQuiz(true);
    try {
      if (quizModal?.quiz) {
        await api.patch(`/admin/quizzes/${quizModal.quiz.id}`, {
          ...quizForm, timeLimit: quizForm.timeLimit ? parseInt(quizForm.timeLimit) : null,
          phaseId: quizModal.phaseId,
        });
        toast.success("تم تحديث الاختبار");
      } else {
        const pendingDrafts = questions.filter(q => q.id < 0);
        const order = quizModal?.phaseId ? nextPhaseItemOrder(quizModal.phaseId) : 0;
        await api.post(`/admin/courses/${courseId}/quizzes`, {
          ...quizForm,
          timeLimit: quizForm.timeLimit ? parseInt(quizForm.timeLimit) : null,
          phaseId: quizModal?.phaseId,
          order,
          questions: pendingDrafts.map(q => ({
            type: q.type, question: q.question,
            explanation: q.explanation, points: q.points,
            options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
          })),
        });
        toast.success("تم إنشاء الاختبار مع أسئلته");
      }
      setQuizModal(null);
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSavingQuiz(false); }
  };

  return (
    <div className="space-y-4">
      {/* PHASES LIST */}
      {phases.length === 0 ? (
        <div className="text-center py-12 dark:text-slate-500 text-slate-400">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد مراحل بعد</p>
          <p className="text-sm mt-1">ابدأ بإضافة مرحلة للكورس</p>
        </div>
      ) : (
        phases.map((phase, pi) => {
          const phaseItems = getPhaseItems(phase.id);
          const isExpanded = expandedPhase === phase.id;
          return (
            <div key={phase.id} className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
              {/* Phase Header */}
              <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}>
                <button className="flex-shrink-0 p-1 dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors" onClick={e => { e.stopPropagation(); if (pi > 0) { /* move phase up logic could go here */ } }}>
                  <GripVertical className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">المرحلة {pi + 1}</span>
                    {(phase as CoursePhase & { requireProgression?: boolean }).requireProgression && (
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><Lock className="w-3 h-3" />تتابع إلزامي</span>
                    )}
                  </div>
                  <h3 className="font-bold dark:text-white text-slate-900 mt-0.5">{phase.title}</h3>
                  {phase.description && <p className="text-xs dark:text-slate-400 text-slate-500 truncate">{phase.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs dark:text-slate-500 text-slate-400">{phaseItems.length} عنصر</span>
                  <button onClick={e => { e.stopPropagation(); openEditPhase(phase); }}
                    className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-slate-100 transition-colors text-cyan-400">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deletePhase(phase.id); }}
                    className="p-1.5 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors text-red-400" disabled={deletingId === phase.id}>
                    {deletingId === phase.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 dark:text-slate-400 text-slate-500" /> : <ChevronDown className="w-4 h-4 dark:text-slate-400 text-slate-500" />}
                </div>
              </div>

              {/* Phase Items - Unified Order */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="border-t dark:border-white/10 border-slate-100 p-4 space-y-2">

                    {phaseItems.length === 0 ? (
                      <p className="text-sm dark:text-slate-500 text-slate-400 text-center py-4">لا يوجد محتوى في هذه المرحلة</p>
                    ) : (
                      phaseItems.map((item, idx) => (
                        <div key={`${item._type}-${item.id}`}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                            item._type === "lesson"
                              ? "dark:bg-blue-500/5 bg-blue-50 dark:border-blue-500/20 border-blue-100"
                              : "dark:bg-amber-500/5 bg-amber-50 dark:border-amber-500/20 border-amber-100"
                          }`}>
                          {/* Order Controls */}
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button onClick={() => movePhaseItem(item, "up", phase.id)} disabled={idx === 0 || reordering}
                              className="w-5 h-5 flex items-center justify-center rounded dark:hover:bg-white/10 hover:bg-white/50 disabled:opacity-30 transition-colors">
                              <ArrowUp className="w-3 h-3 dark:text-slate-400 text-slate-500" />
                            </button>
                            <button onClick={() => movePhaseItem(item, "down", phase.id)} disabled={idx === phaseItems.length - 1 || reordering}
                              className="w-5 h-5 flex items-center justify-center rounded dark:hover:bg-white/10 hover:bg-white/50 disabled:opacity-30 transition-colors">
                              <ArrowDown className="w-3 h-3 dark:text-slate-400 text-slate-500" />
                            </button>
                          </div>

                          {/* Item Type Badge */}
                          <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                            item._type === "lesson" ? "bg-blue-500/20" : "bg-amber-500/20"
                          }`}>
                            {item._type === "lesson"
                              ? <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                              : <ClipboardList className="w-3.5 h-3.5 text-amber-400" />}
                          </div>

                          {/* Order Number */}
                          <span className="text-xs dark:text-slate-500 text-slate-400 flex-shrink-0 w-5 text-center">{idx + 1}</span>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium dark:text-white text-slate-900 truncate">{item.title}</p>
                            <p className="text-xs dark:text-slate-500 text-slate-400">
                              {item._type === "lesson"
                                ? `${(item as AdminLesson).duration} · ${(item as AdminLesson).isFree ? "مجاني" : "مدفوع"}`
                                : `اختبار · ${(item as Quiz).passingScore}% للنجاح${(item as Quiz).isRequired ? " · إلزامي" : ""}`}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => item._type === "lesson" ? openEditLesson(item as AdminLesson, phase.id) : openEditQuiz(item as Quiz, phase.id)}
                              className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-white/50 transition-colors text-cyan-400">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => item._type === "lesson" ? deleteLesson(item.id) : deleteQuiz(item.id)}
                              className="p-1.5 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors text-red-400" disabled={deletingId === item.id}>
                              {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Add Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => openAddLesson(phase.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl dark:bg-blue-500/10 bg-blue-50 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm border dark:border-blue-500/20 border-blue-100">
                        <Plus className="w-4 h-4" />إضافة درس
                      </button>
                      <button onClick={() => openAddQuiz(phase.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl dark:bg-amber-500/10 bg-amber-50 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm border dark:border-amber-500/20 border-amber-100">
                        <Plus className="w-4 h-4" />إضافة اختبار
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })
      )}

      {/* Final Quizzes */}
      {finalQuizzes.length > 0 && (
        <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-emerald-500/30 border-emerald-100 overflow-hidden">
          <div className="p-4 border-b dark:border-white/10 border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">اختبار نهائي</span>
                <h3 className="font-bold dark:text-white text-slate-900 mt-1">اختبارات نهاية الكورس</h3>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {finalQuizzes.map(quiz => (
              <div key={quiz.id} className="flex items-center gap-3 p-3 rounded-xl dark:bg-emerald-500/5 bg-emerald-50 dark:border dark:border-emerald-500/20">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium dark:text-white text-slate-900">{quiz.title}</p>
                  <p className="text-xs dark:text-slate-500 text-slate-400">{quiz.passingScore}% للنجاح{quiz.isRequired ? " · إلزامي" : ""}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditQuiz(quiz, null)} className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-white/50 transition-colors text-cyan-400"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteQuiz(quiz.id)} className="p-1.5 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button onClick={openAddPhase}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-medium shadow-lg hover:shadow-cyan-500/20 transition-all">
          <Plus className="w-4 h-4" />إضافة مرحلة جديدة
        </button>
        <button onClick={() => openAddQuiz(null)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl dark:bg-emerald-500/10 bg-emerald-50 text-emerald-400 text-sm font-medium border dark:border-emerald-500/20 border-emerald-100 hover:bg-emerald-500/20 transition-all">
          <Plus className="w-4 h-4" />إضافة اختبار نهائي
        </button>
      </div>

      {/* ---- PHASE MODAL ---- */}
      {phaseModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold dark:text-white text-slate-900">{phaseModal.phase ? "تعديل المرحلة" : "إضافة مرحلة جديدة"}</h3>
              <button onClick={() => setPhaseModal({ open: false })}><X className="w-5 h-5 dark:text-slate-400 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">اسم المرحلة <span className="text-red-400">*</span></label>
                <input value={phaseForm.title} onChange={e => setPhaseForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="مثال: أساسيات البرمجة" autoFocus />
              </div>
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">الوصف</label>
                <textarea value={phaseForm.description} onChange={e => setPhaseForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl dark:bg-amber-500/5 bg-amber-50 dark:border dark:border-amber-500/20 border-amber-100">
                <input type="checkbox" checked={phaseForm.requireProgression} onChange={e => setPhaseForm(f => ({ ...f, requireProgression: e.target.checked }))} className="w-4 h-4 accent-amber-400" />
                <div>
                  <p className="text-sm dark:text-slate-300 text-slate-700">تتابع إلزامي <Lock className="w-3 h-3 text-amber-400 inline mb-0.5 mr-1" /></p>
                  <p className="text-xs dark:text-slate-500 text-slate-400">المستخدم يجب أن يكمل كل عنصر قبل الانتقال للتالي</p>
                </div>
              </label>
              <div className="flex gap-2">
                <button onClick={savePhase} disabled={savingPhase} className="btn-primary flex-1 justify-center py-2.5">
                  {savingPhase ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}حفظ
                </button>
                <button onClick={() => setPhaseModal({ open: false })} className="btn-secondary flex-1 justify-center py-2.5">إلغاء</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ---- LESSON MODAL ---- */}
      {lessonModal?.open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-2xl shadow-2xl my-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold dark:text-white text-slate-900 text-lg">{lessonModal.lesson ? "تعديل الدرس" : "إضافة درس جديد"}</h3>
              <button onClick={() => { setLessonModal(null); setBlocks([]); setEditingBlock(null); }}><X className="w-5 h-5 dark:text-slate-400 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">عنوان الدرس <span className="text-red-400">*</span></label>
                <input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} className={inputCls} autoFocus /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">المدة</label>
                  <input value={lessonForm.duration} onChange={e => setLessonForm(f => ({ ...f, duration: e.target.value }))} className={inputCls} placeholder="مثال: 12:30" /></div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={lessonForm.isFree} onChange={e => setLessonForm(f => ({ ...f, isFree: e.target.checked }))} className="w-4 h-4 accent-cyan-400" />
                    <span className="text-sm dark:text-slate-300 text-slate-700">درس مجاني (تجريبي)</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-2">مصدر الفيديو</label>
                <div className="flex gap-2 mb-3">
                  {(["youtube", "upload", "none"] as VideoType[]).map(t => (
                    <button key={t} onClick={() => setLessonForm(f => ({ ...f, videoType: t }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${lessonForm.videoType === t ? "bg-cyan-500 text-white border-cyan-500" : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500"}`}>
                      {t === "youtube" ? <Youtube className="w-3.5 h-3.5" /> : t === "upload" ? <Upload className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                      {t === "youtube" ? "يوتيوب" : t === "upload" ? "رفع ملف" : "بدون فيديو"}
                    </button>
                  ))}
                </div>
                {lessonForm.videoType === "youtube" && (
                  <input value={lessonForm.videoUrl} onChange={e => setLessonForm(f => ({ ...f, videoUrl: e.target.value }))} className={inputCls} placeholder="رابط اليوتيوب..." dir="ltr" />
                )}
                {lessonForm.videoType === "upload" && (
                  <div>
                    <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && handleVideoUpload(e.target.files[0])} />
                    <div onClick={() => videoRef.current?.click()} className="cursor-pointer border-2 border-dashed dark:border-white/10 border-slate-200 rounded-xl p-4 text-center hover:border-cyan-500 transition-colors">
                      {videoUploading ? <div className="flex items-center justify-center gap-2 dark:text-slate-400 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin text-cyan-400" />جاري رفع الفيديو...</div>
                        : lessonForm.videoObjectPath ? <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm"><CheckCircle className="w-4 h-4" />تم رفع الفيديو ✓ (اضغط لتغييره)</div>
                        : <div className="flex flex-col items-center gap-1 dark:text-slate-400 text-slate-500 text-sm"><Upload className="w-6 h-6" /><span>اضغط لرفع الفيديو</span><span className="text-xs opacity-60">MP4, MOV, AVI (حتى 500MB)</span></div>}
                    </div>
                  </div>
                )}
              </div>

              {/* Content Blocks */}
              <div className="border-t dark:border-white/10 border-slate-100 pt-4">
                <p className="text-sm font-semibold dark:text-slate-300 text-slate-700 mb-3">محتوى الدرس ({blocks.length} بلوك)</p>
                {blocks.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {blocks.map((block, bi) => (
                      <div key={block.id} className="rounded-xl overflow-hidden">
                        {editingBlock?.id === block.id ? (
                          <div className="dark:bg-[#0a0f1e] bg-slate-50 p-3 space-y-2 border dark:border-white/10 border-slate-200 rounded-xl">
                            {block.type === "image" ? (
                              <div className="text-xs dark:text-slate-400 text-slate-500">تعديل الصورة غير متاح مباشرة - احذف هذا البلوك وأضف صورة جديدة</div>
                            ) : (
                              <textarea value={editingBlock.content} onChange={e => setEditingBlock(b => b ? { ...b, content: e.target.value } : b)}
                                rows={3} dir={block.type === "code" ? "ltr" : "rtl"}
                                className={`${inputCls} resize-none ${block.type === "code" ? "font-mono text-xs" : ""}`} />
                            )}
                            <div className="flex gap-2">
                              <button onClick={saveEditBlock} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-xs">
                                <Save className="w-3 h-3" />حفظ
                              </button>
                              <button onClick={() => setEditingBlock(null)} className="flex-1 flex items-center justify-center py-1.5 rounded-lg dark:bg-white/5 bg-slate-200 dark:text-slate-400 text-slate-600 text-xs">إلغاء</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 dark:bg-white/5 bg-slate-50 rounded-xl p-3">
                            <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
                              <button onClick={() => moveBlock(block.id, "up")} disabled={bi === 0 || reorderingBlock} className="w-5 h-5 rounded flex items-center justify-center dark:hover:bg-white/10 hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronRight className="w-3 h-3 dark:text-slate-400 text-slate-500 -rotate-90" /></button>
                              <button onClick={() => moveBlock(block.id, "down")} disabled={bi === blocks.length - 1 || reorderingBlock} className="w-5 h-5 rounded flex items-center justify-center dark:hover:bg-white/10 hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronLeft className="w-3 h-3 dark:text-slate-400 text-slate-500 -rotate-90" /></button>
                            </div>
                            <div className="flex-shrink-0 mt-0.5">
                              {block.type === "code" ? <Code className="w-4 h-4 text-purple-400" /> : block.type === "image" ? <ImageIcon className="w-4 h-4 text-pink-400" /> : <FileText className="w-4 h-4 text-blue-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs dark:text-slate-500 text-slate-400 mb-1">{block.type === "code" ? `كود (${block.language ?? "js"})` : block.type === "image" ? "صورة" : "نص"}</p>
                              {block.type === "image" ? (
                                <img src={getImagePreviewSrc(block.content)} alt="preview" className="rounded-lg max-h-20 max-w-full" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <p className={`text-sm dark:text-slate-300 text-slate-700 line-clamp-2 break-all ${block.type === "code" ? "font-mono text-xs" : ""}`}>{block.content}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <button onClick={() => startEditBlock(block)} className="w-6 h-6 rounded flex items-center justify-center text-cyan-400 dark:hover:bg-white/10 hover:bg-slate-200 transition-colors"><Edit className="w-3 h-3" /></button>
                              <button onClick={() => removeBlock(block.id)} className="w-6 h-6 rounded flex items-center justify-center text-red-400 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors"><X className="w-3 h-3" /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="dark:bg-white/5 bg-slate-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs dark:text-slate-500 text-slate-400 mb-2">إضافة بلوك جديد</p>
                  <div className="flex gap-2">
                    {(["text", "code", "image"] as BlockType[]).map(t => (
                      <button key={t} onClick={() => setNewBlock(b => ({ ...b, type: t, content: "" }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${newBlock.type === t ? "bg-cyan-500 text-white border-cyan-500" : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500"}`}>
                        {t === "text" ? "📝 نص" : t === "code" ? "💻 كود" : "🖼️ صورة"}
                      </button>
                    ))}
                  </div>
                  {newBlock.type === "code" && (
                    <select value={newBlock.language} onChange={e => setNewBlock(b => ({ ...b, language: e.target.value }))} className={`${inputCls} text-xs`}>
                      {["javascript", "python", "typescript", "java", "c", "cpp", "php", "sql", "html", "css", "bash"].map(l => (
                        <option key={l} value={l} className="dark:bg-[#111827]">{l}</option>
                      ))}
                    </select>
                  )}
                  {newBlock.type === "image" ? (
                    <div>
                      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                      {newBlock.content && (
                        <div className="mb-2 relative">
                          <img src={getImagePreviewSrc(newBlock.content)} alt="preview" className="rounded-lg max-h-32 mx-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <button onClick={() => setNewBlock(b => ({ ...b, content: "" }))} className="absolute top-1 left-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"><X className="w-3 h-3" /></button>
                        </div>
                      )}
                      <div onClick={() => imageRef.current?.click()} className="cursor-pointer border-2 border-dashed dark:border-white/10 border-slate-200 rounded-xl p-4 text-center hover:border-cyan-500 transition-colors">
                        {imageUploading ? <div className="flex items-center justify-center gap-2 dark:text-slate-400 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin text-cyan-400" />جاري رفع الصورة...</div>
                          : newBlock.content ? <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm"><ImageIcon className="w-4 h-4" />تم رفع الصورة ✓</div>
                          : <div className="flex flex-col items-center gap-1 dark:text-slate-400 text-slate-500 text-sm"><ImageIcon className="w-6 h-6" /><span>اضغط لاختيار صورة</span><span className="text-xs opacity-60">PNG, JPG, GIF, WebP</span></div>}
                      </div>
                    </div>
                  ) : (
                    <textarea value={newBlock.content} onChange={e => setNewBlock(b => ({ ...b, content: e.target.value }))} rows={3}
                      dir={newBlock.type === "code" ? "ltr" : "rtl"}
                      className={`${inputCls} resize-none ${newBlock.type === "code" ? "font-mono text-xs" : ""}`}
                      placeholder={newBlock.type === "code" ? "print('Hello World')" : "أضف نص توضيحي..."} />
                  )}
                  <button onClick={addBlock} disabled={imageUploading} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-sm disabled:opacity-50">
                    <Plus className="w-4 h-4" />إضافة البلوك
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={saveLesson} disabled={savingLesson || videoUploading} className="btn-primary flex-1 justify-center py-2.5">
                  {savingLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}حفظ الدرس
                </button>
                <button onClick={() => { setLessonModal(null); setBlocks([]); setEditingBlock(null); }} className="btn-secondary flex-1 justify-center py-2.5">إلغاء</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ---- QUIZ MODAL (SINGLE PAGE CREATOR) ---- */}
      {quizModal?.open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-2xl shadow-2xl my-8">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold dark:text-white text-slate-900 text-lg">
                  {quizModal.quiz ? "تعديل الاختبار" : "إنشاء اختبار جديد"}
                </h3>
                {quizModal.phaseId === null && <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">اختبار نهائي</span>}
              </div>
              <button onClick={() => setQuizModal(null)}><X className="w-5 h-5 dark:text-slate-400 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              {/* Quiz Info */}
              <div className="dark:bg-white/5 bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold dark:text-slate-400 text-slate-500 uppercase tracking-wide">معلومات الاختبار</p>
                <div>
                  <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">عنوان الاختبار <span className="text-red-400">*</span></label>
                  <input value={quizForm.title} onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="مثال: اختبار المرحلة الأولى" autoFocus />
                </div>
                <div>
                  <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">الوصف</label>
                  <textarea value={quizForm.description} onChange={e => setQuizForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">درجة النجاح (%)</label>
                    <input type="number" min={0} max={100} value={quizForm.passingScore} onChange={e => setQuizForm(f => ({ ...f, passingScore: Number(e.target.value) }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">وقت الاختبار (دقيقة)</label>
                    <input type="number" min={0} value={quizForm.timeLimit} onChange={e => setQuizForm(f => ({ ...f, timeLimit: e.target.value }))} className={inputCls} placeholder="بدون حد" />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={quizForm.isRequired} onChange={e => setQuizForm(f => ({ ...f, isRequired: e.target.checked }))} className="w-4 h-4 accent-amber-400" />
                  <span className="text-sm dark:text-slate-300 text-slate-700">اختبار إلزامي (يجب اجتيازه للمتابعة)</span>
                </label>
              </div>

              {/* Questions Section - Always Shown */}
              <div className="border-t dark:border-white/10 border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold dark:text-slate-300 text-slate-700">الأسئلة</p>
                    <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                      {questions.filter(q => q.id < 0).length > 0 && `${questions.filter(q => q.id < 0).length} سؤال جديد (سيتم حفظه مع الاختبار)`}
                      {questions.filter(q => q.id > 0).length > 0 && ` · ${questions.filter(q => q.id > 0).length} محفوظ`}
                    </p>
                  </div>
                  <button onClick={() => setShowQForm(!showQForm)}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                    <Plus className="w-3.5 h-3.5" />إضافة سؤال
                  </button>
                </div>

                {/* Existing/Draft Questions */}
                {questions.map((q, qi) => (
                  <div key={q.id} className={`p-3 rounded-xl mb-2 flex items-start gap-2 ${q.id < 0 ? "dark:bg-cyan-500/5 bg-cyan-50 dark:border dark:border-cyan-500/20 border-cyan-100" : "dark:bg-white/5 bg-slate-50"}`}>
                    {q.id < 0 && <span className="text-xs text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">جديد</span>}
                    <span className="text-xs font-bold dark:text-slate-400 text-slate-500 mt-0.5 flex-shrink-0">{qi + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm dark:text-white text-slate-900">{q.question}</p>
                      <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                        {q.type === "multiple_choice" ? "اختيار متعدد" : q.type === "true_false" ? "صح/خطأ" : "إجابة قصيرة"}
                        {" · "}{q.points} {q.points === 1 ? "نقطة" : "نقاط"}
                        {q.options && q.options.length > 0 && ` · ${q.options.length} خيارات`}
                      </p>
                    </div>
                    <button onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-500 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                ))}

                {/* Question Form */}
                {showQForm && (
                  <div className="dark:bg-[#0a0f1e] bg-slate-50 rounded-xl p-4 space-y-3 border dark:border-white/10 border-slate-200 mt-2">
                    <p className="text-xs font-bold dark:text-slate-400 text-slate-500">نوع السؤال</p>
                    <div className="flex gap-2">
                      {(["multiple_choice", "true_false", "short_answer"] as QType[]).map(t => (
                        <button key={t} onClick={() => {
                          setQDraft(d => ({ ...d, type: t, options: t === "true_false" ? [{ text: "صحيح", isCorrect: true }, { text: "خطأ", isCorrect: false }] : t === "multiple_choice" ? defaultQ().options : [] }));
                        }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${qDraft.type === t ? "bg-cyan-500 text-white border-cyan-500" : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500"}`}>
                          {t === "multiple_choice" ? "اختيار متعدد" : t === "true_false" ? "صح / خطأ" : "إجابة قصيرة"}
                        </button>
                      ))}
                    </div>
                    <textarea value={qDraft.question} onChange={e => setQDraft(d => ({ ...d, question: e.target.value }))} rows={2} className={`${inputCls} resize-none`} placeholder="نص السؤال..." />
                    {qDraft.type !== "short_answer" && (
                      <div className="space-y-1.5">
                        <p className="text-xs dark:text-slate-400 text-slate-500">الخيارات (علّم الإجابة الصحيحة)</p>
                        {qDraft.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input type="radio" name="correct" checked={opt.isCorrect}
                              onChange={() => setQDraft(d => ({ ...d, options: d.options.map((o, i) => ({ ...o, isCorrect: i === oi })) }))}
                              className="accent-green-400 w-4 h-4 flex-shrink-0" />
                            <input value={opt.text} onChange={e => setQDraft(d => ({ ...d, options: d.options.map((o, i) => i === oi ? { ...o, text: e.target.value } : o) }))}
                              className={`${inputCls} flex-1`} placeholder={`الخيار ${oi + 1}`} disabled={qDraft.type === "true_false"} />
                          </div>
                        ))}
                      </div>
                    )}
                    {qDraft.type === "short_answer" && (
                      <div>
                        <label className="text-xs dark:text-slate-400 text-slate-500 mb-1 block">تلميح / توضيح (اختياري)</label>
                        <input value={qDraft.explanation} onChange={e => setQDraft(d => ({ ...d, explanation: e.target.value }))} className={inputCls} placeholder="مثال: الإجابة تبدأ بـ..." />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="text-xs dark:text-slate-400 text-slate-500">النقاط:</label>
                      <input type="number" min={1} value={qDraft.points} onChange={e => setQDraft(d => ({ ...d, points: Number(e.target.value) }))} className={`${inputCls} w-20`} />
                      <button onClick={() => quizModal.quiz ? addQuestionToExisting(quizModal.quiz.id) : addQuestionToDraft()}
                        className="mr-auto btn-primary text-xs py-1.5 px-3"><CheckCircle className="w-3.5 h-3.5" />إضافة</button>
                      <button onClick={() => setShowQForm(false)} className="text-xs dark:text-slate-400 text-slate-500 hover:text-red-400"><AlertCircle className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={saveQuiz} disabled={savingQuiz} className="btn-primary flex-1 justify-center py-2.5">
                  {savingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {quizModal.quiz ? "حفظ التعديلات" : `حفظ الاختبار${questions.filter(q => q.id < 0).length > 0 ? ` مع ${questions.filter(q => q.id < 0).length} سؤال` : ""}`}
                </button>
                <button onClick={() => setQuizModal(null)} className="btn-secondary flex-1 justify-center py-2.5">إلغاء</button>
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
