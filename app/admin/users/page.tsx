"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type User, type Course } from "@/lib/api";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/admin-roles";
import Link from "next/link";
import {
  Users, Search, Edit, Trash2, Shield, Star, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, Plus, X, BookOpen, UserPlus,
  CheckCircle, XCircle, Eye, Activity
} from "lucide-react";

interface Enrollment {
  enrollmentId: number;
  courseId: number;
  title: string;
  thumbnail: string | null;
  level: string;
  progress: number;
  enrolledAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddUser, setShowAddUser] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", username: "", password: "", role: "user" });
  const [addLoading, setAddLoading] = useState(false);

  const [enrollmentsUser, setEnrollmentsUser] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(search && { search }) });
      const data = await api.get<{ users: User[]; total: number }>(`/admin/users?${params}`);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("حدث خطأ في تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const handleUpdateRole = async () => {
    if (!editUser || !editRole) return;
    setSaving(true);
    try {
      await api.patch(`/admin/users/${editUser.id}`, { role: editRole });
      toast.success("تم تحديث الصلاحية بنجاح");
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: number, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${name}"؟`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success("تم حذف المستخدم");
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email || !addForm.password) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setAddLoading(true);
    try {
      await api.post("/admin/users", addForm);
      toast.success("تم إنشاء المستخدم بنجاح");
      setShowAddUser(false);
      setAddForm({ name: "", email: "", username: "", password: "", role: "user" });
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ في إنشاء المستخدم");
    } finally {
      setAddLoading(false);
    }
  };

  const openEnrollments = async (user: User) => {
    setEnrollmentsUser(user);
    setEnrollmentsLoading(true);
    try {
      const [enrs, courses] = await Promise.all([
        api.get<Enrollment[]>(`/admin/users/${user.id}/enrollments`),
        api.get<Course[]>("/admin/courses"),
      ]);
      setEnrollments(enrs);
      setAllCourses(courses);
    } catch {
      toast.error("حدث خطأ في تحميل الاشتراكات");
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  const handleEnroll = async (courseId: number) => {
    if (!enrollmentsUser) return;
    setEnrollingId(courseId);
    try {
      await api.post(`/admin/users/${enrollmentsUser.id}/enrollments`, { courseId });
      toast.success("تم تسجيل المستخدم في الكورس");
      const enrs = await api.get<Enrollment[]>(`/admin/users/${enrollmentsUser.id}/enrollments`);
      setEnrollments(enrs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleUnenroll = async (courseId: number) => {
    if (!enrollmentsUser) return;
    try {
      await api.delete(`/admin/users/${enrollmentsUser.id}/enrollments/${courseId}`);
      toast.success("تم إلغاء تسجيل المستخدم");
      setEnrollments(prev => prev.filter(e => e.courseId !== courseId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  const enrolledIds = new Set(enrollments.map(e => e.courseId));
  const filteredCourses = allCourses.filter(c =>
    !courseSearch || c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <AdminSectionGuard section="users">
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            إدارة المستخدمين
          </h1>
          <p className="dark:text-slate-400 text-slate-600 text-sm">{total.toLocaleString("ar-EG")} مستخدم إجمالاً</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAddUser(true)} className="btn-primary py-2 px-4 text-sm">
            <UserPlus className="w-4 h-4" />
            إضافة مستخدم
          </button>
        </div>
      </div>

      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
        <div className="p-4 border-b dark:border-white/10 border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الإيميل أو اليوزرنيم..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full py-2 pr-9 pl-3 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="dark:bg-white/5 bg-slate-50 text-right">
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">#</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">المستخدم</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden sm:table-cell">البريد</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">الصلاحية</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden md:table-cell">النقاط</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 divide-slate-100">
                {users.map((user, i) => (
                  <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="hover:dark:bg-white/5 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs dark:text-slate-500 text-slate-400">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.avatar
                            ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            : user.name?.charAt(0) || "م"}
                        </div>
                        <div>
                          <p className="text-sm font-medium dark:text-white text-slate-900">{user.name}</p>
                          <p className="text-xs dark:text-slate-500 text-slate-400">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-400 text-slate-600 hidden sm:table-cell" dir="ltr">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${ROLE_COLORS[user.role] || "bg-slate-500/15 text-slate-400"}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">{user.points || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/users/${user.id}/activity`} title="سجل النشاط"
                          className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center text-emerald-400 transition-colors">
                          <Activity className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => openEnrollments(user)} title="الاشتراكات"
                          className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center text-violet-400 transition-colors">
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditUser(user); setEditRole(user.role); }} title="تعديل الصلاحية"
                          className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center text-cyan-400 transition-colors">
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(user.id, user.name)} title="حذف"
                          className="w-7 h-7 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12 dark:text-slate-500 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                لا يوجد مستخدمون
              </div>
            )}
          </div>
        )}

        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t dark:border-white/10 border-slate-100">
            <p className="text-sm dark:text-slate-400 text-slate-600">صفحة {page} من {Math.ceil(total / limit)}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 disabled:opacity-40 hover:text-cyan-400 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / limit)}
                className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 disabled:opacity-40 hover:text-cyan-400 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                  إضافة مستخدم جديد
                </h3>
                <button onClick={() => setShowAddUser(false)} className="w-8 h-8 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1">الاسم الكامل *</label>
                  <input type="text" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} required
                    placeholder="محمد أحمد" className="w-full px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1">البريد الإلكتروني *</label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} required
                    dir="ltr" placeholder="user@example.com" className="w-full px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1">اسم المستخدم</label>
                  <input type="text" value={addForm.username} onChange={e => setAddForm(p => ({ ...p, username: e.target.value }))}
                    dir="ltr" placeholder="username (اختياري)" className="w-full px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1">كلمة المرور *</label>
                  <input type="password" value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} required minLength={6}
                    placeholder="6 أحرف على الأقل" className="w-full px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1">الصلاحية</label>
                  <select value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm">
                    {Object.entries(ROLE_LABELS).map(([v, l]) => (
                      <option key={v} value={v} className="dark:bg-[#111827]">{l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={addLoading} className="btn-primary flex-1 justify-center py-2.5">
                    {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    إنشاء المستخدم
                  </button>
                  <button type="button" onClick={() => setShowAddUser(false)} className="btn-secondary flex-1 justify-center py-2.5">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Role Modal */}
      <AnimatePresence>
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-bold dark:text-white text-slate-900 mb-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                تعديل صلاحية المستخدم
              </h3>
              <p className="dark:text-slate-400 text-slate-600 text-sm mb-4">{editUser.name} — {editUser.email}</p>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 mb-4">
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v} className="dark:bg-[#111827]">{l}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={handleUpdateRole} disabled={saving} className="btn-primary flex-1 justify-center py-2.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  حفظ
                </button>
                <button onClick={() => setEditUser(null)} className="btn-secondary flex-1 justify-center py-2.5">إلغاء</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enrollments Modal */}
      <AnimatePresence>
        {enrollmentsUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b dark:border-white/10 border-slate-100">
                <div>
                  <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-violet-400" />
                    اشتراكات {enrollmentsUser.name}
                  </h3>
                  <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">{enrollments.length} كورس مسجّل</p>
                </div>
                <button onClick={() => { setEnrollmentsUser(null); setEnrollments([]); setCourseSearch(""); }}
                  className="w-8 h-8 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {enrollmentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {enrollments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold dark:text-slate-400 text-slate-500 uppercase mb-2">الكورسات المسجّلة</p>
                      <div className="space-y-2">
                        {enrollments.map(e => (
                          <div key={e.enrollmentId} className="flex items-center justify-between p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-4 h-4 text-violet-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium dark:text-white text-slate-800 truncate">{e.title}</p>
                                <p className="text-xs dark:text-slate-500 text-slate-400">{Math.round(e.progress)}% مكتمل</p>
                              </div>
                            </div>
                            <button onClick={() => handleUnenroll(e.courseId)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-400 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors flex-shrink-0">
                              <XCircle className="w-3.5 h-3.5" />
                              إلغاء
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold dark:text-slate-400 text-slate-500 uppercase mb-2">إضافة كورس جديد</p>
                    <input type="text" placeholder="ابحث عن كورس..." value={courseSearch} onChange={e => setCourseSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 mb-2" />
                    <div className="space-y-1 max-h-48 overflow-auto">
                      {filteredCourses.filter(c => !enrolledIds.has(c.id)).slice(0, 10).map(c => (
                        <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg dark:hover:bg-white/5 hover:bg-slate-50 transition-colors">
                          <span className="text-sm dark:text-slate-300 text-slate-700 truncate">{c.title}</span>
                          <button onClick={() => handleEnroll(c.id)} disabled={enrollingId === c.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-cyan-400 dark:hover:bg-cyan-500/10 hover:bg-cyan-50 transition-colors flex-shrink-0">
                            {enrollingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            تسجيل
                          </button>
                        </div>
                      ))}
                      {filteredCourses.filter(c => !enrolledIds.has(c.id)).length === 0 && (
                        <p className="text-center text-sm dark:text-slate-500 text-slate-400 py-4">لا توجد كورسات متاحة</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </AdminSectionGuard>
  );
}
