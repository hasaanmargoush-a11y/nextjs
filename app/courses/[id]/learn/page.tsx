"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { use } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import Link from "next/link";
import CourseChat from "@/components/chat/CourseChat";
import {
  Play, CheckCircle, ArrowRight, ArrowLeft, Loader2, Lock,
  BookOpen, FileText, Menu, X, Code2, ImageIcon, ClipboardList,
  Trophy, AlertCircle, RotateCcw, Award, Star, MessageCircle,
  ChevronDown, ChevronUp, ArrowLeftCircle
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ContentBlock {
  id: number; type: "text" | "code" | "image"; content: string;
  language?: string | null; order: number;
}

interface LessonDetail {
  id: number; title: string; content: string; contentBlocks: ContentBlock[];
  videoUrl: string | null; videoType?: string | null; videoObjectPath?: string | null;
  duration: string; order: number; isFree: boolean; courseId: number;
  isCompleted: boolean; completedIds: number[];
  allLessons: { id: number; title: string; order: number; duration: string; isFree: boolean; phaseId?: number | null }[];
}

interface PhaseLesson {
  id: number; title: string; order: number; duration: string; isFree: boolean;
}
interface PhaseQuiz {
  id: number; title: string; order: number; isRequired: boolean;
}
interface CoursePhase {
  id: number; title: string; description?: string | null; order: number;
  lessons: PhaseLesson[]; quizzes: PhaseQuiz[];
}

type SidebarItem =
  | ({ _itemType: "lesson" } & PhaseLesson)
  | ({ _itemType: "quiz" } & PhaseQuiz);

interface CourseQuiz {
  id: number; title: string; phaseId?: number | null; description?: string | null;
  timeLimit?: number | null; passingScore: number; isRequired: boolean; questionsCount: number;
}
interface QuizOption { id: number; text: string; order: number; }
interface QuizQuestion {
  id: number; type: "multiple_choice" | "true_false" | "short_answer";
  question: string; explanation?: string | null; points: number; options: QuizOption[];
}
interface StudentQuiz {
  id: number; title: string; description?: string | null;
  timeLimit?: number | null; passingScore: number; questions: QuizQuestion[];
}
interface QuizResult {
  score: number; maxScore: number; passed: boolean; percentage: number;
  passingScore: number;
  newCertificates: NewCert[];
  results: { questionId: number; question: string; yourAnswer: string; correctAnswer: string; correct: boolean | null; explanation: string | null; points: number; earnedPoints: number }[];
}
interface NewCert { title: string; type: string; }


// ─── Helpers ─────────────────────────────────────────────────────────────────

function getImageSrc(content: string): string {
  if (!content) return "";
  if (content.startsWith("http://") || content.startsWith("https://") || content.startsWith("//")) return content;
  return `/api/storage/objects${content.startsWith("/") ? content : `/${content}`}`;
}
function getVideoSrc(lesson: LessonDetail): string | null {
  if (lesson.videoType === "upload" && lesson.videoObjectPath) {
    return `/api/storage/objects${lesson.videoObjectPath.startsWith("/") ? lesson.videoObjectPath : `/${lesson.videoObjectPath}`}`;
  }
  return lesson.videoUrl ?? null;
}
function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  for (const p of [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?]+)/, /youtube\.com\/embed\/([^?]+)/]) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1`;
  }
  return url;
}
function isYoutube(url: string | null): boolean {
  return !!url && (url.includes("youtube.com") || url.includes("youtu.be"));
}
// ─── Content Block Renderer ──────────────────────────────────────────────────

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  if (block.type === "code") return (
    <div className="rounded-xl overflow-hidden my-4" dir="ltr">
      {block.language && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#1e2433] border-b border-white/10">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-mono text-cyan-400">{block.language}</span>
        </div>
      )}
      <pre className="bg-[#0d1117] text-[#e6edf3] p-4 overflow-x-auto text-sm leading-relaxed font-mono whitespace-pre">
        <code>{block.content}</code>
      </pre>
    </div>
  );
  if (block.type === "image") return (
    <div className="my-4 flex justify-center">
      <img src={getImageSrc(block.content)} alt="صورة توضيحية"
        className="rounded-xl max-w-full shadow-lg border dark:border-white/10 border-slate-200"
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
    </div>
  );
  return <div className="dark:text-slate-300 text-slate-700 leading-[1.9] text-sm my-3 whitespace-pre-wrap">{block.content}</div>;
}

function LessonContent({ lesson }: { lesson: LessonDetail }) {
  const hasBlocks = lesson.contentBlocks?.length > 0;
  const hasContent = lesson.content?.trim().length > 0;
  if (!hasBlocks && !hasContent) return null;
  return (
    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 p-5 border-b dark:border-white/5 border-slate-100">
        <FileText className="w-5 h-5 text-cyan-400" />
        <span className="font-bold dark:text-white text-slate-900">محتوى الدرس</span>
        {hasBlocks && <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">{lesson.contentBlocks.length} بلوك</span>}
      </div>
      <div className="p-5">
        {hasContent && <div className="dark:text-slate-300 text-slate-700 leading-relaxed whitespace-pre-wrap text-sm mb-5">{lesson.content}</div>}
        {hasBlocks && <div className={hasContent ? "border-t dark:border-white/5 border-slate-100 pt-5" : ""}>
          {lesson.contentBlocks.map(b => <ContentBlockRenderer key={b.id} block={b} />)}
        </div>}
      </div>
    </div>
  );
}

// ─── Certificate Modal ───────────────────────────────────────────────────────

function CertificateModal({ certs, courseId, onClose }: { certs: NewCert[]; courseId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="dark:bg-[#111827] bg-white rounded-3xl border dark:border-yellow-400/20 border-yellow-300 p-8 max-w-sm w-full text-center shadow-2xl shadow-yellow-500/20">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/40">
          <Award className="w-10 h-10 text-white" />
        </div>
        <div className="flex justify-center gap-1 mb-3">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}</div>
        <h2 className="text-2xl font-black dark:text-white text-slate-900 mb-2">مبروك!</h2>
        <p className="dark:text-slate-400 text-slate-600 text-sm mb-5">حصلت على {certs.length > 1 ? "شهادات جديدة" : "شهادة جديدة"}!</p>
        <div className="space-y-3 mb-6">
          {certs.map((c, i) => (
            <div key={i} className="p-3 rounded-xl dark:bg-yellow-400/5 bg-yellow-50 border dark:border-yellow-400/20 border-yellow-200">
              <p className="font-bold dark:text-yellow-300 text-yellow-700 text-sm">{c.title}</p>
              <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">{c.type === "course" ? "شهادة إتمام الكورس" : "شهادة إتمام المرحلة"}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-white font-bold text-sm hover:opacity-90 transition-opacity">
            عرض شهاداتي
          </Link>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-700 font-bold text-sm">متابعة التعلم</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Quiz Taking View ─────────────────────────────────────────────────────────

function QuizTakingView({
  courseId, quizId, quiz: initialQuiz, onBack, onNext, onQuizPassed, onCertificates,
}: {
  courseId: string; quizId: number; quiz: CourseQuiz;
  onBack: () => void;
  onNext: (() => void) | null;
  onQuizPassed: (quizId: number) => void;
  onCertificates: (certs: NewCert[]) => void;
}) {
  const [quiz, setQuiz] = useState<StudentQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    api.get<StudentQuiz>(`/courses/${courseId}/quizzes/${quizId}`)
      .then(q => { setQuiz(q); if (q.timeLimit) setTimeLeft(q.timeLimit * 60); })
      .catch(e => toast.error(e instanceof Error ? e.message : "خطأ"))
      .finally(() => setLoading(false));
  }, [courseId, quizId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    const t = setInterval(() => setTimeLeft(prev => { if (!prev || prev <= 1) { clearInterval(t); return 0; } return prev - 1; }), 1000);
    return () => clearInterval(t);
  }, [timeLeft, result]);

  const submitQuiz = useCallback(async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const res = await api.post<QuizResult>(`/courses/${courseId}/quizzes/${quizId}/attempt`, { answers });
      setResult(res);
      if (res.passed) {
        toast.success(`أحسنت! اجتزت الاختبار بنسبة ${res.percentage}%`);
        onQuizPassed(quizId);
        if (res.newCertificates?.length > 0) onCertificates(res.newCertificates);
      } else {
        toast.error(`لم تجتز. حصلت على ${res.percentage}% والمطلوب ${res.passingScore}%`);
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSubmitting(false); }
  }, [quiz, courseId, quizId, answers, onQuizPassed, onCertificates]);

  useEffect(() => { if (timeLeft === 0 && !result && quiz) submitQuiz(); }, [timeLeft, result, quiz, submitQuiz]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;
  if (!quiz) return <div className="text-center py-16"><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" /><p className="dark:text-slate-400 text-slate-600">لم يتم تحميل الاختبار</p></div>;

  if (result) return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      <div className={`rounded-2xl border p-8 text-center ${result.passed ? "dark:bg-green-500/10 bg-green-50 border-green-500/20" : "dark:bg-red-500/10 bg-red-50 border-red-500/20"}`}>
        {result.passed ? <Trophy className="w-14 h-14 text-yellow-400 mx-auto mb-4" /> : <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />}
        <h2 className="text-2xl font-black dark:text-white text-slate-900 mb-2">{result.passed ? "أحسنت! اجتزت الاختبار" : "لم تجتز الاختبار"}</h2>
        <p className="text-5xl font-black mb-3" style={{ color: result.passed ? "#22c55e" : "#ef4444" }}>{result.percentage}%</p>
        <p className="dark:text-slate-400 text-slate-600 text-sm">حصلت على {result.score} من {result.maxScore} نقطة · الحد الأدنى {result.passingScore}%</p>
        <div className="flex gap-3 justify-center mt-6">
          {result.passed ? (
            onNext ? (
              <button onClick={onNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold text-sm hover:opacity-90">
                <ArrowLeft className="w-4 h-4" />الدرس التالي
              </button>
            ) : (
              <Link href="/dashboard"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-white font-bold text-sm hover:opacity-90">
                <Award className="w-4 h-4" />عرض شهاداتي
              </Link>
            )
          ) : (
            <>
              <button onClick={() => { setResult(null); setAnswers({}); setTimeLeft(quiz.timeLimit ? quiz.timeLimit * 60 : null); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 text-sm font-semibold">
                <RotateCcw className="w-4 h-4" />إعادة الاختبار
              </button>
              <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-700 text-sm font-semibold">
                <ArrowRight className="w-4 h-4" />العودة
              </button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="font-bold dark:text-white text-slate-900 text-lg">تفاصيل الإجابات</h3>
        {result.results.map((r, i) => (
          <div key={r.questionId} className={`rounded-2xl border p-5 ${r.correct === true ? "dark:bg-green-500/5 bg-green-50 border-green-500/20" : r.correct === false ? "dark:bg-red-500/5 bg-red-50 border-red-500/20" : "dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200"}`}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-xs font-bold dark:text-slate-400 text-slate-500 mt-1 flex-shrink-0">{i + 1}.</span>
              <p className="dark:text-white text-slate-900 font-medium text-sm">{r.question}</p>
              <span className="mr-auto flex-shrink-0">{r.correct === true ? <CheckCircle className="w-5 h-5 text-green-400" /> : r.correct === false ? <X className="w-5 h-5 text-red-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}</span>
            </div>
            <div className="space-y-1 text-xs pr-5">
              <p className="dark:text-slate-400 text-slate-600"><span className="font-semibold">إجابتك:</span> <span className={r.correct === true ? "text-green-400" : r.correct === false ? "text-red-400" : "text-amber-400"}>{r.yourAnswer || "(لا توجد)"}</span></p>
              {r.correct !== true && r.correctAnswer && <p className="dark:text-slate-400 text-slate-600"><span className="font-semibold">الصحيحة:</span> <span className="text-green-400">{r.correctAnswer}</span></p>}
              {r.correct === null && <p className="text-amber-400">هذا السؤال يحتاج مراجعة يدوية</p>}
              {r.explanation && <p className="dark:text-slate-500 text-slate-400 italic mt-1">{r.explanation}</p>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const answered = Object.keys(answers).length;
  const total = quiz.questions.length;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-5">
      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black dark:text-white text-slate-900 mb-1">{quiz.title}</h1>
            {quiz.description && <p className="text-sm dark:text-slate-400 text-slate-600">{quiz.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs dark:text-slate-500 text-slate-400">
              <span>{total} سؤال</span><span>·</span>
              <span>الحد الأدنى {initialQuiz.passingScore}%</span>
              {timeLeft !== null && <><span>·</span><span className={timeLeft < 60 ? "text-red-400 font-bold animate-pulse" : "text-amber-400"}>⏱ {fmt(timeLeft)}</span></>}
            </div>
          </div>
          <div className="text-xs dark:text-slate-400 text-slate-600 text-center flex-shrink-0">
            <div className="text-2xl font-black dark:text-white text-slate-900">{answered}</div>
            <div>/ {total} أُجيب</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 dark:bg-white/5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all" style={{ width: total > 0 ? `${(answered / total) * 100}%` : "0%" }} />
        </div>
      </div>
      {quiz.questions.map((q, qi) => (
        <div key={q.id} className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
          <div className="flex items-start gap-3 mb-4">
            <span className="w-7 h-7 rounded-lg dark:bg-cyan-500/10 bg-cyan-50 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0 border dark:border-cyan-500/20 border-cyan-200 mt-0.5">{qi + 1}</span>
            <div className="flex-1">
              <p className="dark:text-white text-slate-900 font-semibold text-sm leading-relaxed">{q.question}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs dark:text-slate-500 text-slate-400">{q.type === "multiple_choice" ? "اختيار متعدد" : q.type === "true_false" ? "صح / خطأ" : "إجابة مفتوحة"}</span>
                <span className="text-xs text-cyan-400">{q.points} {q.points === 1 ? "نقطة" : "نقاط"}</span>
              </div>
            </div>
          </div>
          {q.type === "short_answer" ? (
            <div className="pr-10">
              <textarea rows={3} value={String(answers[q.id] ?? "")} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="اكتب إجابتك هنا..." className="w-full dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 rounded-xl px-3 py-2.5 text-sm dark:text-white text-slate-900 focus:outline-none focus:border-cyan-500 resize-none" />
              <p className="text-xs text-amber-400 mt-1">ملاحظة: هذا السؤال يحتاج مراجعة يدوية</p>
            </div>
          ) : (
            <div className="pr-10 space-y-2">
              {q.options.map(opt => {
                const selected = answers[q.id] === opt.id;
                return (
                  <button key={opt.id} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                    className={`w-full text-right flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm ${selected ? "dark:bg-cyan-500/10 bg-cyan-50 border-cyan-500/40 text-cyan-400" : "dark:bg-white/3 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-700 hover:border-cyan-500/30"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected ? "border-cyan-400" : "dark:border-slate-600 border-slate-300"}`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                    </div>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 pb-6">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400 text-sm font-medium">
          <ArrowRight className="w-4 h-4" />العودة
        </button>
        <button onClick={submitQuiz} disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold text-sm hover:opacity-90 disabled:opacity-60">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {submitting ? "جاري الإرسال..." : `إرسال (${answered}/${total})`}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Learn Page ──────────────────────────────────────────────────────────

export default function LearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const { user } = useAuth();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  // Phase-based structure
  const [coursePhases, setCoursePhases] = useState<CoursePhase[]>([]);
  const [unphasedLessons, setUnphasedLessons] = useState<PhaseLesson[]>([]);
  const [unphasedQuizzes, setUnphasedQuizzes] = useState<PhaseQuiz[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<CourseQuiz[]>([]);

  const [selectedItem, setSelectedItem] = useState<
    | { type: "lesson"; id: number }
    | { type: "quiz"; id: number; quiz: CourseQuiz }
    | null
  >(null);
  const [newCerts, setNewCerts] = useState<NewCert[]>([]);
  const [passedQuizIds, setPassedQuizIds] = useState<Set<number>>(new Set());

  const getQuizFromAll = useCallback((quizId: number): CourseQuiz | undefined => {
    return allQuizzes.find(q => q.id === quizId);
  }, [allQuizzes]);

  // Flat ordered list of all items (for prev/next navigation)
  const flatItems = useCallback((): { type: "lesson" | "quiz"; id: number }[] => {
    const items: { type: "lesson" | "quiz"; id: number }[] = [];
    for (const phase of coursePhases) {
      const mixed: { type: "lesson" | "quiz"; id: number; order: number }[] = [
        ...phase.lessons.map(l => ({ type: "lesson" as const, id: l.id, order: l.order })),
        ...phase.quizzes.map(q => ({ type: "quiz" as const, id: q.id, order: q.order })),
      ].sort((a, b) => a.order - b.order);
      items.push(...mixed);
    }
    // unphased
    const unmixed: { type: "lesson" | "quiz"; id: number; order: number }[] = [
      ...unphasedLessons.map(l => ({ type: "lesson" as const, id: l.id, order: l.order })),
      ...unphasedQuizzes.map(q => ({ type: "quiz" as const, id: q.id, order: q.order })),
    ].sort((a, b) => a.order - b.order);
    items.push(...unmixed);
    return items;
  }, [coursePhases, unphasedLessons, unphasedQuizzes]);

  const refreshProgress = useCallback(async () => {
    try {
      const prog = await api.get<{ completedLessonIds: number[]; passedQuizIds: number[] }>(`/courses/${courseId}/my-progress`);
      setCompletedIds(new Set(prog.completedLessonIds));
      setPassedQuizIds(new Set(prog.passedQuizIds));
    } catch { /* silently ignore */ }
  }, [courseId]);

  const fetchLesson = useCallback(async (lessonId: number) => {
    setLoading(true);
    try {
      const data = await api.get<LessonDetail>(`/courses/${courseId}/lessons/${lessonId}`);
      setLesson(data);
      setSelectedItem({ type: "lesson", id: lessonId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => {
    // Load course structure for phase-based sidebar
    api.get<{ phases: CoursePhase[]; lessons: PhaseLesson[]; title?: string }>(`/courses/${courseId}`)
      .then(data => {
        const phases = data.phases ?? [];
        setCoursePhases(phases);
        if (data.title) setCourseTitle(data.title);
        // expand all phases by default
        setExpandedPhases(new Set(phases.map(p => p.id)));
        // unphased lessons from top-level
        setUnphasedLessons(data.lessons ?? []);
      })
      .catch(() => {});

    // Load quizzes (for quiz taking)
    api.get<CourseQuiz[]>(`/courses/${courseId}/quizzes`)
      .then(qs => {
        setAllQuizzes(qs);
        // attach order info to phase quiz lists from the full quiz data
        setCoursePhases(prev => prev.map(phase => ({
          ...phase,
          quizzes: phase.quizzes.map(pq => {
            const full = qs.find(q => q.id === pq.id);
            return { ...pq, order: full ? (full as CourseQuiz & { order?: number }).order ?? pq.order : pq.order };
          }),
        })));
        setUnphasedQuizzes(qs.filter(q => !q.phaseId).map(q => ({
          id: q.id,
          title: q.title,
          order: (q as CourseQuiz & { order?: number }).order ?? 0,
          isRequired: q.isRequired,
        })));
      })
      .catch(() => {});

    // Load user progress from DB (single authoritative source)
    refreshProgress();

    // Load first lesson
    api.get<LessonDetail>(`/courses/${courseId}/lessons/first`)
      .then(data => {
        setLesson(data);
        setSelectedItem({ type: "lesson", id: data.id });
      })
      .catch(async () => {
        try {
          const lessons = await api.get<{ id: number }[]>(`/admin/courses/${courseId}/lessons`);
          if (lessons?.length > 0) await fetchLesson(lessons[0]!.id);
        } catch { /* no lessons */ }
      })
      .finally(() => setLoading(false));
  }, [courseId, fetchLesson, refreshProgress]);

  const handleComplete = async () => {
    if (!user || !lesson) return;
    setCompleting(true);
    try {
      const res = await api.post<{ message: string; newCertificates: NewCert[] }>(`/courses/${courseId}/lessons/${lesson.id}/complete`, {});
      // Optimistically update local state, then confirm from DB
      setCompletedIds(prev => new Set([...prev, lesson.id]));
      await refreshProgress();
      if (res.newCertificates?.length > 0) setNewCerts(res.newCertificates);
      else toast.success("تم تحديد الدرس كمكتمل");
    } catch (e) { toast.error(e instanceof Error ? e.message : "حدث خطأ"); }
    finally { setCompleting(false); }
  };

  const handleQuizPassed = useCallback(async (quizId: number) => {
    // Optimistically update local state, then confirm from DB
    setPassedQuizIds(prev => new Set([...prev, quizId]));
    try {
      const prog = await api.get<{ completedLessonIds: number[]; passedQuizIds: number[] }>(`/courses/${courseId}/my-progress`);
      setCompletedIds(new Set(prog.completedLessonIds));
      setPassedQuizIds(new Set(prog.passedQuizIds));
    } catch { /* silently ignore */ }
  }, [courseId]);

  const goToLesson = (id: number) => { fetchLesson(id); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goToQuiz = (quiz: CourseQuiz) => { setSelectedItem({ type: "quiz", id: quiz.id, quiz }); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // Navigation
  const allItems = flatItems();
  const currentIdx = selectedItem
    ? allItems.findIndex(i => i.type === selectedItem.type && i.id === selectedItem.id)
    : -1;
  const prevItem = currentIdx > 0 ? allItems[currentIdx - 1] : null;
  const nextItem = currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null;

  // Sequential locking: frontier = index of first incomplete item
  // Items at index ≤ frontierIdx are accessible; beyond are locked
  const frontierIdx = (() => {
    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i]!;
      if (it.type === "lesson" && !completedIds.has(it.id)) return i;
      if (it.type === "quiz" && !passedQuizIds.has(it.id)) return i;
    }
    return allItems.length - 1;
  })();

  const isItemLocked = (type: "lesson" | "quiz", id: number): boolean => {
    const idx = allItems.findIndex(i => i.type === type && i.id === id);
    return idx > frontierIdx;
  };

  const goToItem = (item: { type: "lesson" | "quiz"; id: number }) => {
    if (item.type === "lesson") goToLesson(item.id);
    else {
      const q = getQuizFromAll(item.id);
      if (q) goToQuiz(q);
    }
  };

  const prevLabel = prevItem?.type === "lesson"
    ? coursePhases.flatMap(p => p.lessons).concat(unphasedLessons).find(l => l.id === prevItem.id)?.title
    : prevItem?.type === "quiz" ? allQuizzes.find(q => q.id === prevItem?.id)?.title : undefined;
  const nextLabel = nextItem?.type === "lesson"
    ? coursePhases.flatMap(p => p.lessons).concat(unphasedLessons).find(l => l.id === nextItem.id)?.title
    : nextItem?.type === "quiz" ? allQuizzes.find(q => q.id === nextItem?.id)?.title : undefined;

  const isCompleted = selectedItem?.type === "lesson" ? completedIds.has(selectedItem.id) : false;

  const videoSrc = lesson ? getVideoSrc(lesson) : null;

  const totalItems = allItems.length;
  const completedCount = completedIds.size;

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex flex-col">
      {newCerts.length > 0 && <CertificateModal certs={newCerts} courseId={courseId} onClose={() => setNewCerts([])} />}

      {/* Chat slide-in panel (mobile: fullscreen overlay, desktop: fixed right panel) */}
      <AnimatePresence>
        {chatOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
              onClick={() => setChatOpen(false)} />
            {/* Panel */}
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-[61] w-full sm:w-[400px] lg:w-[380px] shadow-2xl"
            >
              <CourseChat
                courseId={courseId}
                courseTitle={courseTitle}
                onClose={() => setChatOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-9 h-9 rounded-xl dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-colors lg:hidden">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href={`/courses/${courseId}`} className="flex items-center gap-1.5 text-sm dark:text-slate-400 text-slate-600 hover:text-cyan-400 transition-colors">
            <ArrowRight className="w-4 h-4" /><span className="hidden sm:inline">الكورس</span>
          </Link>
          {lesson && selectedItem?.type === "lesson" && (
            <><span className="dark:text-slate-600 text-slate-300">/</span>
              <span className="text-sm font-medium dark:text-white text-slate-900 line-clamp-1 max-w-[200px]">{lesson.title}</span></>
          )}
          {selectedItem?.type === "quiz" && (
            <><span className="dark:text-slate-600 text-slate-300">/</span>
              <span className="text-sm font-medium dark:text-white text-slate-900 line-clamp-1 max-w-[200px]">{selectedItem.quiz.title}</span></>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button onClick={() => setChatOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${chatOpen ? "bg-cyan-500 border-cyan-500 text-white shadow-lg shadow-cyan-500/25" : "dark:bg-cyan-500/10 bg-cyan-50 dark:border-cyan-500/20 border-cyan-100 text-cyan-400 hover:bg-cyan-500/20"}`}>
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{chatOpen ? "إغلاق الشات" : "الشات"}</span>
            </button>
          )}
          {selectedItem?.type === "lesson" && lesson && user && !isCompleted && (
            <button onClick={handleComplete} disabled={completing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-colors">
              {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {completing ? "..." : "أكملت الدرس"}
            </button>
          )}
          {selectedItem?.type === "lesson" && isCompleted && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />مكتمل
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ──── SIDEBAR ──── */}
        <aside className={`
          fixed lg:relative inset-y-0 right-0 z-30 w-72 dark:bg-[#070b14] bg-white border-l dark:border-white/5 border-slate-100
          transition-transform lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          lg:flex flex-col overflow-y-auto
          top-[49px] lg:top-0 h-[calc(100vh-49px)] lg:h-auto
        `}>
          {/* Progress header */}
          <div className="p-4 border-b dark:border-white/5 border-slate-100 flex-shrink-0">
            <p className="text-xs font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wide">محتوى الكورس</p>
            <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">{completedCount} / {totalItems} مكتمل</p>
            <div className="mt-2 h-1 dark:bg-white/5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all"
                style={{ width: totalItems > 0 ? `${(completedCount / totalItems) * 100}%` : "0%" }} />
            </div>
          </div>

          {/* Phase-based content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {coursePhases.length === 0 && unphasedLessons.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="w-8 h-8 dark:text-slate-700 text-slate-300 mx-auto mb-2" />
                <p className="text-xs dark:text-slate-500 text-slate-400">لا يوجد محتوى</p>
              </div>
            )}

            {/* Phases */}
            {coursePhases.map((phase, pi) => {
              const isExpanded = expandedPhases.has(phase.id);
              // Merge lessons + quizzes and sort by order
              const phaseItems: SidebarItem[] = [
                ...phase.lessons.map(l => ({ ...l, _itemType: "lesson" as const })),
                ...phase.quizzes.map(q => ({ ...q, _itemType: "quiz" as const })),
              ].sort((a, b) => a.order - b.order);

              const phaseCompletedCount = phase.lessons.filter(l => completedIds.has(l.id)).length;
              const phaseTotal = phase.lessons.length + phase.quizzes.length;

              return (
                <div key={phase.id} className="rounded-xl overflow-hidden">
                  {/* Phase header */}
                  <button
                    onClick={() => setExpandedPhases(prev => {
                      const n = new Set(prev);
                      if (n.has(phase.id)) n.delete(phase.id); else n.add(phase.id);
                      return n;
                    })}
                    className="w-full flex items-center gap-2 p-3 text-right hover:dark:bg-white/5 hover:bg-slate-50 transition-colors">
                    <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
                      {pi + 1}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-xs font-bold dark:text-white text-slate-900 line-clamp-1">{phase.title}</p>
                      <p className="text-xs dark:text-slate-600 text-slate-400 mt-0.5">{phaseCompletedCount}/{phaseTotal} مكتمل</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 dark:text-slate-500 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 dark:text-slate-500 text-slate-400 flex-shrink-0" />}
                  </button>

                  {/* Phase items */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                        <div className="pr-3 space-y-0.5 pb-1">
                          {phaseItems.map((item, idx) => {
                            if (item._itemType === "lesson") {
                              const done = completedIds.has(item.id);
                              const active = selectedItem?.type === "lesson" && selectedItem.id === item.id;
                              const locked = isItemLocked("lesson", item.id);
                              return (
                                <button key={`l-${item.id}`}
                                  onClick={() => { if (!locked) goToLesson(item.id); }}
                                  disabled={locked}
                                  title={locked ? "أكمل الدرس السابق أولاً" : undefined}
                                  className={`w-full text-right flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${locked ? "opacity-40 cursor-not-allowed" : active ? "dark:bg-cyan-500/10 bg-cyan-50 border dark:border-cyan-500/20 border-cyan-200" : "hover:dark:bg-white/5 hover:bg-slate-50"}`}>
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${locked ? "dark:bg-white/5 bg-slate-100 dark:text-slate-600 text-slate-400" : done ? "bg-green-500/10 text-green-400" : active ? "bg-cyan-500/10 text-cyan-400" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500"}`}>
                                    {locked ? <Lock className="w-3 h-3" /> : done ? <CheckCircle className="w-3.5 h-3.5" /> : active ? <Play className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0 text-right">
                                    <p className={`text-xs font-medium line-clamp-2 ${locked ? "dark:text-slate-600 text-slate-400" : active ? "text-cyan-400" : done ? "dark:text-slate-300 text-slate-700" : "dark:text-slate-400 text-slate-600"}`}>
                                      {item.title}
                                    </p>
                                    {item.duration && item.duration !== "0:00" && <p className="text-xs dark:text-slate-600 text-slate-400 mt-0.5">{item.duration}</p>}
                                  </div>
                                </button>
                              );
                            } else {
                              // quiz
                              const fullQuiz = getQuizFromAll(item.id);
                              const active = selectedItem?.type === "quiz" && selectedItem.id === item.id;
                              const locked = isItemLocked("quiz", item.id);
                              const passed = passedQuizIds.has(item.id);
                              return (
                                <button key={`q-${item.id}`}
                                  onClick={() => { if (!locked && fullQuiz) goToQuiz(fullQuiz); }}
                                  disabled={locked}
                                  title={locked ? "أكمل الدرس السابق أولاً" : undefined}
                                  className={`w-full text-right flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${locked ? "opacity-40 cursor-not-allowed" : active ? "dark:bg-amber-500/10 bg-amber-50 border dark:border-amber-500/20 border-amber-200" : "hover:dark:bg-white/5 hover:bg-slate-50"}`}>
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${locked ? "dark:bg-white/5 bg-slate-100" : passed ? "bg-green-500/10" : active ? "bg-amber-500/10" : "dark:bg-white/5 bg-slate-100"}`}>
                                    {locked ? <Lock className="w-3 h-3 dark:text-slate-600 text-slate-400" /> : passed ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <ClipboardList className={`w-3.5 h-3.5 ${active ? "text-amber-400" : "dark:text-slate-400 text-slate-500"}`} />}
                                  </div>
                                  <div className="flex-1 min-w-0 text-right">
                                    <p className={`text-xs font-medium line-clamp-2 ${locked ? "dark:text-slate-600 text-slate-400" : active ? "text-amber-400" : passed ? "dark:text-slate-300 text-slate-700" : "dark:text-slate-400 text-slate-600"}`}>{item.title}</p>
                                    <p className="text-xs dark:text-slate-600 text-slate-400 mt-0.5">
                                      {passed ? "اجتزته" : `اختبار${item.isRequired ? " · إلزامي" : ""}`}
                                    </p>
                                  </div>
                                </button>
                              );
                            }
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Unphased lessons */}
            {unphasedLessons.length > 0 && (
              <div className="space-y-0.5">
                {unphasedLessons.map(l => {
                  const done = completedIds.has(l.id);
                  const active = selectedItem?.type === "lesson" && selectedItem.id === l.id;
                  const locked = isItemLocked("lesson", l.id);
                  return (
                    <button key={l.id}
                      onClick={() => { if (!locked) goToLesson(l.id); }}
                      disabled={locked}
                      title={locked ? "أكمل الدرس السابق أولاً" : undefined}
                      className={`w-full text-right flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${locked ? "opacity-40 cursor-not-allowed" : active ? "dark:bg-cyan-500/10 bg-cyan-50 border dark:border-cyan-500/20 border-cyan-200" : "hover:dark:bg-white/5 hover:bg-slate-50"}`}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${locked ? "dark:bg-white/5 bg-slate-100" : done ? "bg-green-500/10 text-green-400" : active ? "bg-cyan-500/10 text-cyan-400" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500"}`}>
                        {locked ? <Lock className="w-3 h-3 dark:text-slate-600 text-slate-400" /> : done ? <CheckCircle className="w-3.5 h-3.5" /> : active ? <Play className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className={`text-xs font-medium line-clamp-2 ${locked ? "dark:text-slate-600 text-slate-400" : active ? "text-cyan-400" : done ? "dark:text-slate-300 text-slate-700" : "dark:text-slate-400 text-slate-600"}`}>{l.title}</p>
                        {l.duration && l.duration !== "0:00" && <p className="text-xs dark:text-slate-600 text-slate-400 mt-0.5">{l.duration}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Unphased quizzes */}
            {unphasedQuizzes.length > 0 && (
              <>
                {(coursePhases.length > 0 || unphasedLessons.length > 0) && <div className="border-t dark:border-white/5 border-slate-100 my-1" />}
                <p className="text-xs font-semibold dark:text-slate-500 text-slate-400 px-3 py-1 flex items-center gap-1.5">
                  <ClipboardList className="w-3 h-3 text-amber-400" />اختبارات نهائية
                </p>
                {unphasedQuizzes.map(q => {
                  const fullQuiz = getQuizFromAll(q.id);
                  const active = selectedItem?.type === "quiz" && selectedItem.id === q.id;
                  const locked = isItemLocked("quiz", q.id);
                  const passed = passedQuizIds.has(q.id);
                  return (
                    <button key={q.id}
                      onClick={() => { if (!locked && fullQuiz) goToQuiz(fullQuiz); }}
                      disabled={locked}
                      title={locked ? "أكمل الدرس السابق أولاً" : undefined}
                      className={`w-full text-right flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${locked ? "opacity-40 cursor-not-allowed" : active ? "dark:bg-amber-500/10 bg-amber-50 border dark:border-amber-500/20 border-amber-200" : "hover:dark:bg-white/5 hover:bg-slate-50"}`}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${locked ? "dark:bg-white/5 bg-slate-100" : passed ? "bg-green-500/10" : active ? "bg-amber-500/10" : "dark:bg-white/5 bg-slate-100"}`}>
                        {locked ? <Lock className="w-3 h-3 dark:text-slate-600 text-slate-400" /> : passed ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <ClipboardList className={`w-3.5 h-3.5 ${active ? "text-amber-400" : "dark:text-slate-400 text-slate-500"}`} />}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className={`text-xs font-medium line-clamp-2 ${locked ? "dark:text-slate-600 text-slate-400" : active ? "text-amber-400" : passed ? "dark:text-slate-300 text-slate-700" : "dark:text-slate-400 text-slate-600"}`}>{q.title}</p>
                        <p className="text-xs dark:text-slate-600 text-slate-400 mt-0.5">{passed ? "اجتزته" : `اختبار نهائي${q.isRequired ? " · إلزامي" : ""}`}</p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden top-[49px]" onClick={() => setSidebarOpen(false)} />}

        {/* ──── MAIN CONTENT ──── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {selectedItem?.type === "quiz" ? (
            <QuizTakingView
              courseId={courseId}
              quizId={selectedItem.id}
              quiz={selectedItem.quiz}
              onBack={() => { if (lesson) setSelectedItem({ type: "lesson", id: lesson.id }); else setSelectedItem(null); }}
              onNext={nextItem ? () => goToItem(nextItem) : null}
              onQuizPassed={handleQuizPassed}
              onCertificates={(certs) => setNewCerts(certs)}
            />
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : !lesson ? (
            <div className="flex flex-col items-center justify-center h-64">
              <BookOpen className="w-12 h-12 dark:text-slate-700 text-slate-300 mb-3" />
              <p className="dark:text-slate-400 text-slate-600">لا يوجد درس محدد</p>
            </div>
          ) : (
            <motion.div key={lesson.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
              {/* Video */}
              {videoSrc && (
                <div className="rounded-2xl overflow-hidden dark:bg-black bg-slate-900 shadow-2xl">
                  {isYoutube(videoSrc) ? (
                    <iframe src={getYoutubeEmbedUrl(videoSrc) || ""} className="w-full aspect-video"
                      allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      title={lesson.title} />
                  ) : (
                    <video src={videoSrc} controls className="w-full aspect-video" title={lesson.title} />
                  )}
                </div>
              )}

              {/* Lesson header */}
              <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-black dark:text-white text-slate-900 mb-2">{lesson.title}</h1>
                    <div className="flex items-center gap-3 text-xs dark:text-slate-500 text-slate-400">
                      {lesson.duration && lesson.duration !== "0:00" && <span>⏱ {lesson.duration}</span>}
                      {lesson.isFree && <span className="text-green-400 font-semibold">مجاني</span>}
                    </div>
                  </div>
                  {user && !isCompleted && (
                    <button onClick={handleComplete} disabled={completing}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/20 transition-colors flex-shrink-0">
                      {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {completing ? "جاري..." : "أكملت الدرس"}
                    </button>
                  )}
                  {isCompleted && (
                    <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold flex-shrink-0">
                      <CheckCircle className="w-4 h-4" />مكتمل
                    </span>
                  )}
                </div>
              </div>

              <LessonContent lesson={lesson} />

              {/* Navigation */}
              <div className="flex items-center justify-between gap-4 pb-6">
                <button onClick={() => nextItem && goToItem(nextItem)} disabled={!nextItem}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="truncate max-w-[150px]">{nextLabel ?? "التالي"}</span>
                  {nextItem?.type === "quiz" && <ClipboardList className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                </button>
                <button onClick={() => prevItem && goToItem(prevItem)} disabled={!prevItem}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                  {prevItem?.type === "quiz" && <ClipboardList className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  <span className="truncate max-w-[150px]">{prevLabel ?? "السابق"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}

