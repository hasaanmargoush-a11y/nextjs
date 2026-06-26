"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api, type CourseStructure, type Course } from "@/lib/api";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import { ArrowRight, Loader2, BookOpen, Info, Layers, Award, RefreshCw, Settings, MessageCircle } from "lucide-react";
import Link from "next/link";
import CourseInfoTab from "@/components/admin/course-editor/CourseInfoTab";
import ContentTab from "@/components/admin/course-editor/ContentTab";
import CertificatePreviewTab from "@/components/admin/course-editor/CertificatePreviewTab";
import SettingsTab from "@/components/admin/course-editor/SettingsTab";
import CourseChatTab from "@/components/admin/course-editor/CourseChatTab";

const TABS = [
  { id: "info", label: "معلومات", icon: Info },
  { id: "content", label: "المحتوى", icon: Layers },
  { id: "certificates", label: "الشهادات", icon: Award },
  { id: "settings", label: "الإعدادات", icon: Settings },
  { id: "chat", label: "الشات", icon: MessageCircle },
];

export default function CourseEditorPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string, 10);
  const [course, setCourse] = useState<Course | null>(null);
  const [structure, setStructure] = useState<CourseStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  const loadAll = useCallback(async () => {
    if (isNaN(courseId)) { router.push("/admin/courses"); return; }
    setLoading(true);
    try {
      const [courseData, structureData] = await Promise.all([
        api.get<Course>(`/admin/courses/${courseId}`),
        api.get<CourseStructure>(`/admin/courses/${courseId}/structure`),
      ]);
      setCourse(courseData);
      setStructure(structureData);
    } catch {
      toast.error("تعذّر تحميل الكورس");
      router.push("/admin/courses");
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  const loadStructure = useCallback(async () => {
    if (isNaN(courseId)) return;
    try {
      const structureData = await api.get<CourseStructure>(`/admin/courses/${courseId}/structure`);
      setStructure(structureData);
    } catch { toast.error("تعذّر تحميل المحتوى"); }
  }, [courseId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading || !course || !structure) {
    return (
      <AdminSectionGuard section="courses">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        </div>
      </AdminSectionGuard>
    );
  }

  const { phases, lessons, quizzes, certificates } = structure;

  return (
    <AdminSectionGuard section="courses">
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/courses" className="p-2 rounded-xl dark:hover:bg-white/5 hover:bg-slate-100 transition-colors">
            <ArrowRight className="w-5 h-5 dark:text-slate-400 text-slate-600" />
          </Link>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl dark:bg-white/5 bg-slate-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-cyan-400" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-black dark:text-white text-slate-900 truncate">{course.title}</h1>
              <p className="text-xs dark:text-slate-400 text-slate-500">
                {course.instructor && `${course.instructor} · `}{course.category}
                {!course.isPublished && <span className="mr-2 text-amber-400">مسودة</span>}
                {course.isPaid && <span className="mr-2 text-emerald-400">${course.price}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex gap-3 text-center hidden sm:flex">
              <div><p className="text-lg font-black text-cyan-400">{phases.length}</p><p className="text-xs dark:text-slate-500 text-slate-400">مرحلة</p></div>
              <div><p className="text-lg font-black text-violet-400">{lessons.length}</p><p className="text-xs dark:text-slate-500 text-slate-400">درس</p></div>
              <div><p className="text-lg font-black text-amber-400">{quizzes.length}</p><p className="text-xs dark:text-slate-500 text-slate-400">اختبار</p></div>
            </div>
            <button onClick={loadAll} className="p-2 rounded-xl dark:hover:bg-white/5 hover:bg-slate-100 transition-colors">
              <RefreshCw className="w-4 h-4 dark:text-slate-400 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Tabs - scrollable on mobile */}
        <div className="flex gap-1 mb-6 dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-cyan-500 text-white shadow-sm"
                    : "dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900"
                }`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {activeTab === "info" && (
              <CourseInfoTab
                courseId={courseId}
                course={course}
                onSaved={(updated) => setCourse(updated)}
              />
            )}
            {activeTab === "content" && (
              <ContentTab
                courseId={courseId}
                phases={phases}
                lessons={lessons}
                quizzes={quizzes}
                onRefresh={loadStructure}
              />
            )}
            {activeTab === "certificates" && (
              <CertificatePreviewTab
                courseId={courseId}
                courseTitle={course.title}
                phases={phases}
                certificates={certificates}
                onRefresh={loadStructure}
              />
            )}
            {activeTab === "settings" && (
              <SettingsTab
                courseId={courseId}
                course={course}
                onSaved={(updated) => setCourse(updated)}
              />
            )}
            {activeTab === "chat" && (
              <CourseChatTab courseId={courseId} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </AdminSectionGuard>
  );
}
