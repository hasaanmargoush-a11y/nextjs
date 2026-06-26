"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import {
  Code2, Search, Plus, Edit, Trash2, Loader2,
  RefreshCw, ChevronLeft, ChevronRight, X, Save, Star,
  FlaskConical, Eye, EyeOff, PlusCircle, MinusCircle, Tag, Building2, Package
} from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const PROBLEM_TAGS = [
  "arrays", "strings", "loops", "recursion", "sorting", "searching",
  "hash-map", "linked-list", "stack", "queue", "tree", "graph",
  "dynamic-programming", "greedy", "math", "bit-manipulation",
  "two-pointers", "sliding-window", "binary-search", "backtracking",
];
const COMPANIES = ["Google", "Meta", "Amazon", "Microsoft", "Apple", "Netflix", "Uber", "Airbnb"];

interface Pack { id: number; title: string; trackId: number; }
interface TrackWithPacks { id: number; title: string; packs: Pack[]; }

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  category: string;
  language: string;
  points: number;
  solvedCount: number;
  isPublished: boolean;
}

const testCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string().min(1, "الناتج المتوقع مطلوب"),
});

const exampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string().optional(),
});

const problemSchema = z.object({
  title: z.string().min(3, "العنوان 3 أحرف على الأقل"),
  description: z.string().min(20, "الوصف 20 حرف على الأقل"),
  difficulty: z.string().min(1),
  category: z.string().min(1, "اختر تصنيفاً"),
  language: z.string().min(1),
  points: z.number().int().min(1),
  starterCode: z.string().optional(),
  solution: z.string().optional(),
  hints: z.string().optional(),
  constraints: z.string().optional(),
  testCases: z.array(testCaseSchema).default([]),
  examples: z.array(exampleSchema).default([]),
  isPublished: z.boolean(),
  tags: z.array(z.string()).default([]),
  companyTags: z.array(z.string()).default([]),
  packId: z.number().nullable().optional(),
  orderInPack: z.number().default(0),
});

type ProblemFormData = z.infer<typeof problemSchema>;

interface AdminProblem extends Problem {
  description: string;
  starterCode?: string;
  solution?: string;
  hints: string[];
  constraints: string[];
  testCases: { input: string; expectedOutput: string }[];
  examples: { input: string; output: string; explanation?: string }[];
  tags: string[];
  companyTags: string[];
  packId?: number | null;
  orderInPack?: number;
}

