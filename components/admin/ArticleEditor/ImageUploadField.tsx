"use client";

import { useRef, useState } from "react";
import { Upload, Link2, X, Loader2, Image as ImageIcon } from "lucide-react";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  previewHeight?: string;
}

export default function ImageUploadField({
  value,
  onChange,
  label,
  hint,
  previewHeight = "h-48",
}: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(value.startsWith("http") ? value : "");
  const [dragOver, setDragOver] = useState(false);

  const inputClass =
    "w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm transition-colors";

  const doUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/articles/upload-image", {
        method: "POST",
        body: form,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("nouvil_token") || ""}`,
        },
      });
      if (!res.ok) throw new Error("فشل الرفع");
      const data = (await res.json()) as { url: string };
      onChange(data.url);
    } catch {
      alert("فشل رفع الصورة، حاول مرة أخرى");
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("يجب أن يكون الملف صورة"); return; }
    doUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium dark:text-slate-400 text-slate-500">{label}</label>
          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`px-2 py-0.5 rounded transition-colors ${mode === "upload" ? "bg-cyan-500/20 text-cyan-400" : "dark:text-slate-500 text-slate-400 hover:text-cyan-400"}`}
            >
              <Upload className="w-3 h-3 inline ml-1" />
              رفع صورة
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`px-2 py-0.5 rounded transition-colors ${mode === "url" ? "bg-cyan-500/20 text-cyan-400" : "dark:text-slate-500 text-slate-400 hover:text-cyan-400"}`}
            >
              <Link2 className="w-3 h-3 inline ml-1" />
              رابط
            </button>
          </div>
        </div>
      )}

      {mode === "url" ? (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className={`${inputClass} flex-1`}
            placeholder="https://example.com/image.jpg"
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => { if (urlInput.trim()) onChange(urlInput.trim()); }}
            className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-xs font-medium transition-colors"
          >
            تطبيق
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !value && fileRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer
            ${dragOver ? "border-cyan-400 dark:bg-cyan-500/10 bg-cyan-50" : "dark:border-white/10 border-slate-200 dark:hover:border-white/20 hover:border-slate-300"}
            ${value ? "cursor-default" : ""}
          `}
        >
          {value ? (
            <div className="relative group">
              <img
                src={value}
                alt="preview"
                className={`w-full ${previewHeight} object-cover rounded-xl`}
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur text-white rounded-lg text-xs font-medium hover:bg-white/30 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  تغيير
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(""); setUrlInput(""); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 text-white rounded-lg text-xs font-medium hover:bg-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  حذف
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 px-4">
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-sm dark:text-slate-400 text-slate-500">جاري الرفع...</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl dark:bg-white/5 bg-slate-100 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 dark:text-slate-500 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium dark:text-slate-300 text-slate-600">
                      اسحب الصورة هنا أو{" "}
                      <span className="text-cyan-400 underline underline-offset-2">اختر من جهازك</span>
                    </p>
                    <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
                      PNG, JPG, WebP — حتى 20MB
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          {uploading && value && (
            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      {hint && <p className="text-[11px] dark:text-slate-500 text-slate-400">{hint}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
