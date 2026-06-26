"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type CoursePhase, type Quiz, type QuizQuestion } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit, Loader2, Save, X,
  ClipboardList, Clock, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, GripVertical, Circle
} from "lucide-react";

interface Props {
  courseId: number;
  phases: CoursePhase[];
  quizzes: Quiz[];
  onRefresh: () => void;
}

type QType = "multiple_choice" | "true_false" | "short_answer";

interface NewOption { text: string; isCorrect: boolean; }
interface NewQuestion {
  type: QType;
  question: string;
  explanation: string;
  points: number;
  options: NewOption[];
}

const emptyQuestion = (): NewQuestion => ({
  type: "multiple_choice",
  question: "",
  explanation: "",
  points: 1,
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
});

const TYPE_LABELS: Record<QType, string> = {
  multiple_choice: "اختيار متعدد",
  true_false: "صح / خطأ",
  short_answer: "إجابة قصيرة",
};

const TYPE_ICONS: Record<QType, string> = {
  multiple_choice: "⊙",
  true_false: "ص/خ",
  short_answer: "نص",
};

export default function QuizzesTab({ courseId, phases, quizzes, onRefresh }: Props) {
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editQuiz, setEditQuiz] = useState<Quiz | null>(null);
  const [quizForm, setQuizForm] = useState({
    title: "", description: "", phaseId: "" as string | number,
    timeLimit: "" as string | number, passingScore: 60, isRequired: false,
  });
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [deletingQuiz, setDeletingQuiz] = useState<number | null>(null);

  const [fullQuiz, setFullQuiz] = useState<Quiz | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editQuestion, setEditQuestion] = useState<QuizQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState<NewQuestion>(emptyQuestion());
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<number | null>(null);

  const openAddQuiz = () => {
    setEditQuiz(null);
    setQuizForm({ title: "", description: "", phaseId: "", timeLimit: "", passingScore: 60, isRequired: false });
    setShowQuizForm(true);
  };

  const openEditQuiz = (quiz: Quiz) => {
    setEditQuiz(quiz);
    setQuizForm({
      title: quiz.title, description: quiz.description ?? "",
      phaseId: quiz.phaseId ?? "", timeLimit: quiz.timeLimit ?? "",
      passingScore: quiz.passingScore, isRequired: quiz.isRequired,
    });
    setShowQuizForm(true);
  };

  const saveQuiz = async () => {
    if (!quizForm.title.trim()) { toast.error("عنوان الاختبار مطلوب"); return; }
    setSavingQuiz(true);
    try {
      const payload = {
        title: quizForm.title, description: quizForm.description || null,
        phaseId: quizForm.phaseId ? Number(quizForm.phaseId) : null,
        timeLimit: quizForm.timeLimit ? Number(quizForm.timeLimit) : null,
        passingScore: quizForm.passingScore, isRequired: quizForm.isRequired,
      };
      if (editQuiz) {
        await api.patch(`/admin/quizzes/${editQuiz.id}`, payload);
        toast.success("تم تحديث الاختبار");
      } else {
        await api.post(`/admin/courses/${courseId}/quizzes`, payload);
        toast.success("تم إضافة الاختبار");
      }
      setShowQuizForm(false); setEditQuiz(null); onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSavingQuiz(false); }
  };

  const deleteQuiz = async (id: number) => {
    if (!confirm("حذف الاختبار وجميع أسئلته؟")) return;
    setDeletingQuiz(id);
    try { await api.delete(`/admin/quizzes/${id}`); toast.success("تم الحذف"); onRefresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setDeletingQuiz(null); }
  };

  const expandQuiz = async (quizId: number) => {
    if (expandedQuiz === quizId) { setExpandedQuiz(null); return; }
    setExpandedQuiz(quizId);
    setShowQuestionForm(false);
    setLoadingQuiz(true);
    try {
      const data = await api.get<Quiz>(`/admin/quizzes/${quizId}`);
      setFullQuiz(data);
    } catch { toast.error("تعذّر تحميل الأسئلة"); }
    finally { setLoadingQuiz(false); }
  };

  const openAddQuestion = () => {
    setEditQuestion(null);
    setNewQuestion(emptyQuestion());
    setShowQuestionForm(true);
  };

  const openEditQuestion = (q: QuizQuestion) => {
    setEditQuestion(q);
    setNewQuestion({
      type: q.type as QType,
      question: q.question,
      explanation: q.explanation ?? "",
      points: q.points,
      options: q.options?.length > 0
        ? q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect }))
        : [{ text: "", isCorrect: true }, { text: "", isCorrect: false }],
    });
    setShowQuestionForm(true);
  };

  const changeQuestionType = (type: QType) => {
    let opts: NewOption[];
    if (type === "true_false") {
      opts = [{ text: "صح", isCorrect: true }, { text: "خطأ", isCorrect: false }];
    } else if (type === "short_answer") {
      opts = [];
    } else {
      opts = newQuestion.type !== "multiple_choice"
        ? [{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]
        : newQuestion.options;
    }
    setNewQuestion(q => ({ ...q, type, options: opts }));
  };

  const setOptionCorrect = (idx: number) => {
    setNewQuestion(q => ({
      ...q,
      options: q.options.map((o, i) => ({ ...o, isCorrect: i === idx })),
    }));
  };

  const updateOptionText = (idx: number, text: string) => {
    setNewQuestion(q => ({ ...q, options: q.options.map((o, i) => i === idx ? { ...o, text } : o) }));
  };

  const addOption = () => {
    setNewQuestion(q => ({ ...q, options: [...q.options, { text: "", isCorrect: false }] }));
  };

  const removeOption = (idx: number) => {
    setNewQuestion(q => ({ ...q, options: q.options.filter((_, i) => i !== idx) }));
  };

  const validateQuestion = (): string | null => {
    if (!newQuestion.question.trim()) return "نص السؤال مطلوب";
    if (newQuestion.type !== "short_answer") {
      if (newQuestion.options.some(o => !o.text.trim())) return "يرجى ملء جميع الخيارات";
      if (!newQuestion.options.some(o => o.isCorrect)) return "يرجى تحديد إجابة صحيحة واحدة على الأقل";
    }
    return null;
  };

  const saveQuestion = async () => {
    if (!fullQuiz) return;
    const err = validateQuestion();
    if (err) { toast.error(err); return; }
    setSavingQuestion(true);
    try {
      const payload = {
        type: newQuestion.type,
        question: newQuestion.question,
        explanation: newQuestion.explanation || null,
        points: newQuestion.points,
        options: newQuestion.type !== "short_answer" ? newQuestion.options : [],
      };
      if (editQuestion) {
        await api.patch(`/admin/questions/${editQuestion.id}`, payload);
        toast.success("تم تحديث السؤال");
      } else {
        await api.post(`/admin/quizzes/${fullQuiz.id}/questions`, payload);
        toast.success("تم إضافة السؤال");
      }
      setShowQuestionForm(false);
      setEditQuestion(null);
      const updated = await api.get<Quiz>(`/admin/quizzes/${fullQuiz.id}`);
      setFullQuiz(updated);
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSavingQuestion(false); }
  };

  const deleteQuestion = async (qid: number) => {
    if (!fullQuiz || !confirm("حذف السؤال؟")) return;
    setDeletingQuestion(qid);
    try {
      await api.delete(`/admin/questions/${qid}`);
      setFullQuiz(f => f ? { ...f, questions: f.questions?.filter(q => q.id !== qid) } : null);
      toast.success("تم الحذف");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setDeletingQuestion(null); }
  };

  const getPhaseTitle = (phaseId: number | null | undefined) => {
    if (!phaseId) return null;
    return phases.find(p => p.id === phaseId)?.title ?? null;
  };

  const currentQuestions = expandedQuiz === fullQuiz?.id ? fullQuiz?.questions ?? [] : [];
  const inputCls = "w-full px-3 py-2 rounded-xl border dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm transition-colors";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold dark:text-white text-slate-900">الاختبارات</h2>
          <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">أضف اختبارات لتقييم الطلاب بعد كل مرحلة</p>
        </div>
        <button onClick={openAddQuiz} className="btn-primary text-sm py-2 px-4">
          <Plus className="w-4 h-4" />إضافة اختبار
        </button>
      </div>

      {quizzes.length === 0 && (
        <div className="text-center py-16 dark:bg-[#111827] bg-white rounded-2xl border border-dashed dark:border-white/10 border-slate-200">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 dark:text-slate-700 text-slate-300" />
          <p className="font-semibold dark:text-slate-400 text-slate-500 mb-1">لا توجد اختبارات بعد</p>
          <p className="text-sm dark:text-slate-600 text-slate-400">أضف اختباراً وابدأ في إضافة الأسئلة</p>
        </div>
      )}

      {quizzes.map((quiz) => (
        <div key={quiz.id} className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
          {/* Quiz Header */}
          <div className="flex items-center gap-3 p-4 cursor-pointer hover:dark:bg-white/5 hover:bg-slate-50 transition-colors"
            onClick={() => expandQuiz(quiz.id)}>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold dark:text-white text-slate-900">{quiz.title}</h3>
                {quiz.isRequired && (
                  <span className="text-xs bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-md border border-red-500/20 flex items-center gap-0.5">
                    <AlertCircle className="w-3 h-3" />إلزامي
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {getPhaseTitle(quiz.phaseId) && (
                  <span className="text-xs dark:text-slate-500 text-slate-400">{getPhaseTitle(quiz.phaseId)}</span>
                )}
                {quiz.timeLimit && (
                  <span className="text-xs flex items-center gap-0.5 dark:text-slate-500 text-slate-400">
                    <Clock className="w-3 h-3" />{quiz.timeLimit} دقيقة
                  </span>
                )}
                <span className="text-xs dark:text-slate-500 text-slate-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-400" />نجاح: {quiz.passingScore}%
                </span>
                {quiz.questions && (
                  <span className="text-xs dark:text-slate-500 text-slate-400">{quiz.questions.length} سؤال</span>
                )}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); openEditQuiz(quiz); }}
                className="w-8 h-8 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); deleteQuiz(quiz.id); }}
                className="w-8 h-8 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors">
                {deletingQuiz === quiz.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
              {expandedQuiz === quiz.id
                ? <ChevronUp className="w-4 h-4 dark:text-slate-400 text-slate-500 mt-2" />
                : <ChevronDown className="w-4 h-4 dark:text-slate-400 text-slate-500 mt-2" />}
            </div>
          </div>

          {/* Questions Panel */}
          <AnimatePresence>
            {expandedQuiz === quiz.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="border-t dark:border-white/5 border-slate-100">
                  {loadingQuiz ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {currentQuestions.length === 0 && !showQuestionForm && (
                        <div className="text-center py-8 rounded-xl dark:bg-white/5 bg-slate-50 border border-dashed dark:border-white/10 border-slate-200">
                          <p className="text-sm dark:text-slate-500 text-slate-400">لا توجد أسئلة — اضغط "إضافة سؤال" للبدء</p>
                        </div>
                      )}

                      {currentQuestions.map((q, idx) => (
                        <div key={q.id} className="dark:bg-[#0d1117] bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200 overflow-hidden">
                          <div className="flex items-start gap-3 p-3">
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-sm font-medium dark:text-white text-slate-900 leading-snug">{q.question}</p>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button onClick={() => openEditQuestion(q)}
                                    className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors">
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteQuestion(q.id)}
                                    className="w-7 h-7 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors">
                                    {deletingQuestion === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs dark:bg-white/5 bg-slate-100 px-2 py-0.5 rounded-full dark:text-slate-400 text-slate-500">
                                  {TYPE_ICONS[q.type as QType]} {TYPE_LABELS[q.type as QType]}
                                </span>
                                <span className="text-xs text-amber-400">{q.points} نقطة</span>
                              </div>
                              {q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-1 gap-1">
                                  {q.options.map(opt => (
                                    <div key={opt.id} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${
                                      opt.isCorrect
                                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                                        : "dark:bg-white/3 bg-white dark:text-slate-400 text-slate-500 border dark:border-white/5 border-slate-100"
                                    }`}>
                                      {opt.isCorrect
                                        ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
                                      {opt.text}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.explanation && (
                                <p className="mt-2 text-xs dark:text-slate-500 text-slate-400 dark:bg-white/5 bg-slate-100 px-2 py-1 rounded-lg">
                                  {q.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Inline Question Form */}
                      <AnimatePresence>
                        {showQuestionForm && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="dark:bg-[#0a0f1e] bg-slate-50 rounded-xl border-2 border-cyan-500/30 p-4 space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold dark:text-white text-slate-900 text-sm">
                                {editQuestion ? "تعديل السؤال" : "سؤال جديد"}
                              </h4>
                              <button onClick={() => { setShowQuestionForm(false); setEditQuestion(null); }}
                                className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-200 flex items-center justify-center dark:text-slate-400 text-slate-500">
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Type Selector */}
                            <div>
                              <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-2 uppercase tracking-wide">نوع السؤال</label>
                              <div className="grid grid-cols-3 gap-2">
                                {(["multiple_choice", "true_false", "short_answer"] as QType[]).map((type) => (
                                  <button key={type} onClick={() => changeQuestionType(type)}
                                    className={`py-2 rounded-xl border text-xs font-medium transition-all text-center ${
                                      newQuestion.type === type
                                        ? "bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/25"
                                        : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500 hover:border-cyan-500/50"
                                    }`}>
                                    <div className="text-base mb-0.5">{TYPE_ICONS[type]}</div>
                                    {TYPE_LABELS[type]}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Question Text */}
                            <div>
                              <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-1.5 uppercase tracking-wide">نص السؤال <span className="text-red-400">*</span></label>
                              <textarea
                                value={newQuestion.question}
                                onChange={e => setNewQuestion(q => ({ ...q, question: e.target.value }))}
                                rows={2}
                                className={`${inputCls} resize-none`}
                                placeholder="اكتب نص السؤال هنا..."
                              />
                            </div>

                            {/* Options */}
                            {newQuestion.type !== "short_answer" && (
                              <div>
                                <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-2 uppercase tracking-wide">
                                  الخيارات — اضغط الدائرة لتحديد الإجابة الصحيحة
                                </label>
                                <div className="space-y-2">
                                  {newQuestion.options.map((opt, idx) => (
                                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                                      opt.isCorrect
                                        ? "border-green-500/50 dark:bg-green-500/5 bg-green-50"
                                        : "dark:border-white/10 border-slate-200"
                                    }`}>
                                      <button
                                        onClick={() => setOptionCorrect(idx)}
                                        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                          opt.isCorrect
                                            ? "bg-green-500 border-green-500 text-white"
                                            : "dark:border-slate-600 border-slate-300 hover:border-green-500"
                                        }`}
                                      >
                                        {opt.isCorrect && <CheckCircle className="w-3.5 h-3.5" />}
                                      </button>
                                      <input
                                        value={opt.text}
                                        onChange={e => updateOptionText(idx, e.target.value)}
                                        className="flex-1 bg-transparent outline-none dark:text-white text-slate-900 text-sm placeholder-slate-400"
                                        placeholder={
                                          newQuestion.type === "true_false"
                                            ? (idx === 0 ? "صح" : "خطأ")
                                            : `الخيار ${idx + 1}`
                                        }
                                        readOnly={newQuestion.type === "true_false"}
                                      />
                                      {newQuestion.type === "multiple_choice" && newQuestion.options.length > 2 && (
                                        <button onClick={() => removeOption(idx)}
                                          className="text-red-400 hover:text-red-500 flex-shrink-0 p-1">
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {newQuestion.type === "multiple_choice" && (
                                  <button onClick={addOption}
                                    className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                                    <Plus className="w-3 h-3" />إضافة خيار آخر
                                  </button>
                                )}
                              </div>
                            )}

                            {newQuestion.type === "short_answer" && (
                              <div className="flex items-center gap-2 p-3 rounded-xl dark:bg-amber-500/5 bg-amber-50 border dark:border-amber-500/20 border-amber-200">
                                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <p className="text-xs dark:text-amber-300 text-amber-700">سيكتب الطالب إجابته بحرية — يمكنك مراجعتها يدوياً</p>
                              </div>
                            )}

                            {/* Points + Explanation */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-1.5 uppercase tracking-wide">النقاط</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={newQuestion.points}
                                  onChange={e => setNewQuestion(q => ({ ...q, points: Number(e.target.value) }))}
                                  className={inputCls}
                                  dir="ltr"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-1.5 uppercase tracking-wide">شرح الإجابة (اختياري)</label>
                                <input
                                  value={newQuestion.explanation}
                                  onChange={e => setNewQuestion(q => ({ ...q, explanation: e.target.value }))}
                                  className={inputCls}
                                  placeholder="يظهر للطالب بعد الإجابة..."
                                />
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                              <button onClick={saveQuestion} disabled={savingQuestion}
                                className="btn-primary flex-1 justify-center py-2.5 text-sm">
                                {savingQuestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {savingQuestion ? "جاري الحفظ..." : editQuestion ? "تحديث السؤال" : "إضافة السؤال"}
                              </button>
                              <button onClick={() => { setShowQuestionForm(false); setEditQuestion(null); }}
                                className="btn-secondary px-4 py-2.5 text-sm">
                                إلغاء
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!showQuestionForm && (
                        <button onClick={openAddQuestion}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed dark:border-white/10 border-slate-200 dark:text-slate-500 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 dark:hover:border-cyan-500/30 transition-all text-sm font-medium">
                          <Plus className="w-4 h-4" />
                          إضافة سؤال جديد
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Quiz Form Modal */}
      <AnimatePresence>
        {showQuizForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="font-bold dark:text-white text-slate-900 text-lg">
                    {editQuiz ? "تعديل الاختبار" : "إضافة اختبار جديد"}
                  </h3>
                  <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">اضبط إعدادات الاختبار ثم أضف الأسئلة</p>
                </div>
                <button onClick={() => { setShowQuizForm(false); setEditQuiz(null); }}
                  className="w-8 h-8 rounded-xl dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold dark:text-slate-300 text-slate-700 mb-1.5">عنوان الاختبار <span className="text-red-400">*</span></label>
                  <input value={quizForm.title} onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))}
                    className={inputCls} placeholder="مثال: اختبار المرحلة الأولى" />
                </div>
                <div>
                  <label className="block text-sm font-semibold dark:text-slate-300 text-slate-700 mb-1.5">الوصف (اختياري)</label>
                  <textarea value={quizForm.description} onChange={e => setQuizForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} className={`${inputCls} resize-none`} placeholder="وصف مختصر للاختبار..." />
                </div>
                {phases.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold dark:text-slate-300 text-slate-700 mb-1.5">المرحلة (اختياري)</label>
                    <select value={quizForm.phaseId} onChange={e => setQuizForm(f => ({ ...f, phaseId: e.target.value }))}
                      className={inputCls}>
                      <option value="" className="dark:bg-[#111827]">— بدون مرحلة —</option>
                      {phases.map(p => <option key={p.id} value={p.id} className="dark:bg-[#111827]">{p.title}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold dark:text-slate-300 text-slate-700 mb-1.5">الوقت (دقيقة)</label>
                    <input type="number" value={quizForm.timeLimit}
                      onChange={e => setQuizForm(f => ({ ...f, timeLimit: e.target.value }))}
                      className={inputCls} placeholder="فارغ = بلا حد" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold dark:text-slate-300 text-slate-700 mb-1.5">درجة النجاح (%)</label>
                    <input type="number" min={0} max={100} value={quizForm.passingScore}
                      onChange={e => setQuizForm(f => ({ ...f, passingScore: Number(e.target.value) }))}
                      className={inputCls} dir="ltr" />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
                  <input type="checkbox" checked={quizForm.isRequired}
                    onChange={e => setQuizForm(f => ({ ...f, isRequired: e.target.checked }))}
                    className="w-4 h-4 accent-red-400" />
                  <div>
                    <p className="text-sm font-medium dark:text-slate-300 text-slate-700">اختبار إلزامي</p>
                    <p className="text-xs dark:text-slate-500 text-slate-400">يجب اجتيازه للمتابعة في الكورس</p>
                  </div>
                </label>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveQuiz} disabled={savingQuiz} className="btn-primary flex-1 justify-center py-2.5">
                    {savingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingQuiz ? "جاري الحفظ..." : "حفظ الاختبار"}
                  </button>
                  <button onClick={() => { setShowQuizForm(false); setEditQuiz(null); }} className="btn-secondary px-5 py-2.5">
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
