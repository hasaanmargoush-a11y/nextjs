"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Clock, Users, Star, Lock, BookOpen } from "lucide-react";
import { api, type FeaturedCourse } from "@/lib/api";
import { getLevelLabel, getLevelColor } from "@/lib/utils";

export function FeaturedCourses() {
  const [courses, setCourses] = useState<FeaturedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<FeaturedCourse[] | { courses: FeaturedCourse[] }>("/stats/featured-courses")
      .then((d) => setCourses(Array.isArray(d) ? d : (d.courses || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-20 dark:bg-[#0a0f1e] bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <span className="badge badge-cyan mb-3">الأكثر شعبية</span>
            <h2 className="section-title dark:text-white text-slate-900">
              كورسات مختارة لك
            </h2>
            <p className="dark:text-slate-400 text-slate-600 mt-3 max-w-lg">
              اختر من مكتبة كورسات متنوعة في لغات البرمجة المختلفة
            </p>
          </div>
          <Link
            href="/courses"
            className="hidden sm:flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            عرض الكل
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden animate-pulse"
              >
                <div className="h-48 dark:bg-white/5 bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 dark:bg-white/10 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 dark:bg-white/10 bg-slate-200 rounded" />
                  <div className="h-4 dark:bg-white/10 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
        )}

        <div className="text-center mt-10 sm:hidden">
          <Link href="/courses" className="btn-secondary">
            عرض جميع الكورسات
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CourseCard({ course, index }: { course: FeaturedCourse; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
    >
      <Link href={`/courses/${course.id}`}>
        <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 group h-full">
          <div className="relative h-48 dark:bg-gradient-to-br dark:from-cyan-900/30 dark:to-violet-900/30 bg-gradient-to-br from-cyan-50 to-violet-50 overflow-hidden">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="w-16 h-16 dark:text-white/10 text-slate-200" />
                <div className="absolute bottom-4 right-4">
                  <span className="text-4xl font-black dark:text-white/20 text-slate-200">
                    {course.category?.charAt(0) || "ب"}
                  </span>
                </div>
              </div>
            )}
            {course.isPaid && (
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 bg-amber-500 rounded-full text-white text-xs font-bold">
                <Lock className="w-3 h-3" />
                مدفوع
              </div>
            )}
            {!course.isPaid && (
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-green-500 rounded-full text-white text-xs font-bold">
                مجاني
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`badge ${getLevelColor(course.level)}`}>
                {getLevelLabel(course.level)}
              </span>
              <span className="badge badge-cyan">{course.category}</span>
            </div>

            <h3 className="font-bold dark:text-white text-slate-900 text-lg leading-snug mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
              {course.title}
            </h3>

            <p className="dark:text-slate-400 text-slate-500 text-sm line-clamp-2 mb-4">
              {course.description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t dark:border-white/10 border-slate-100">
              <div className="flex items-center gap-3 text-xs dark:text-slate-400 text-slate-500">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {course.lessonsCount || 0} درس
                </span>
                <span className="flex items-center gap-1" suppressHydrationWarning>
                  <Users className="w-3.5 h-3.5" />
                  {(course.enrolledCount || 0).toLocaleString("ar-EG")}
                </span>
              </div>
              {course.isPaid && course.price ? (
                <span className="font-bold text-amber-400">
                  {course.price} ج.م
                </span>
              ) : (
                <span className="font-bold text-green-400">مجاني</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <BookOpen className="w-16 h-16 dark:text-slate-700 text-slate-300 mx-auto mb-4" />
      <p className="dark:text-slate-400 text-slate-600">
        لا توجد كورسات متاحة حالياً
      </p>
    </div>
  );
}
