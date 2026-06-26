"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { api, type Course } from "@/lib/api";
import { toast } from "sonner";
import {
  Save, Loader2, DollarSign, Globe, Lock, Users, Eye, EyeOff,
  Shield, CreditCard, TestTube, Check, Settings, AlertCircle
} from "lucide-react";

interface Props {
  courseId: number;
  course: Course;
  onSaved: (updated: Course) => void;
}

const inputCls = "input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm w-full";

export default function SettingsTab({ courseId, course, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  const [isPaid, setIsPaid] = useState(course.isPaid ?? false);
  const [price, setPrice] = useState(String(course.price ?? ""));
  const [visibility, setVisibility] = useState(course.visibility ?? "public");
  const [isPublished, setIsPublished] = useState(course.isPublished ?? true);
  const [isFeatured, setIsFeatured] = useState(course.isFeatured ?? false);
  const [requireEnrollment, setRequireEnrollment] = useState(
    (course as Course & { requireEnrollment?: boolean }).requireEnrollment ?? true
  );
  const [enrollmentLimit, setEnrollmentLimit] = useState(
    String((course as Course & { enrollmentLimit?: number }).enrollmentLimit ?? "")
  );
  const [paymentProvider, setPaymentProvider] = useState(
    (course as Course & { paymentProvider?: string }).paymentProvider ?? "stripe"
  );
  const [stripePriceId, setStripePriceId] = useState(
    (course as Course & { stripePriceId?: string }).stripePriceId ?? ""
  );
  const [sandboxMode, setSandboxMode] = useState(true);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<Course>(`/admin/courses/${courseId}`, {
        isPaid,
        price: isPaid && price ? parseFloat(price) : null,
        visibility,
        isPublished,
        isFeatured,
        requireEnrollment,
        enrollmentLimit: enrollmentLimit ? parseInt(enrollmentLimit) : null,
        paymentProvider: isPaid ? paymentProvider : null,
        stripePriceId: isPaid && paymentProvider === "stripe" ? stripePriceId : null,
      });
      onSaved(updated);
      toast.success("تم حفظ الإعدادات");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Pricing */}
      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-bold dark:text-white text-slate-900">إعدادات التسعير</h2>
            <p className="text-xs dark:text-slate-400 text-slate-500">حدد هل الكورس مجاني أم مدفوع</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button onClick={() => setIsPaid(false)}
            className={`p-4 rounded-xl border-2 transition-all text-right ${!isPaid ? "border-emerald-500 bg-emerald-500/10" : "dark:border-white/10 border-slate-200 dark:hover:border-white/20 hover:border-slate-300"}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${!isPaid ? "border-emerald-500 bg-emerald-500" : "dark:border-white/30 border-slate-300"}`}>
                {!isPaid && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="font-bold dark:text-white text-slate-900">مجاني</span>
            </div>
            <p className="text-xs dark:text-slate-400 text-slate-500">الكورس متاح للجميع مجاناً</p>
          </button>
          <button onClick={() => setIsPaid(true)}
            className={`p-4 rounded-xl border-2 transition-all text-right ${isPaid ? "border-cyan-500 bg-cyan-500/10" : "dark:border-white/10 border-slate-200 dark:hover:border-white/20 hover:border-slate-300"}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isPaid ? "border-cyan-500 bg-cyan-500" : "dark:border-white/30 border-slate-300"}`}>
                {isPaid && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="font-bold dark:text-white text-slate-900">مدفوع</span>
            </div>
            <p className="text-xs dark:text-slate-400 text-slate-500">يتطلب دفع قبل الوصول</p>
          </button>
        </div>

        {isPaid && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div>
              <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">السعر (USD)</label>
              <div className="relative">
                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-500" />
                <input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)}
                  className={`${inputCls} pr-9`} placeholder="مثال: 49.99" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Payment Gateway */}
      {isPaid && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold dark:text-white text-slate-900">بوابة الدفع</h2>
              <p className="text-xs dark:text-slate-400 text-slate-500">اختر طريقة استقبال المدفوعات</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { id: "stripe", name: "Stripe", desc: "بطاقات ائتمان دولية", color: "violet" },
              { id: "paymob", name: "Paymob", desc: "بطاقات وفودافون مصر", color: "blue" },
            ].map(p => (
              <button key={p.id} onClick={() => setPaymentProvider(p.id)}
                className={`p-4 rounded-xl border-2 transition-all text-right ${paymentProvider === p.id ? `border-${p.color}-500 bg-${p.color}-500/10` : "dark:border-white/10 border-slate-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentProvider === p.id ? `border-${p.color}-500 bg-${p.color}-500` : "dark:border-white/30 border-slate-300"}`}>
                    {paymentProvider === p.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="font-bold dark:text-white text-slate-900 text-sm">{p.name}</span>
                </div>
                <p className="text-xs dark:text-slate-400 text-slate-500 mr-7">{p.desc}</p>
              </button>
            ))}
          </div>

          {/* Sandbox Mode Toggle */}
          <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 ${sandboxMode ? "dark:bg-amber-500/10 bg-amber-50 dark:border dark:border-amber-500/20 border-amber-100" : "dark:bg-emerald-500/10 bg-emerald-50 dark:border dark:border-emerald-500/20 border-emerald-100"}`}>
            <TestTube className={`w-5 h-5 flex-shrink-0 ${sandboxMode ? "text-amber-400" : "text-emerald-400"}`} />
            <div className="flex-1">
              <p className="text-sm font-medium dark:text-white text-slate-900">{sandboxMode ? "وضع الاختبار (Sandbox)" : "وضع الإنتاج (Live)"}</p>
              <p className="text-xs dark:text-slate-400 text-slate-500">{sandboxMode ? "المدفوعات وهمية - للاختبار فقط" : "مدفوعات حقيقية"}</p>
            </div>
            <button onClick={() => setSandboxMode(!sandboxMode)}
              className={`relative w-12 h-6 rounded-full transition-colors ${sandboxMode ? "bg-amber-400" : "bg-emerald-400"}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${sandboxMode ? "right-1" : "left-1"}`} />
            </button>
          </div>

          {paymentProvider === "stripe" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">
                  Stripe Price ID {sandboxMode && <span className="text-xs text-amber-400">(Sandbox)</span>}
                </label>
                <input value={stripePriceId} onChange={e => setStripePriceId(e.target.value)}
                  className={`${inputCls} font-mono`} placeholder="price_xxxxxxxxxxxx" dir="ltr" />
                <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
                  من لوحة Stripe → Products → Prices
                </p>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl dark:bg-blue-500/10 bg-blue-50 dark:border dark:border-blue-500/20 border-blue-100">
                <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs dark:text-slate-300 text-slate-600">
                  <p className="font-medium mb-1">للتشغيل الكامل تحتاج:</p>
                  <ul className="space-y-0.5 dark:text-slate-400 text-slate-500 list-disc mr-3">
                    <li>إضافة <code className="bg-black/10 dark:bg-white/10 px-1 rounded">STRIPE_SECRET_KEY</code> كـ env variable</li>
                    <li>إضافة <code className="bg-black/10 dark:bg-white/10 px-1 rounded">STRIPE_WEBHOOK_SECRET</code> للـ webhook</li>
                    <li>استخدام Stripe CLI لاختبار الـ webhooks</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {paymentProvider === "paymob" && (
            <div className="flex items-start gap-2 p-3 rounded-xl dark:bg-blue-500/10 bg-blue-50 dark:border dark:border-blue-500/20 border-blue-100">
              <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs dark:text-slate-300 text-slate-600">
                <p className="font-medium mb-1">للتشغيل الكامل مع Paymob تحتاج:</p>
                <ul className="space-y-0.5 dark:text-slate-400 text-slate-500 list-disc mr-3">
                  <li>إضافة <code className="bg-black/10 dark:bg-white/10 px-1 rounded">PAYMOB_API_KEY</code> كـ env variable</li>
                  <li>إنشاء Integration في لوحة Paymob</li>
                  <li>ضبط الـ Callback URL في Paymob</li>
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Visibility & Access */}
      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="font-bold dark:text-white text-slate-900">الظهور والوصول</h2>
            <p className="text-xs dark:text-slate-400 text-slate-500">من يمكنه رؤية هذا الكورس</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm dark:text-slate-300 text-slate-700 mb-2">مستوى الوصول</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "public", label: "عام", icon: Globe, desc: "مرئي للجميع" },
                { id: "unlisted", label: "غير مدرج", icon: EyeOff, desc: "بالرابط فقط" },
                { id: "private", label: "خاص", icon: Lock, desc: "مخفي تماماً" },
              ].map(v => (
                <button key={v.id} onClick={() => setVisibility(v.id)}
                  className={`p-3 rounded-xl border transition-all text-center ${visibility === v.id ? "border-cyan-500 bg-cyan-500/10" : "dark:border-white/10 border-slate-200"}`}>
                  <v.icon className={`w-5 h-5 mx-auto mb-1 ${visibility === v.id ? "text-cyan-400" : "dark:text-slate-400 text-slate-500"}`} />
                  <p className={`text-xs font-medium ${visibility === v.id ? "text-cyan-400" : "dark:text-slate-300 text-slate-700"}`}>{v.label}</p>
                  <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl dark:bg-white/5 bg-slate-50 cursor-pointer hover:dark:bg-white/8 transition-colors">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 dark:text-slate-400 text-slate-500" />
                <div>
                  <p className="text-sm dark:text-slate-300 text-slate-700">منشور</p>
                  <p className="text-xs dark:text-slate-500 text-slate-400">الكورس مرئي في القائمة</p>
                </div>
              </div>
              <button onClick={() => setIsPublished(!isPublished)}
                className={`relative w-10 h-5 rounded-full transition-colors ${isPublished ? "bg-cyan-400" : "dark:bg-white/20 bg-slate-300"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isPublished ? "left-5" : "left-0.5"}`} />
              </button>
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl dark:bg-white/5 bg-slate-50 cursor-pointer hover:dark:bg-white/8 transition-colors">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 dark:text-slate-400 text-slate-500" />
                <div>
                  <p className="text-sm dark:text-slate-300 text-slate-700">مميز (Featured)</p>
                  <p className="text-xs dark:text-slate-500 text-slate-400">يظهر في الكورسات المميزة</p>
                </div>
              </div>
              <button onClick={() => setIsFeatured(!isFeatured)}
                className={`relative w-10 h-5 rounded-full transition-colors ${isFeatured ? "bg-amber-400" : "dark:bg-white/20 bg-slate-300"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isFeatured ? "left-5" : "left-0.5"}`} />
              </button>
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl dark:bg-white/5 bg-slate-50 cursor-pointer hover:dark:bg-white/8 transition-colors">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 dark:text-slate-400 text-slate-500" />
                <div>
                  <p className="text-sm dark:text-slate-300 text-slate-700">يتطلب تسجيل</p>
                  <p className="text-xs dark:text-slate-500 text-slate-400">المستخدم يجب يسجّل قبل الوصول</p>
                </div>
              </div>
              <button onClick={() => setRequireEnrollment(!requireEnrollment)}
                className={`relative w-10 h-5 rounded-full transition-colors ${requireEnrollment ? "bg-cyan-400" : "dark:bg-white/20 bg-slate-300"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${requireEnrollment ? "left-5" : "left-0.5"}`} />
              </button>
            </label>
          </div>

          <div>
            <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">حد أقصى للطلاب (اتركه فارغاً للا نهاية)</label>
            <div className="relative">
              <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-500" />
              <input type="number" min={0} value={enrollmentLimit} onChange={e => setEnrollmentLimit(e.target.value)}
                className={`${inputCls} pr-9`} placeholder="مثال: 100" />
            </div>
          </div>
        </div>
      </div>

      {/* Video Protection Info */}
      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="font-bold dark:text-white text-slate-900">حماية المحتوى</h2>
            <p className="text-xs dark:text-slate-400 text-slate-500">كيف تتم حماية فيديوهات الكورس</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { icon: "lock", title: "روابط مؤقتة", desc: "روابط الفيديو تنتهي صلاحيتها بعد وقت قصير ولا يمكن مشاركتها" },
            { icon: "shield", title: "فحص الاشتراك", desc: "كل طلب لمقطع فيديو يتحقق من اشتراك المستخدم في الوقت الفعلي" },
            { icon: "block", title: "منع الوصول المباشر", desc: "روابط API للفيديو محمية بـ Bearer Token ولا يمكن الوصول إليها بدون تسجيل دخول" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl dark:bg-white/5 bg-slate-50">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm font-medium dark:text-white text-slate-900">{item.title}</p>
                <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button onClick={saveSettings} disabled={saving}
        className="w-full btn-primary justify-center py-3 text-base">
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        حفظ الإعدادات
      </button>
    </div>
  );
}
