"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  BookOpen, Play, CheckCircle, Clock, Loader2, Filter, Search,
  BookMarked, TrendingUp, ChevronRight
} from "lucide-react";

interface EnrolledCourse {
  id: number;
  title: string;
  thumbnail: string | null;
  category: string;
  level: string;
  progress: number;
  completedLessons: number;
  enrolledAt: string;
  completedAt: string | null;
}

const LEVEL_MAP: Record<string, string> = {
  beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم",
  مبتدئ: "مبتدئ", متوسط: "متوسط", متقدم: "متقدم",
};

export default function MyCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "in-progress" | "completed">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ courses: EnrolledCourse[] }>("/users/enrolled-courses")
      .then(d => setCourses(d.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center dark:bg-[#0a0f1e] bg-slate-50">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const filtered = courses.filter(c => {
    const matchFilter =
      filter === "all" ||
      (filter === "completed" && c.completedAt !== null) ||
      (filter === "in-progress" && c.completedAt === null);
    const matchSearch = !search || c.title.includes(search) || c.category.includes(search);
    return matchFilter && matchSearch;
  });

  const completed = courses.filter(c => c.completedAt).length;
  const inProgress = courses.filter(c => !c.completedAt).length;

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/dashboard" className="text-sm dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-1">
                  لوحة التحكم <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <span className="badge badge-cyan mb-3 inline-block">كورساتي</span>
              <h1 className="text-3xl font-black dark:text-white text-slate-900 mb-2">كورساتي المسجلة</h1>
              <p className="dark:text-slate-400 text-slate-500 text-sm">
                متابعة تقدمك في جميع الكورسات المسجل بها
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "إجمالي الكورسات", value: courses.length, color: "text-cyan-400", bg: "bg-cyan-500/10", icon: <BookMarked className="w-5 h-5" /> },
              { label: "جاري التعلم", value: inProgress, color: "text-amber-400", bg: "bg-amber-500/10", icon: <TrendingUp className="w-5 h-5" /> },
              { label: "مكتملة", value: completed, color: "text-green-400", bg: "bg-green-500/10", icon: <CheckCircle className="w-5 h-5" /> },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4 flex items-center gap-4">
                <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                <div>
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs dark:text-slate-500 text-slate-400">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" />
              <input type="text" placeholder="ابحث في كورساتك..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full py-2.5 pr-10 pl-4 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 transition-colors text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 dark:text-slate-400 text-slate-500" />
              {(["all", "in-progress", "completed"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? "gradient-bg text-white shadow-lg shadow-cyan-500/20" : "dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400"}`}>
                  {f === "all" ? "الكل" : f === "in-progress" ? "جاري التعلم" : "مكتملة"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 animate-pulse h-48" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 dark:text-slate-700 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold dark:text-slate-400 text-slate-600 mb-2">
                {courses.length === 0 ? "لم تسجل في أي كورس بعد" : "لا توجد نتائج"}
              </h3>
              <p className="dark:text-slate-500 text-slate-400 text-sm mb-6">
                {courses.length === 0 ? "ابدأ رحلتك التعليمية الآن" : "جرب تغيير خيارات الفلترة"}
              </p>
              {courses.length === 0 && (
                <Link href="/courses" className="btn-primary inline-flex">
                  <BookOpen className="w-4 h-4" />
                  استعرض الكورسات
                </Link>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((course, i) => (
                <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }}>
                  <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5 transition-all flex flex-col h-full">
                    <div className="h-32 dark:bg-gradient-to-br dark:from-cyan-900/30 dark:to-violet-900/30 bg-gradient-to-br from-cyan-50 to-violet-50 flex items-center justify-center relative">
                      <BookOpen className="w-10 h-10 text-cyan-400 opacity-50" />
                      {course.completedAt && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-lg text-xs text-green-400 font-medium">
                          <CheckCircle className="w-3 h-3" /> مكتمل
                        </div>
                      )}
                      {course.level && (
                        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-medium dark:bg-white/10 bg-white/80 dark:text-slate-300 text-slate-600">
                          {LEVEL_MAP[course.level] || course.level}
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <span className="badge text-xs dark:bg-violet-500/20 dark:text-violet-300 bg-violet-50 text-violet-700 border dark:border-violet-500/20 border-violet-200 mb-2 w-fit">
                        {course.category}
                      </span>
                      <h3 className="font-bold dark:text-white text-slate-900 mb-3 leading-snug flex-1">{course.title}</h3>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs dark:text-slate-500 text-slate-400 mb-1.5">
                          <span>التقدم</span>
                          <span className="font-bold text-cyan-400">{course.progress}%</span>
                        </div>
                        <div className="relative h-2 dark:bg-white/10 bg-slate-200 rounded-full overflow-hidden">
                          <div className="absolute inset-y-0 right-0 gradient-bg rounded-full transition-all" style={{ width: `${course.progress}%` }} />
                        </div>
                        {course.completedLessons > 0 && (
                          <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">{course.completedLessons} درس مكتمل</p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <Link href={`/courses/${course.id}/learn`} className="btn-primary flex-1 justify-center py-2 text-sm">
                          <Play className="w-3.5 h-3.5" />
                          {course.progress > 0 ? "متابعة" : "ابدأ الآن"}
                        </Link>
                        <Link href={`/courses/${course.id}`} className="btn-secondary px-3 py-2 text-sm">
                          <BookOpen className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
