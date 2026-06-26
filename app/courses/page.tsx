"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { useRouteOverride } from "@/hooks/useRouteOverride";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import { api, type Course } from "@/lib/api";
import { getLevelLabel, getLevelColor } from "@/lib/utils";
import Link from "next/link";
import { Search, BookOpen, Users, Lock, SlidersHorizontal, X, ChevronDown, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const categories = ["الكل", "Python", "JavaScript", "React", "C++", "Java", "Flutter", "SQL", "DevOps"];
const levels = [
  { value: "", label: "كل المستويات" },
  { value: "beginner", label: "مبتدئ" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "متقدم" },
  { value: "expert", label: "خبير" },
];
const sortOptions = [
  { value: "newest", label: "الأحدث أولاً" },
  { value: "oldest", label: "الأقدم أولاً" },
  { value: "popular", label: "الأكثر طلاباً" },
];

const PAGE_SIZE = 12;

interface CoursesResponse {
  courses: Course[];
  total: number;
  hasMore: boolean;
}

async function loadCourses(params: {
  search: string;
  category: string;
  level: string;
  sort: string;
  offset: number;
}): Promise<CoursesResponse> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.category && params.category !== "الكل") q.set("category", params.category);
  if (params.level) q.set("level", params.level);
  q.set("sort", params.sort);
  q.set("limit", String(PAGE_SIZE));
  q.set("offset", String(params.offset));
  return api.get<CoursesResponse>(`/courses?${q}`);
}

function CoursesContent() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const offsetRef = useRef(0);

  useEffect(() => {
    offsetRef.current = 0;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await loadCourses({ search, category, level, sort, offset: 0 });
        setCourses(data.courses ?? []);
        setTotal(data.total ?? 0);
        setHasMore(data.hasMore ?? false);
        offsetRef.current = PAGE_SIZE;
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category, level, sort]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await loadCourses({ search, category, level, sort, offset: offsetRef.current });
      setCourses(prev => [...prev, ...(data.courses ?? [])]);
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
      offsetRef.current += PAGE_SIZE;
    } catch {
      // silent fail
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
      <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="badge badge-cyan mb-4 inline-block">الكورسات</span>
            <h1 className="section-title dark:text-white text-slate-900 mb-4">
              استعرض جميع الكورسات
            </h1>
            <p className="dark:text-slate-400 text-slate-600 mb-8">
              اختر من مئات الكورسات في مختلف لغات وتقنيات البرمجة
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث عن كورس..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full py-3 pr-10 pl-4 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all font-medium ${
                  showFilters
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                    : "dark:bg-white/5 bg-slate-100 dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-600"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                فلترة
              </button>
            </div>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 flex flex-wrap gap-3"
              >
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="px-4 py-2 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm"
                >
                  {levels.map((l) => (
                    <option key={l.value} value={l.value} className="dark:bg-[#111827]">
                      {l.label}
                    </option>
                  ))}
                </select>
                {(search || category || level) && (
                  <button
                    onClick={() => { setSearch(""); setCategory(""); setLevel(""); }}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20"
                  >
                    <X className="w-3 h-3" /> مسح الفلاتر
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat === "الكل" ? "" : cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  (cat === "الكل" && !category) || category === cat
                    ? "gradient-bg text-white shadow-lg shadow-cyan-500/25"
                    : "dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative flex-shrink-0">
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="pl-8 pr-4 py-2 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm appearance-none cursor-pointer"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value} className="dark:bg-[#111827]">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden animate-pulse">
                <div className="h-40 dark:bg-white/5 bg-slate-100" />
                <div className="p-4 space-y-3">
                  <div className="h-3 dark:bg-white/10 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 dark:bg-white/10 bg-slate-200 rounded" />
                  <div className="h-3 dark:bg-white/10 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 dark:text-slate-700 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold dark:text-slate-400 text-slate-600 mb-2">
              لا توجد كورسات
            </h3>
            <p className="dark:text-slate-500 text-slate-400 text-sm">
              جرب تغيير كلمة البحث أو الفلاتر
            </p>
          </div>
        ) : (
          <>
            <p className="dark:text-slate-400 text-slate-600 text-sm mb-6">
              يعرض <span className="text-cyan-400 font-semibold">{courses.length}</span> من <span className="text-cyan-400 font-semibold">{total}</span> كورس
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  whileHover={{ y: -3 }}
                >
                  <Link href={`/courses/${course.id}`}>
                    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group h-full">
                      <div className="relative h-40 dark:bg-gradient-to-br dark:from-cyan-900/30 dark:to-violet-900/30 bg-gradient-to-br from-cyan-50 to-violet-50">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-12 h-12 dark:text-white/10 text-slate-200" />
                          </div>
                        )}
                        {course.isPaid ? (
                          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-amber-500 rounded-full text-white text-xs font-bold">
                            <Lock className="w-3 h-3" /> مدفوع
                          </span>
                        ) : (
                          <span className="absolute top-2 left-2 px-2 py-0.5 bg-green-500 rounded-full text-white text-xs font-bold">مجاني</span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className={`badge text-xs ${getLevelColor(course.level)}`}>{getLevelLabel(course.level)}</span>
                        </div>
                        <h3 className="font-bold dark:text-white text-slate-900 text-sm leading-snug mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs dark:text-slate-400 text-slate-500">
                          <span className="flex items-center gap-1" suppressHydrationWarning>
                            <Users className="w-3 h-3" />
                            {(course.enrolledCount || 0).toLocaleString("ar-EG")}
                          </span>
                          {course.isPaid && course.price ? (
                            <span className="font-bold text-amber-400">{course.price} ج.م</span>
                          ) : (
                            <span className="font-bold text-green-400">مجاني</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-secondary px-8 py-3 text-base disabled:opacity-60 flex items-center gap-2 mx-auto"
                >
                  {loadingMore ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />جاري التحميل...</>
                  ) : (
                    <>تحميل المزيد ({total - courses.length} كورس متبقي)</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CoursesPageDefault() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50" />}>
        <CoursesContent />
      </Suspense>
    </MainLayout>
  );
}

export default function CoursesPage() {
  const { checking, blocks } = useRouteOverride("courses");
  if (checking) return <MainLayout><div className="min-h-[80vh] dark:bg-[#0a0f1e] bg-slate-50" /></MainLayout>;
  if (blocks) return <MainLayout><BlockRenderer blocks={blocks} /></MainLayout>;
  return <CoursesPageDefault />;
}
