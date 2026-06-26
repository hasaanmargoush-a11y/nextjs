"use client";

import { useState, useRef, useCallback } from "react";
import {
  Database, Download, Upload, Package, Shield, AlertTriangle,
  CheckCircle, X, Loader2, HardDrive, RefreshCw, Lock, Zap,
  FileArchive, CloudDownload, ServerCrash,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const API = (p: string) => `/api${p}`;

function getHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({
  open, onClose, onConfirm, loading, title, body, confirmLabel, danger,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  loading?: boolean; title: string; body: React.ReactNode;
  confirmLabel: string; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl dark:bg-[#0d1220] bg-white border dark:border-white/10 border-slate-200 shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              danger ? "bg-red-500/20" : "bg-amber-500/20")}>
              <AlertTriangle className={cn("w-5 h-5", danger ? "text-red-400" : "text-amber-400")} />
            </div>
            <h2 className="font-bold dark:text-white text-slate-900 text-lg">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 dark:text-slate-400 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm dark:text-slate-300 text-slate-600 leading-relaxed">{body}</div>
        <div className="flex gap-3 pt-1">
          <button onClick={onConfirm} disabled={loading}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50",
              danger
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"
            )}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "جاري التنفيذ..." : confirmLabel}
          </button>
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2.5 rounded-xl dark:bg-white/5 bg-slate-100 text-sm dark:text-slate-300 text-slate-600 disabled:opacity-50">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Toast ────────────────────────────────────────────────────────────────
function StatusBanner({ status }: { status: { type: "success" | "error"; msg: string } | null }) {
  if (!status) return null;
  return (
    <div className={cn(
      "rounded-xl border px-4 py-3 flex items-center gap-3 text-sm font-medium",
      status.type === "success"
        ? "dark:bg-green-500/10 bg-green-50 border-green-500/30 text-green-600 dark:text-green-400"
        : "dark:bg-red-500/10 bg-red-50 border-red-500/30 text-red-600 dark:text-red-400"
    )}>
      {status.type === "success"
        ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
        : <ServerCrash className="w-4 h-4 flex-shrink-0" />}
      {status.msg}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SuperSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // DB Download
  const [dbDownloading, setDbDownloading] = useState(false);

  // DB Restore
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Codebase ZIP
  const [zipDownloading, setZipDownloading] = useState(false);

  // Shared status
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showStatus = useCallback((type: "success" | "error", msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 6000);
  }, []);

  // Auth guard — redirect non-super-admin
  useEffect(() => {
    if (!loading && (!user || user.role !== "super_admin")) {
      router.replace("/admin");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Lock className="w-12 h-12 mx-auto dark:text-slate-600 text-slate-300" />
          <p className="dark:text-slate-400 text-slate-500">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const downloadDB = async () => {
    setDbDownloading(true);
    try {
      const res = await fetch(API("/admin/backup/db"), { headers: getHeaders() });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "فشل الاتصال" }));
        showStatus("error", d.error ?? "فشل تحميل قاعدة البيانات");
        return;
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") ?? "";
      const match = disp.match(/filename="([^"]+)"/);
      const fname = match?.[1] ?? `nouvil-backup-${new Date().toISOString().slice(0,10)}.sql`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
      showStatus("success", `✅ تم تحميل ${fname} بنجاح`);
    } catch (e) {
      showStatus("error", "حدث خطأ غير متوقع: " + String(e));
    } finally {
      setDbDownloading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.toLowerCase().endsWith(".sql")) setRestoreFile(f);
    else showStatus("error", "فقط ملفات .sql مسموح بها");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setRestoreFile(f);
  };

  const doRestore = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    setRestoreConfirm(false);
    try {
      const form = new FormData();
      form.append("sqlFile", restoreFile);
      const res = await fetch(API("/admin/backup/restore"), {
        method: "POST",
        headers: getHeaders(),
        body: form,
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        showStatus("success", d.message ?? "✅ تمت الاستعادة بنجاح");
        setRestoreFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        showStatus("error", d.error ?? "فشلت الاستعادة");
      }
    } catch (e) {
      showStatus("error", "حدث خطأ غير متوقع: " + String(e));
    } finally {
      setRestoring(false);
    }
  };

  const downloadCodebase = async () => {
    setZipDownloading(true);
    try {
      const res = await fetch(API("/admin/backup/codebase"), { headers: getHeaders() });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "فشل الاتصال" }));
        showStatus("error", d.error ?? "فشل تحميل الكود");
        return;
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") ?? "";
      const match = disp.match(/filename="([^"]+)"/);
      const fname = match?.[1] ?? `nouvil-codebase-${new Date().toISOString().slice(0,10)}.tar.gz`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
      showStatus("success", `✅ تم تحميل ${fname} بنجاح — قد يستغرق الأمر دقيقة للملفات الكبيرة`);
    } catch (e) {
      showStatus("error", "حدث خطأ غير متوقع: " + String(e));
    } finally {
      setZipDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
          <Lock className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black dark:text-white text-slate-900">لوحة التحكم الرئيسية</h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Shield className="w-3 h-3" /> سوبر أدمن فقط
            </span>
          </div>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-0.5">
            نسخ احتياطية لقاعدة البيانات والكود المصدري — الوصول محظور على باقي الأدمن
          </p>
        </div>
      </div>

      {/* Status Banner */}
      <StatusBanner status={status} />

      {/* ── Card 1: DB Backup ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border dark:border-white/8 border-slate-200 dark:bg-[#0d1220] bg-white overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Database className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
                  📥 تحميل النسخة الاحتياطية للبيانات
                  <span className="text-[11px] font-normal bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">.SQL</span>
                </h2>
                <p className="text-sm dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
                  يُنشئ ملف <span className="font-mono text-blue-400">.sql</span> كامل لقاعدة البيانات باستخدام <span className="font-mono">pg_dump</span> ويُحمّله مباشرة على جهازك. يشمل كل الجداول والبيانات.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t dark:border-white/8 border-slate-100 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 text-xs dark:text-slate-500 text-slate-400">
              <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> PostgreSQL 16</span>
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-green-400" /> بث مباشر</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> بدون بيانات حساسة في الاسم</span>
            </div>
            <button
              onClick={downloadDB}
              disabled={dbDownloading}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-wait shadow-lg shadow-blue-500/20"
            >
              {dbDownloading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...</>
                : <><CloudDownload className="w-4 h-4" /> تحميل قاعدة البيانات</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Card 2: DB Restore ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border dark:border-orange-500/20 border-orange-200 dark:bg-[#0d1220] bg-white overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
              <Upload className="w-7 h-7 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
                📤 رفع واستعادة قاعدة البيانات
                <span className="text-[11px] font-normal bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">خطر</span>
              </h2>
              <p className="text-sm dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
                ارفع ملف <span className="font-mono text-orange-400">.sql</span> من نسخة احتياطية سابقة وسيتم تشغيله عبر <span className="font-mono">psql</span> على قاعدة البيانات الحالية.
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-4 rounded-xl dark:bg-red-500/8 bg-red-50 border dark:border-red-500/20 border-red-200 p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs dark:text-red-300 text-red-700 leading-relaxed">
              <strong>تحذير مهم:</strong> هذه العملية ستُعدّل قاعدة البيانات الحالية مباشرة. إذا كان الملف يحتوي على <code>DROP TABLE</code> أو <code>TRUNCATE</code> فسيتم حذف البيانات القديمة. تأكد من تحميل نسخة احتياطية حديثة قبل المتابعة.
            </p>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
              dragOver
                ? "dark:border-orange-400 border-orange-400 dark:bg-orange-500/10 bg-orange-50"
                : restoreFile
                ? "dark:border-green-500/50 border-green-400 dark:bg-green-500/5 bg-green-50"
                : "dark:border-white/15 border-slate-300 dark:hover:border-orange-500/40 hover:border-orange-400 dark:hover:bg-white/3 hover:bg-slate-50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql"
              className="hidden"
              onChange={handleFileChange}
            />
            {restoreFile ? (
              <div className="space-y-2">
                <CheckCircle className="w-10 h-10 mx-auto text-green-400" />
                <p className="font-semibold dark:text-green-300 text-green-700">{restoreFile.name}</p>
                <p className="text-xs dark:text-slate-400 text-slate-500">
                  {(restoreFile.size / 1024 / 1024).toFixed(2)} MB — اضغط لاختيار ملف مختلف
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto dark:text-slate-500 text-slate-400" />
                <p className="font-medium dark:text-slate-300 text-slate-600">اسحب ملف .sql هنا أو اضغط للاختيار</p>
                <p className="text-xs dark:text-slate-500 text-slate-400">الحجم الأقصى: 200 MB</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => { if (restoreFile) setRestoreConfirm(true); }}
              disabled={!restoreFile || restoring}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
            >
              {restoring
                ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الاستعادة...</>
                : <><RefreshCw className="w-4 h-4" /> بدء الاستعادة</>}
            </button>
            {restoreFile && !restoring && (
              <button
                onClick={() => { setRestoreFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="px-4 py-3 rounded-xl dark:bg-white/5 bg-slate-100 text-sm dark:text-slate-300 text-slate-600 transition-colors hover:dark:bg-white/10"
              >
                إلغاء الاختيار
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Card 3: Codebase ZIP ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border dark:border-white/8 border-slate-200 dark:bg-[#0d1220] bg-white overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Package className="w-7 h-7 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
                  📦 تحميل ملفات المنصة كاملة
                  <span className="text-[11px] font-normal bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20">.TAR.GZ</span>
                </h2>
                <p className="text-sm dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
                  يُضغط الكود المصدري الكامل (فرونت اند + باك اند) في ملف <span className="font-mono text-violet-400">.tar.gz</span> جاهز للرفع على أي استضافة.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl dark:bg-violet-500/5 bg-violet-50 border dark:border-violet-500/15 border-violet-200 p-4">
            <p className="text-xs dark:text-violet-300 text-violet-700 leading-relaxed">
              <strong>مستبعد تلقائياً:</strong>{" "}
              <code>node_modules</code> · <code>.next</code> · <code>dist</code> · <code>.env</code> · <code>.git</code> · <code>*.tsbuildinfo</code>
              <br />
              <span className="dark:text-violet-400/70 text-violet-600">الملفات الكبيرة قد تستغرق بضع دقائق للضغط — لا تغلق الصفحة.</span>
            </p>
          </div>

          <div className="mt-5 pt-5 border-t dark:border-white/8 border-slate-100 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 text-xs dark:text-slate-500 text-slate-400">
              <span className="flex items-center gap-1.5"><FileArchive className="w-3.5 h-3.5" /> ZIP مستوى ضغط 6</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> بدون ملفات .env</span>
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-green-400" /> بث مباشر</span>
            </div>
            <button
              onClick={downloadCodebase}
              disabled={zipDownloading}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-wait shadow-lg shadow-violet-500/20"
            >
              {zipDownloading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الضغط والتحميل...</>
                : <><Download className="w-4 h-4" /> تحميل الكود المصدري</>}
            </button>
          </div>
        </div>
      </div>

      {/* Restore Confirm Modal */}
      <ConfirmModal
        open={restoreConfirm}
        onClose={() => setRestoreConfirm(false)}
        onConfirm={doRestore}
        loading={restoring}
        danger
        title="تأكيد استعادة قاعدة البيانات"
        confirmLabel="نعم، ابدأ الاستعادة"
        body={
          <div className="space-y-3">
            <p>أنت على وشك استعادة قاعدة البيانات من الملف:</p>
            <div className="rounded-xl dark:bg-white/5 bg-slate-100 px-4 py-2 font-mono text-sm dark:text-slate-200 text-slate-800 break-all">
              {restoreFile?.name}
            </div>
            <p className="text-red-400 font-semibold">
              ⚠️ إذا كان الملف يحتوي على DROP TABLE سيتم حذف البيانات الموجودة. هل أنت متأكد؟
            </p>
          </div>
        }
      />
    </div>
  );
}
