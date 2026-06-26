"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { use } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { api, type Course, type CoursePhaseSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getLevelLabel, getLevelColor } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  BookOpen, Clock, Users, ChevronDown, ChevronUp, Lock, Play,
  CheckCircle, ArrowRight, Loader2, Star, Award, Target, List,
  ClipboardList
} from "lucide-react";

interface CourseDetail extends Course {
  phases: CoursePhaseSummary[];
  lessons: { id: number; title: string; duration: string; order: number; isFree: boolean; videoUrl?: string | null }[];
  lessonsCount: number;
  instructorName: string;
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      api.get<CourseDetail | { course: CourseDetail }>(`/courses/${id}`),
    ]).then(([d]) => {
      const c = ("course" in d && d.course) ? d.course : d as CourseDetail;
      setCourse(c);
      if (c.phases?.length) setExpandedPhases(new Set([c.phases[0].id]));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    api.get<{ isEnrolled: boolean; progress: number }>(`/courses/${id}/enrollment`)
      .then((d) => {
        if (d.isEnrolled) {
          setEnrolled(true);
          setEnrollmentProgress(d.progress ?? 0);
        }
      })
      .catch(() => {});
  }, [id, user]);

  const handleEnroll = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    setEnrolling(true);
    try {
      const res = await api.post<{ message: string; alreadyEnrolled?: boolean }>(`/courses/${id}/enroll`, {});
      setEnrolled(true);
      if (res.alreadyEnrolled) {
        toast.info("أنت مسجل بالفعل في هذا الكورس");
      } else {
        toast.success("تم التسجيل في الكورس بنجاح!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setEnrolling(false);
    }
  };

  const togglePhase = (phaseId: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout>
        <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex flex-col items-center justify-center">
          <BookOpen className="w-16 h-16 dark:text-slate-700 text-slate-300 mb-4" />
          <h2 className="text-xl dark:text-white text-slate-900 font-bold mb-2">الكورس غير موجود</h2>
          <Link href="/courses" className="btn-primary mt-4"><ArrowRight className="w-4 h-4" />العودة للكورسات</Link>
        </div>
      </MainLayout>
    );
  }

  const totalLessons = course.phases
    ? course.phases.reduce((sum, p) => sum + p.lessons.length, 0) + (course.lessons?.length ?? 0)
    : course.lessons?.length ?? 0;
  const freeLessons = course.phases
    ? course.phases.flatMap(p => p.lessons).filter(l => l.isFree).length + (course.lessons?.filter(l => l.isFree).length ?? 0)
    : course.lessons?.filter(l => l.isFree).length ?? 0;
  const totalQuizzes = course.phases ? course.phases.reduce((sum, p) => sum + p.quizzes.length, 0) : 0;

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        {/* Hero */}
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid lg:grid-cols-3 gap-10 items-start">
              <div className="lg:col-span-2">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`badge ${getLevelColor(course.level)}`}>{getLevelLabel(course.level)}</span>
                    <span className="badge badge-cyan">{course.category}</span>
                    {course.isPaid ? (
                      <span className="flex items-center gap-1 badge badge-orange"><Lock className="w-3 h-3" />مدفوع</span>
                    ) : (
                      <span className="badge badge-green">مجاني</span>
                    )}
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black dark:text-white text-slate-900 mb-4 leading-tight">{course.title}</h1>
                  <p className="dark:text-slate-400 text-slate-600 text-lg leading-relaxed mb-6">{course.description}</p>
                  <div className="flex flex-wrap items-center gap-6 dark:text-slate-400 text-slate-500 text-sm">
                    <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-cyan-400" />{totalLessons} درس</span>
                    {totalQuizzes > 0 && <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-amber-400" />{totalQuizzes} اختبار</span>}
                    <span className="flex items-center gap-2" suppressHydrationWarning><Users className="w-4 h-4 text-cyan-400" />{(course.enrolledCount || 0).toLocaleString("ar-EG")} طالب</span>
                    {course.duration && course.duration !== "0 ساعة" && (
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-400" />{course.duration}</span>
                    )}
                    {(course.instructorName || course.instructor) && (
                      <span className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" />المدرس: {course.instructorName || course.instructor}</span>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Sidebar card */}
              <div className="lg:col-span-1">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                  className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden sticky top-24 shadow-xl">
                  {course.thumbnail && (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-44 object-cover" />
                  )}
                  <div className="p-6">
                    {course.isPaid && course.price ? (
                      <div className="text-3xl font-black text-amber-400 mb-4">{course.price} ج.م</div>
                    ) : (
                      <div className="text-3xl font-black text-green-400 mb-4">مجاني</div>
                    )}
                    {enrolled ? (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-semibold">
                          <CheckCircle className="w-5 h-5" />مسجل بالفعل
                        </div>
                        {enrollmentProgress > 0 && (
                          <div>
                            <div className="flex justify-between text-xs dark:text-slate-400 text-slate-500 mb-1">
                              <span>التقدم</span>
                              <span>{enrollmentProgress}%</span>
                            </div>
                            <div className="h-1.5 dark:bg-white/5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" style={{ width: `${enrollmentProgress}%` }} />
                            </div>
                          </div>
                        )}
                        <Link href={`/courses/${id}/learn`} className="btn-primary w-full justify-center py-3 text-base">
                          <Play className="w-5 h-5" />{enrollmentProgress > 0 ? "متابعة التعلم" : "ابدأ التعلم الآن"}
                        </Link>
                      </div>
                    ) : (
                      <button onClick={handleEnroll} disabled={enrolling} className="btn-primary w-full justify-center py-3 text-base mb-4">
                        {enrolling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                        {enrolling ? "جاري التسجيل..." : course.isPaid ? "شراء الكورس" : "سجّل مجاناً"}
                      </button>
                    )}
                    <ul className="space-y-3 dark:text-slate-300 text-slate-600 text-sm">
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyan-400" />{totalLessons} درس متاح</li>
                      {freeLessons > 0 && <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />{freeLessons} درس مجاني مفتوح</li>}
                      {totalQuizzes > 0 && <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" />{totalQuizzes} اختبار تقييمي</li>}
                      <li className="flex items-center gap-2"><Award className="w-4 h-4 text-cyan-400" />شهادة إتمام</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyan-400" />وصول مدى الحياة</li>
                    </ul>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="lg:max-w-2xl space-y-10">

            {/* What you'll learn */}
            {(course.whatYouLearn?.length ?? 0) > 0 && (
              <section>
                <h2 className="text-xl font-black dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-400" />ما الذي ستتعلمه
                </h2>
                <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    {course.whatYouLearn!.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm dark:text-slate-300 text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Objectives */}
            {(course.objectives?.length ?? 0) > 0 && (
              <section>
                <h2 className="text-xl font-black dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-violet-400" />أهداف الكورس
                </h2>
                <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
                  <ul className="space-y-2.5">
                    {course.objectives!.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-sm dark:text-slate-300 text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Requirements */}
            {(course.requirements?.length ?? 0) > 0 && (
              <section>
                <h2 className="text-xl font-black dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                  <List className="w-5 h-5 text-amber-400" />متطلبات الكورس
                </h2>
                <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
                  <ul className="space-y-2.5">
                    {course.requirements!.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm dark:text-slate-300 text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Course content - Phases */}
            <section>
              <h2 className="text-xl font-black dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />محتوى الكورس ({totalLessons} درس)
              </h2>

              {course.phases && course.phases.length > 0 ? (
                <div className="space-y-2">
                  {course.phases.map((phase, pi) => (
                    <motion.div key={phase.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.05 }}
                      className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 overflow-hidden">
                      <button onClick={() => togglePhase(phase.id)}
                        className="w-full flex items-center justify-between p-4 text-right hover:bg-cyan-500/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-xs font-bold text-cyan-400">
                            {pi + 1}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold dark:text-white text-slate-900 text-sm">{phase.title}</p>
                            <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                              {phase.lessons.length} درس{phase.quizzes.length > 0 ? ` · ${phase.quizzes.length} اختبار` : ""}
                            </p>
                          </div>
                        </div>
                        {expandedPhases.has(phase.id) ? <ChevronUp className="w-4 h-4 dark:text-slate-400 text-slate-400" /> : <ChevronDown className="w-4 h-4 dark:text-slate-400 text-slate-400" />}
                      </button>
                      <AnimatePresence>
                        {expandedPhases.has(phase.id) && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                            <div className="border-t dark:border-white/5 border-slate-100 divide-y dark:divide-white/5 divide-slate-50">
                              {phase.lessons.map(lesson => (
                                <div key={lesson.id} className="flex items-center justify-between px-4 py-3 hover:dark:bg-white/3 hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${lesson.isFree ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                                      {lesson.isFree ? <Play className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                    </div>
                                    <p className="text-sm dark:text-slate-300 text-slate-700">{lesson.title}</p>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-xs dark:text-slate-500 text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration}</span>
                                    {lesson.isFree && <span className="text-xs text-green-400 font-medium">مجاني</span>}
                                  </div>
                                </div>
                              ))}
                              {phase.quizzes.map(quiz => (
                                <div key={quiz.id} className="flex items-center gap-3 px-4 py-3 hover:dark:bg-white/3">
                                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                    <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
                                  </div>
                                  <p className="text-sm dark:text-slate-300 text-slate-700">{quiz.title}</p>
                                  {quiz.isRequired && <span className="text-xs text-amber-400 font-medium mr-auto">إلزامي</span>}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}

                  {/* Unphased lessons */}
                  {course.lessons && course.lessons.length > 0 && (
                    <div className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 overflow-hidden">
                      <div className="divide-y dark:divide-white/5 divide-slate-50">
                        {course.lessons.map(lesson => (
                          <div key={lesson.id} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${lesson.isFree ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                                {lesson.isFree ? <Play className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              </div>
                              <p className="text-sm dark:text-slate-300 text-slate-700">{lesson.title}</p>
                            </div>
                            <span className="text-xs dark:text-slate-500 text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : course.lessons && course.lessons.length > 0 ? (
                <div className="space-y-2">
                  {course.lessons.map((lesson, i) => (
                    <motion.div key={lesson.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${lesson.isFree ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                          {lesson.isFree ? <Play className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </div>
                        <p className="text-sm dark:text-slate-300 text-slate-700">{lesson.title}</p>
                      </div>
                      <span className="text-xs dark:text-slate-500 text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration}</span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 dark:text-slate-500 text-slate-400">لا توجد دروس متاحة حالياً</div>
              )}
            </section>

            {/* Course contents overview */}
            {(course.courseContents?.length ?? 0) > 0 && (
              <section>
                <h2 className="text-xl font-black dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />مواضيع الكورس
                </h2>
                <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                    {course.courseContents!.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm dark:text-slate-300 text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
