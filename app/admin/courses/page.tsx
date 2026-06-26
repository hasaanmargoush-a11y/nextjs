"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { api, type Course } from "@/lib/api";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import { getLevelLabel, getLevelColor } from "@/lib/utils";
import {
  BookOpen, Search, Plus, Edit, Trash2, Lock, Loader2,
  RefreshCw, Users, ChevronLeft, ChevronRight, X, Save
} from "lucide-react";
import Link from "next/link";

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const limit = 15;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...(search && { search }) });
      const data = await api.get<Course[]>(`/admin/courses?${params}`);
      const list = Array.isArray(data) ? data : [];
      setCourses(list);
      setTotal(list.length);
      setPage(1);
    } catch {
      toast.error("حدث خطأ في تحميل الكورسات");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchCourses, 300);
    return () => clearTimeout(t);
  }, [fetchCourses]);

  const paginated = courses.slice((page - 1) * limit, page * limit);

  const handleCreate = async () => {
    if (!newTitle.trim()) { toast.error("عنوان الكورس مطلوب"); return; }
    setCreating(true);
    try {
      const course = await api.post<Course>("/admin/courses", { title: newTitle.trim() });
      toast.success("تم إنشاء الكورس");
      router.push(`/admin/courses/${course.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (courseId: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكورس؟ سيتم حذف جميع المراحل والدروس والاختبارات.")) return;
    try {
      await api.delete(`/admin/courses/${courseId}`);
      toast.success("تم حذف الكورس");
      fetchCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  return (
    <AdminSectionGuard section="courses">
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-1">إدارة الكورسات</h1>
          <p className="dark:text-slate-400 text-slate-600 text-sm">{total.toLocaleString("ar-EG")} كورس إجمالاً</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCourses} className="flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setNewTitle(""); setShowNew(true); }} className="btn-primary text-sm py-2 px-4">
            <Plus className="w-4 h-4" />إضافة كورس
          </button>
        </div>
      </div>

      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
        <div className="p-4 border-b dark:border-white/10 border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" />
            <input type="text" placeholder="بحث عن كورس..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full py-2 pr-9 pl-3 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="dark:bg-white/5 bg-slate-50 text-right">
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">الكورس</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden sm:table-cell">التصنيف</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">المستوى</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden md:table-cell">الطلاب</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">النوع</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">الحالة</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 divide-slate-100">
                {paginated.map((course, i) => (
                  <motion.tr key={course.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="hover:dark:bg-white/5 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4 text-cyan-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium dark:text-white text-slate-900 line-clamp-1">{course.title}</p>
                          {course.instructor && <p className="text-xs dark:text-slate-500 text-slate-400">{course.instructor}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-400 text-slate-600 hidden sm:table-cell">{course.category}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${getLevelColor(course.level)}`}>{getLevelLabel(course.level)}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 dark:text-slate-400 text-slate-600 text-sm">
                        <Users className="w-3.5 h-3.5" />{course.enrolledCount || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {course.isPaid ? (
                        <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                          <Lock className="w-3 h-3" />{course.price} ج.م
                        </div>
                      ) : (
                        <span className="text-green-400 text-xs font-semibold">مجاني</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.isPublished ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 dark:text-slate-400 text-slate-500"}`}>
                        {course.isPublished ? "منشور" : "مسودة"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/courses/${course.id}`}
                          className="w-7 h-7 rounded-lg dark:hover:bg-cyan-500/10 hover:bg-cyan-50 flex items-center justify-center text-cyan-400 transition-colors" title="تعديل الكورس">
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => handleDelete(course.id)}
                          className="w-7 h-7 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {paginated.length === 0 && (
              <div className="text-center py-12 dark:text-slate-500 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2" />لا توجد كورسات
              </div>
            )}
          </div>
        )}

        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t dark:border-white/10 border-slate-100">
            <p className="text-sm dark:text-slate-400 text-slate-600">صفحة {page} من {Math.ceil(total / limit)}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center disabled:opacity-40 hover:text-cyan-400 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / limit)}
                className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center disabled:opacity-40 hover:text-cyan-400 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold dark:text-white text-slate-900">إضافة كورس جديد</h3>
              <button onClick={() => setShowNew(false)} className="dark:text-slate-400 text-slate-500 hover:text-red-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm dark:text-slate-400 text-slate-500 mb-4">أدخل عنوان الكورس وسيتم فتح صفحة التعديل الكاملة</p>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="مثال: كورس Python للمبتدئين"
              className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1 justify-center py-2.5">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {creating ? "جاري الإنشاء..." : "إنشاء وتعديل"}
              </button>
              <button onClick={() => setShowNew(false)} className="btn-secondary flex-1 justify-center py-2.5">إلغاء</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    </AdminSectionGuard>
  );
}
