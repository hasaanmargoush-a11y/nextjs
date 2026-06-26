"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { api, type ApiError, type Course } from "@/lib/api";
import { toast } from "sonner";
import {
  Save, Loader2, Upload, Image as ImageIcon, Plus, X,
  Globe, Lock, Link, Search, Tag, BookOpen, AlertCircle
} from "lucide-react";

interface Props {
  courseId: number;
  course: Course;
  onSaved: (updated: Course) => void;
}

type ArrayField = "requirements" | "whatYouLearn" | "objectives" | "courseContents";
type FieldErrors = Record<string, string>;

const FIELD_LABELS: Record<string, string> = {
  title: "عنوان الكورس",
  description: "وصف الكورس",
  instructor: "اسم المدرب",
  category: "التصنيف",
  level: "المستوى",
  duration: "المدة",
  price: "السعر",
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
  );
}

function TagList({ label, description, items, onChange }: {
  label: string; description: string;
  items: string[]; onChange: (items: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setInput("");
  };
  return (
    <div>
      <label className="block text-sm font-semibold dark:text-slate-300 text-slate-700 mb-0.5">{label}</label>
      <p className="text-xs dark:text-slate-500 text-slate-400 mb-2">{description}</p>
      <div className="flex gap-2 mb-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="اكتب ثم اضغط Enter أو أضف"
          className="flex-1 input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm py-2" />
        <button onClick={add} type="button" className="w-9 h-9 rounded-xl bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors flex-shrink-0">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 dark:bg-white/5 bg-slate-50 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm dark:text-slate-300 text-slate-700">{item}</span>
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-500 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CourseInfoTab({ courseId, course, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    title: course.title ?? "",
    description: course.description ?? "",
    instructor: course.instructor ?? "",
    category: course.category ?? "",
    level: course.level ?? "beginner",
    duration: course.duration ?? "0 ساعة",
    isPaid: course.isPaid ?? false,
    price: course.price ?? null as number | null,
    thumbnail: course.thumbnail ?? null as string | null,
    isPublished: course.isPublished ?? false,
    isFeatured: course.isFeatured ?? false,
    visibility: course.visibility ?? "public",
    slug: course.slug ?? "",
    metaTitle: course.metaTitle ?? "",
    metaDescription: course.metaDescription ?? "",
    requirements: course.requirements ?? [] as string[],
    whatYouLearn: course.whatYouLearn ?? [] as string[],
    objectives: course.objectives ?? [] as string[],
    courseContents: course.courseContents ?? [] as string[],
  });
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(course.thumbnail ?? null);

  useEffect(() => {
    setForm({
      title: course.title ?? "",
      description: course.description ?? "",
      instructor: course.instructor ?? "",
      category: course.category ?? "",
      level: course.level ?? "beginner",
      duration: course.duration ?? "0 ساعة",
      isPaid: course.isPaid ?? false,
      price: course.price ?? null,
      thumbnail: course.thumbnail ?? null,
      isPublished: course.isPublished ?? false,
      isFeatured: course.isFeatured ?? false,
      visibility: course.visibility ?? "public",
      slug: course.slug ?? "",
      metaTitle: course.metaTitle ?? "",
      metaDescription: course.metaDescription ?? "",
      requirements: course.requirements ?? [],
      whatYouLearn: course.whatYouLearn ?? [],
      objectives: course.objectives ?? [],
      courseContents: course.courseContents ?? [],
    });
    setThumbnailPreview(course.thumbnail ?? null);
    setFieldErrors({});
  }, [course]);

  const set = (key: string, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
  };
  const setArr = (field: ArrayField, items: string[]) => setForm(f => ({ ...f, [field]: items }));

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!form.title.trim()) errs.title = "عنوان الكورس مطلوب";
    if (!form.description.trim()) errs.description = "وصف الكورس مطلوب";
    if (!form.instructor.trim()) errs.instructor = "اسم المدرب مطلوب";
    if (form.isPaid && (form.price === null || form.price === undefined || form.price < 0))
      errs.price = "السعر مطلوب للكورسات المدفوعة";
    return errs;
  };

  const handleThumbnailSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("يرجى اختيار ملف صورة"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 10MB"); return; }
    const preview = URL.createObjectURL(file);
    setThumbnailPreview(preview);
    setThumbnailUploading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/admin/courses/upload-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("فشل رفع الصورة");
      const { url } = await res.json();
      set("thumbnail", url);
      toast.success("تم رفع الصورة");
    } catch {
      toast.error("فشل رفع الصورة");
      setThumbnailPreview(form.thumbnail);
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      const firstField = Object.values(errs)[0];
      toast.error(firstField, { description: "يرجى تصحيح الحقول المحددة بالأحمر" });
      return;
    }
    setSaving(true);
    setFieldErrors({});
    try {
      const payload = {
        ...form,
        price: form.isPaid ? form.price : null,
        slug: form.slug.trim() || null,
        metaTitle: form.metaTitle.trim() || null,
        metaDescription: form.metaDescription.trim() || null,
      };
      const updated = await api.patch<Course>(`/admin/courses/${courseId}`, payload);
      onSaved(updated);
      toast.success("تم حفظ معلومات الكورس");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.fieldErrors && Object.keys(apiErr.fieldErrors).length > 0) {
        const mapped: FieldErrors = {};
        for (const [field, msgs] of Object.entries(apiErr.fieldErrors)) {
          const label = FIELD_LABELS[field] ?? field;
          mapped[field] = `${label}: ${(msgs as string[]).join("، ")}`;
        }
        setFieldErrors(mapped);
        toast.error("يوجد أخطاء في البيانات المدخلة", {
          description: "يرجى مراجعة الحقول المحددة بالأحمر"
        });
      } else {
        toast.error(apiErr.message || "حدث خطأ أثناء الحفظ");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (field?: string) =>
    `input-field dark:bg-white/5 bg-slate-50 border dark:text-white text-slate-900 w-full text-sm transition-colors ${
      field && fieldErrors[field]
        ? "border-red-500 focus:border-red-400 dark:border-red-500"
        : "dark:border-white/10 border-slate-200"
    }`;
  const labelCls = "block text-sm font-semibold dark:text-slate-300 text-slate-700 mb-1.5";
  const sectionCls = "dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 space-y-4";

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="space-y-5">
      {hasErrors && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">يوجد حقول مطلوبة غير مكتملة</p>
            <ul className="mt-1 space-y-0.5">
              {Object.values(fieldErrors).map((msg, i) => (
                <li key={i} className="text-xs opacity-90">• {msg}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* Basic Info */}
      <div className={sectionCls}>
        <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2 text-base pb-1 border-b dark:border-white/5 border-slate-100">
          <BookOpen className="w-4 h-4 text-cyan-400" />المعلومات الأساسية
        </h3>
        <div>
          <label className={labelCls}>عنوان الكورس <span className="text-red-400">*</span></label>
          <input value={form.title} onChange={e => set("title", e.target.value)}
            className={inputCls("title")} placeholder="مثال: كورس Python الشامل من الصفر للاحتراف" />
          <FieldError msg={fieldErrors.title} />
        </div>
        <div>
          <label className={labelCls}>وصف الكورس <span className="text-red-400">*</span></label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            rows={4} className={`${inputCls("description")} resize-none`}
            placeholder="وصف مفصّل للكورس يوضح ما سيتعلمه الطالب..." />
          <FieldError msg={fieldErrors.description} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>اسم المدرب <span className="text-red-400">*</span></label>
            <input value={form.instructor} onChange={e => set("instructor", e.target.value)}
              className={inputCls("instructor")} placeholder="أ. محمد أحمد" />
            <FieldError msg={fieldErrors.instructor} />
          </div>
          <div>
            <label className={labelCls}>المدة الإجمالية</label>
            <input value={form.duration} onChange={e => set("duration", e.target.value)}
              className={inputCls()} placeholder="12 ساعة" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>التصنيف</label>
            <input value={form.category} onChange={e => set("category", e.target.value)}
              className={inputCls()} placeholder="Python, JavaScript..." />
          </div>
          <div>
            <label className={labelCls}>المستوى</label>
            <select value={form.level} onChange={e => set("level", e.target.value)} className={inputCls()}>
              <option value="beginner" className="dark:bg-[#111827]">مبتدئ</option>
              <option value="intermediate" className="dark:bg-[#111827]">متوسط</option>
              <option value="advanced" className="dark:bg-[#111827]">متقدم</option>
              <option value="expert" className="dark:bg-[#111827]">خبير</option>
            </select>
          </div>
        </div>
      </div>

      {/* Thumbnail */}
      <div className={sectionCls}>
        <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2 text-base pb-1 border-b dark:border-white/5 border-slate-100">
          <ImageIcon className="w-4 h-4 text-cyan-400" />صورة الكورس
        </h3>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleThumbnailSelect(e.target.files[0])} />
        <div onClick={() => fileInputRef.current?.click()} style={{ minHeight: 100 }}
          className="cursor-pointer border-2 border-dashed dark:border-white/10 border-slate-200 rounded-xl overflow-hidden hover:border-cyan-500 transition-colors relative">
          {thumbnailUploading ? (
            <div className="flex items-center justify-center gap-2 dark:text-slate-400 text-slate-500 text-sm py-8">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />جاري رفع الصورة...
            </div>
          ) : thumbnailPreview ? (
            <div className="relative">
              <img src={thumbnailPreview} alt="preview" className="w-full h-36 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-sm flex items-center gap-2"><Upload className="w-4 h-4" />تغيير الصورة</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 dark:text-slate-400 text-slate-500 text-sm py-8">
              <ImageIcon className="w-7 h-7" />
              <span className="font-medium">اضغط لاختيار صورة من جهازك</span>
              <span className="text-xs opacity-60">PNG, JPG, WebP · حتى 5MB · موصى به: 1280×720</span>
            </div>
          )}
        </div>
        {form.thumbnail && (
          <p className="text-xs dark:text-slate-500 text-slate-400 break-all" dir="ltr">{form.thumbnail}</p>
        )}
      </div>

      {/* Pricing & Visibility */}
      <div className={sectionCls}>
        <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2 text-base pb-1 border-b dark:border-white/5 border-slate-100">
          <Globe className="w-4 h-4 text-cyan-400" />التسعير والظهور
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "public", label: "عام", desc: "يظهر للجميع", icon: Globe },
            { value: "unlisted", label: "غير مدرج", desc: "فقط بالرابط", icon: Link },
            { value: "private", label: "خاص", desc: "غير مرئي", icon: Lock },
          ].map(({ value, label, desc, icon: Icon }) => (
            <button key={value} type="button" onClick={() => set("visibility", value)}
              className={`p-3 rounded-xl border text-center transition-all ${form.visibility === value ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500"}`}>
              <Icon className="w-4 h-4 mx-auto mb-1" />
              <p className="text-xs font-semibold">{label}</p>
              <p className="text-xs opacity-70">{desc}</p>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPublished} onChange={e => set("isPublished", e.target.checked)} className="w-4 h-4 accent-cyan-400" />
            <span className="text-sm dark:text-slate-300 text-slate-700">منشور (يظهر في القائمة)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isFeatured} onChange={e => set("isFeatured", e.target.checked)} className="w-4 h-4 accent-cyan-400" />
            <span className="text-sm dark:text-slate-300 text-slate-700">مميز (يظهر في الصفحة الرئيسية)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPaid} onChange={e => set("isPaid", e.target.checked)} className="w-4 h-4 accent-amber-400" />
            <span className="text-sm dark:text-slate-300 text-slate-700">كورس مدفوع</span>
          </label>
        </div>
        {form.isPaid && (
          <div>
            <label className={labelCls}>السعر (ج.م) <span className="text-red-400">*</span></label>
            <input type="number" min={0} value={form.price ?? ""}
              onChange={e => set("price", e.target.value ? Number(e.target.value) : null)}
              className={`${inputCls("price")} max-w-xs`} placeholder="99" />
            <FieldError msg={fieldErrors.price} />
          </div>
        )}
      </div>

      {/* SEO */}
      <div className={sectionCls}>
        <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2 text-base pb-1 border-b dark:border-white/5 border-slate-100">
          <Search className="w-4 h-4 text-cyan-400" />إعدادات SEO (محركات البحث)
        </h3>
        <div>
          <label className={labelCls}>Slug (رابط الكورس)</label>
          <div className="flex items-center gap-2 dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 rounded-xl px-3">
            <span className="text-xs dark:text-slate-500 text-slate-400 py-2.5 flex-shrink-0">/courses/</span>
            <input value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
              dir="ltr" className="flex-1 bg-transparent outline-none dark:text-white text-slate-900 py-2.5 text-sm"
              placeholder="python-for-beginners" />
          </div>
          <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">اتركه فارغاً لاستخدام رقم الكورس</p>
        </div>
        <div>
          <label className={labelCls}>عنوان SEO (Meta Title)</label>
          <input value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)} className={inputCls()}
            placeholder="كورس Python الشامل | نوفيل للتعليم" />
          <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">{form.metaTitle.length}/60 حرف موصى به</p>
        </div>
        <div>
          <label className={labelCls}>وصف SEO (Meta Description)</label>
          <textarea value={form.metaDescription} onChange={e => set("metaDescription", e.target.value)} rows={2}
            className={`${inputCls()} resize-none`} placeholder="تعلم Python من الصفر حتى الاحتراف مع أكثر من 100 درس عملي..." />
          <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">{form.metaDescription.length}/160 حرف موصى به</p>
        </div>
      </div>

      {/* Student Info */}
      <div className={sectionCls}>
        <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2 text-base pb-1 border-b dark:border-white/5 border-slate-100">
          <Tag className="w-4 h-4 text-cyan-400" />معلومات للطالب
        </h3>
        <TagList
          label="متطلبات الكورس"
          description="ما الذي يجب أن يعرفه الطالب قبل بدء الكورس؟"
          items={form.requirements}
          onChange={items => setArr("requirements", items)}
        />
        <TagList
          label="أهداف الكورس"
          description="ما الذي سيحققه الطالب بعد إتمام الكورس؟"
          items={form.objectives}
          onChange={items => setArr("objectives", items)}
        />
        <TagList
          label="ما الذي ستتعلمه"
          description="المهارات والمعارف المحددة التي ستكتسبها"
          items={form.whatYouLearn}
          onChange={items => setArr("whatYouLearn", items)}
        />
        <TagList
          label="محتويات الكورس (نظرة عامة)"
          description="قائمة المواضيع الرئيسية التي يغطيها الكورس"
          items={form.courseContents}
          onChange={items => setArr("courseContents", items)}
        />
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        {hasErrors && (
          <p className="text-sm text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            يرجى تصحيح الأخطاء قبل الحفظ
          </p>
        )}
        <button onClick={handleSave} disabled={saving || thumbnailUploading}
          className="btn-primary py-3 px-8 text-base mr-auto disabled:opacity-60">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </div>
    </div>
  );
}