export default function AdminProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editProblem, setEditProblem] = useState<AdminProblem | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "tags" | "testcases" | "examples" | "solution">("basic");
  const [tracksWithPacks, setTracksWithPacks] = useState<TrackWithPacks[]>([]);
  const limit = 20;

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProblemFormData>({
    resolver: zodResolver(problemSchema),
    defaultValues: { difficulty: "easy", language: "Python", points: 10, isPublished: true, testCases: [], examples: [], tags: [], companyTags: [], packId: null, orderInPack: 0 },
  });

  const watchedTags = watch("tags") ?? [];
  const watchedCompanyTags = watch("companyTags") ?? [];
  const watchedPackId = watch("packId");

  const { fields: tcFields, append: tcAppend, remove: tcRemove } = useFieldArray({ control, name: "testCases" });
  const { fields: exFields, append: exAppend, remove: exRemove } = useFieldArray({ control, name: "examples" });

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...(search && { search }) });
      const data = await api.get<Problem[]>(`/admin/problems?${params}`);
      setProblems(Array.isArray(data) ? data : []);
      setTotal(Array.isArray(data) ? data.length : 0);
    } catch {
      toast.error("حدث خطأ في تحميل المسائل");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchProblems, 300);
    return () => clearTimeout(t);
  }, [fetchProblems]);

  useEffect(() => {
    api.get<TrackWithPacks[]>("/admin/tracks").then(setTracksWithPacks).catch(() => {});
  }, []);

  const openAdd = () => {
    setEditProblem(null);
    reset({ difficulty: "easy", language: "Python", points: 10, isPublished: true, testCases: [], examples: [], tags: [], companyTags: [], packId: null, orderInPack: 0 });
    setActiveTab("basic");
    setShowForm(true);
  };

  const openEdit = (p: Problem) => {
    api.get<AdminProblem>(`/admin/problems/${p.id}/detail`).then((full) => {
      setEditProblem(full);
      reset({
        title: full.title,
        description: full.description,
        difficulty: full.difficulty,
        category: full.category,
        language: full.language,
        points: full.points,
        starterCode: full.starterCode || "",
        solution: full.solution || "",
        hints: full.hints?.join("\n") || "",
        constraints: full.constraints?.join("\n") || "",
        testCases: full.testCases || [],
        examples: full.examples || [],
        isPublished: full.isPublished,
        tags: full.tags || [],
        companyTags: full.companyTags || [],
        packId: full.packId ?? null,
        orderInPack: full.orderInPack ?? 0,
      });
      setActiveTab("basic");
      setShowForm(true);
    }).catch(() => toast.error("حدث خطأ في تحميل بيانات المسألة"));
  };

  const onSubmit = async (data: ProblemFormData) => {
    try {
      const body = {
        ...data,
        hints: data.hints ? data.hints.split("\n").filter(Boolean) : [],
        constraints: data.constraints ? data.constraints.split("\n").filter(Boolean) : [],
      };
      if (editProblem) {
        await api.patch(`/admin/problems/${editProblem.id}`, body);
        toast.success("تم تحديث المسألة بنجاح");
      } else {
        await api.post("/admin/problems", body);
        toast.success("تم إضافة المسألة بنجاح");
      }
      setShowForm(false);
      fetchProblems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه المسألة؟ سيتم حذف جميع المحاولات المرتبطة بها.")) return;
    try {
      await api.delete(`/admin/problems/${id}`);
      toast.success("تم حذف المسألة");
      fetchProblems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  const togglePublish = async (p: Problem) => {
    try {
      await api.patch(`/admin/problems/${p.id}`, { isPublished: !p.isPublished });
      toast.success(p.isPublished ? "تم إخفاء المسألة" : "تم نشر المسألة");
      fetchProblems();
    } catch {
      toast.error("حدث خطأ");
    }
  };

  const toggleTag = (tag: string) => {
    const current = watchedTags;
    if (current.includes(tag)) {
      setValue("tags", current.filter((t) => t !== tag));
    } else {
      setValue("tags", [...current, tag]);
    }
  };

  const toggleCompanyTag = (company: string) => {
    const current = watchedCompanyTags;
    if (current.includes(company)) {
      setValue("companyTags", current.filter((c) => c !== company));
    } else {
      setValue("companyTags", [...current, company]);
    }
  };

  const diffColors: Record<string, string> = {
    easy: "text-green-400", medium: "text-amber-400", hard: "text-red-400", expert: "text-violet-400",
  };
  const diffLabels: Record<string, string> = {
    easy: "سهل", medium: "متوسط", hard: "صعب", expert: "خبير",
  };

  const paginated = problems.slice((page - 1) * limit, page * limit);

  const formTabs = [
    { id: "basic", label: "المعلومات الأساسية" },
    { id: "tags", label: `الوسوم (${watchedTags.length + watchedCompanyTags.length})` },
    { id: "testcases", label: `حالات الاختبار (${tcFields.length})` },
    { id: "examples", label: `الأمثلة (${exFields.length})` },
    { id: "solution", label: "الكود والحل" },
  ] as const;

  return (
    <AdminSectionGuard section="problems">
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-1">إدارة التحديات</h1>
          <p className="dark:text-slate-400 text-slate-600 text-sm">{total.toLocaleString("ar-EG")} مسألة إجمالاً</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchProblems} className="flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openAdd} className="btn-primary text-sm py-2 px-4">
            <Plus className="w-4 h-4" />
            إضافة مسألة
          </button>
        </div>
      </div>

      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
        <div className="p-4 border-b dark:border-white/10 border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" />
            <input
              type="text"
              placeholder="بحث عن مسألة..."
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
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">المسألة</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden sm:table-cell">الصعوبة</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden md:table-cell">اللغة</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">النقاط</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden lg:table-cell">حُلّت</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">الحالة</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 divide-slate-100">
                {paginated.map((problem, i) => (
                  <motion.tr
                    key={problem.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:dark:bg-white/5 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Code2 className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium dark:text-white text-slate-900 line-clamp-1">{problem.title}</p>
                          <p className="text-xs dark:text-slate-500 text-slate-400">{problem.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-semibold ${diffColors[problem.difficulty] || "text-slate-400"}`}>
                        {diffLabels[problem.difficulty] || problem.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-400 text-slate-600 hidden md:table-cell">
                      {problem.language}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                        <Star className="w-3.5 h-3.5" />
                        {problem.points}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-400 text-slate-600 hidden lg:table-cell">
                      {problem.solvedCount?.toLocaleString("ar-EG") || 0}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePublish(problem)} className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                        problem.isPublished
                          ? "text-green-400 dark:bg-green-500/10 bg-green-50"
                          : "text-slate-400 dark:bg-white/5 bg-slate-100"
                      }`}>
                        {problem.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {problem.isPublished ? "منشورة" : "مخفية"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(problem)}
                          className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center text-cyan-400 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(problem.id)}
                          className="w-7 h-7 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors"
                        >
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
                <Code2 className="w-10 h-10 mx-auto mb-2" />
                لا توجد مسائل
              </div>
            )}
          </div>
        )}

        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t dark:border-white/10 border-slate-100">
            <p className="text-sm dark:text-slate-400 text-slate-600">
              صفحة {page} من {Math.ceil(total / limit)}
            </p>
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

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="dark:bg-[#0f1623] bg-white rounded-2xl border dark:border-white/10 border-slate-200 w-full max-w-3xl shadow-2xl my-4"
          >
            <div className="flex items-center justify-between p-5 border-b dark:border-white/10 border-slate-100">
              <h3 className="font-bold dark:text-white text-slate-900 text-lg flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                {editProblem ? "تعديل مسألة" : "إضافة مسألة جديدة"}
              </h3>
              <button onClick={() => setShowForm(false)} className="dark:text-slate-400 text-slate-500 hover:text-red-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b dark:border-white/10 border-slate-100 overflow-x-auto">
              {formTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "dark:text-slate-400 text-slate-600 hover:text-cyan-400"
                  }`}
                >
                  {tab.id === "testcases" && <FlaskConical className="w-3.5 h-3.5 inline ml-1" />}
                  {tab.id === "tags" && <Tag className="w-3.5 h-3.5 inline ml-1" />}
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

                {/* TAB: Basic */}
                {activeTab === "basic" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">عنوان المسألة *</label>
                      <input {...register("title")} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" placeholder="مثال: مجموع عناصر المصفوفة" />
                      {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">وصف المسألة *</label>
                      <textarea {...register("description")} rows={6} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 resize-y" placeholder="اشرح المسألة بالتفصيل..." />
                      {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">الصعوبة</label>
                        <select {...register("difficulty")} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900">
                          <option value="easy" className="dark:bg-[#111827]">سهل</option>
                          <option value="medium" className="dark:bg-[#111827]">متوسط</option>
                          <option value="hard" className="dark:bg-[#111827]">صعب</option>
                          <option value="expert" className="dark:bg-[#111827]">خبير</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">اللغة</label>
                        <select {...register("language")} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900">
                          {["Python","JavaScript","C++","Java","Go","Rust","TypeScript","SQL"].map((l) => (
                            <option key={l} value={l} className="dark:bg-[#111827]">{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">التصنيف *</label>
                        <input {...register("category")} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" placeholder="مثال: مصفوفات" />
                        {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">النقاط</label>
                        <input {...register("points", { valueAsNumber: true })} type="number" min={1} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" />
                      </div>
                    </div>

                    {/* Pack assignment */}
                    <div className="p-3 dark:bg-white/5 bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-medium dark:text-slate-300 text-slate-700">ربط بحزمة تعليمية (اختياري)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">الحزمة</label>
                          <Controller
                            control={control}
                            name="packId"
                            render={({ field }) => (
                              <select
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2 rounded-lg dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none focus:border-cyan-500"
                              >
                                <option value="">— بدون حزمة (تحدي حر) —</option>
                                {tracksWithPacks.map((track) => (
                                  <optgroup key={track.id} label={track.title}>
                                    {track.packs.map((pack) => (
                                      <option key={pack.id} value={pack.id}>{pack.title}</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            )}
                          />
                        </div>
                        <div>
                          <label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">الترتيب في الحزمة</label>
                          <input
                            {...register("orderInPack", { valueAsNumber: true })}
                            type="number"
                            min={0}
                            disabled={!watchedPackId}
                            className="w-full px-3 py-2 rounded-lg dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none focus:border-cyan-500 disabled:opacity-40"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">التلميحات (كل تلميح في سطر)</label>
                      <textarea {...register("hints")} rows={3} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 resize-none text-sm" placeholder="تلميح 1&#10;تلميح 2" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">القيود (كل قيد في سطر)</label>
                      <textarea {...register("constraints")} rows={2} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 resize-none text-sm font-mono" placeholder="1 ≤ n ≤ 1000&#10;-10^6 ≤ a[i] ≤ 10^6" />
                    </div>

                    <div>
                      <Controller
                        control={control}
                        name="isPublished"
                        render={({ field }) => (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={field.value} onChange={field.onChange} className="w-4 h-4 accent-cyan-400" />
                            <span className="text-sm dark:text-slate-300 text-slate-700">منشورة (مرئية للمستخدمين)</span>
                          </label>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* TAB: Tags */}
                {activeTab === "tags" && (
                  <div className="space-y-5">
                    {/* Programming Tags */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-semibold dark:text-white text-slate-900">وسوم برمجية</span>
                        <span className="text-xs dark:text-slate-500 text-slate-400">({watchedTags.length} محدد)</span>
                      </div>
                      <p className="text-xs dark:text-slate-400 text-slate-500 mb-3">تساعد المستخدمين في تصفية التحديات حسب المهارة</p>
                      <div className="flex flex-wrap gap-2">
                        {PROBLEM_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${
                              watchedTags.includes(tag)
                                ? "bg-violet-500/20 border border-violet-500/40 text-violet-400"
                                : "dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600 hover:border-violet-500/30"
                            }`}
                          >
                            {watchedTags.includes(tag) && "✓ "}{tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Company Tags */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-semibold dark:text-white text-slate-900">شركات التوظيف</span>
                        <span className="text-xs dark:text-slate-500 text-slate-400">({watchedCompanyTags.length} محدد)</span>
                      </div>
                      <p className="text-xs dark:text-slate-400 text-slate-500 mb-3">تحديات مستوحاة من مقابلات الشركات الكبرى</p>
                      <div className="flex flex-wrap gap-2">
                        {COMPANIES.map((company) => (
                          <button
                            key={company}
                            type="button"
                            onClick={() => toggleCompanyTag(company)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              watchedCompanyTags.includes(company)
                                ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                                : "dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600 hover:border-amber-500/30"
                            }`}
                          >
                            {watchedCompanyTags.includes(company) && "✓ "}{company}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    {(watchedTags.length > 0 || watchedCompanyTags.length > 0) && (
                      <div className="p-3 dark:bg-white/5 bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200">
                        <p className="text-xs font-medium dark:text-slate-300 text-slate-700 mb-2">الوسوم المحددة:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {watchedTags.map((t) => (
                            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-mono">{t}</span>
                          ))}
                          {watchedCompanyTags.map((c) => (
                            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: Test Cases */}
                {activeTab === "testcases" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium dark:text-white text-slate-900">حالات الاختبار</p>
                        <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">أول 3 حالات تظهر للمستخدم، الباقية مخفية (مضادة للـ Hardcoding)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => tcAppend({ input: "", expectedOutput: "" })}
                        className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        إضافة حالة
                      </button>
                    </div>

                    {tcFields.length === 0 && (
                      <div className="text-center py-8 dark:bg-white/5 bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200">
                        <FlaskConical className="w-8 h-8 text-cyan-400/50 mx-auto mb-2" />
                        <p className="text-sm dark:text-slate-400 text-slate-500">لا توجد حالات اختبار بعد</p>
                        <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">بدون حالات اختبار، سيتم قبول أي كود يرسله المستخدم</p>
                      </div>
                    )}

                    {tcFields.map((field, idx) => (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="dark:bg-white/5 bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${idx < 3 ? "text-cyan-400" : "text-amber-400"}`}>
                            حالة اختبار #{idx + 1} {idx >= 3 && "(مخفية)"}
                          </span>
                          <button type="button" onClick={() => tcRemove(idx)} className="text-red-400 hover:text-red-300">
                            <MinusCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">المدخل (stdin)</label>
                          <textarea
                            {...register(`testCases.${idx}.input`)}
                            rows={2}
                            dir="ltr"
                            placeholder="مثال: 5\n1 2 3 4 5"
                            className="w-full px-3 py-2 rounded-lg dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-200 text-slate-800 font-mono text-xs outline-none focus:border-cyan-500 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">الناتج المتوقع *</label>
                          <textarea
                            {...register(`testCases.${idx}.expectedOutput`)}
                            rows={2}
                            dir="ltr"
                            placeholder="مثال: 15"
                            className="w-full px-3 py-2 rounded-lg dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-200 text-slate-800 font-mono text-xs outline-none focus:border-cyan-500 resize-none"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* TAB: Examples */}
                {activeTab === "examples" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium dark:text-white text-slate-900">الأمثلة التوضيحية</p>
                        <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">تُعرض للمستخدم في صفحة المسألة</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => exAppend({ input: "", output: "", explanation: "" })}
                        className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        إضافة مثال
                      </button>
                    </div>

                    {exFields.map((field, idx) => (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="dark:bg-white/5 bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-400">مثال #{idx + 1}</span>
                          <button type="button" onClick={() => exRemove(idx)} className="text-red-400 hover:text-red-300">
                            <MinusCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">المدخل</label>
                            <input {...register(`examples.${idx}.input`)} dir="ltr" className="w-full px-3 py-2 rounded-lg dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-200 text-slate-800 font-mono text-xs outline-none focus:border-cyan-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">المخرج</label>
                            <input {...register(`examples.${idx}.output`)} dir="ltr" className="w-full px-3 py-2 rounded-lg dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-200 text-slate-800 font-mono text-xs outline-none focus:border-cyan-500" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">الشرح (اختياري)</label>
                          <input {...register(`examples.${idx}.explanation`)} className="w-full px-3 py-2 rounded-lg dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-200 text-slate-800 text-xs outline-none focus:border-cyan-500" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* TAB: Solution & Code */}
                {activeTab === "solution" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">الكود الابتدائي (يظهر في المحرر)</label>
                      <textarea {...register("starterCode")} rows={6} dir="ltr" className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 resize-y font-mono text-xs" placeholder="def solution():&#10;    pass&#10;&#10;print(solution())" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">
                        الحل النموذجي
                        <span className="mr-2 text-xs dark:text-slate-500 text-slate-400">(لأغراض المراجعة فقط، لا يُعرض للمستخدمين)</span>
                      </label>
                      <textarea {...register("solution")} rows={8} dir="ltr" className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 resize-y font-mono text-xs" placeholder="# الحل النموذجي" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 p-5 border-t dark:border-white/10 border-slate-100">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center py-2.5">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSubmitting ? "جاري الحفظ..." : "حفظ المسألة"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center py-2.5">
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
    </AdminSectionGuard>
  );
}
