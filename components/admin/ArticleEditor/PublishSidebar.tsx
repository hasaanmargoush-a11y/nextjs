"use client";

import { useState } from "react";
import {
  Globe, EyeOff, Clock, Archive, Star, StarOff, MessageSquare, MessageSquareOff,
  Save, Send, Loader2, Trash2, ExternalLink, Calendar
} from "lucide-react";

interface PublishSidebarProps {
  status: string;
  isPublished: boolean;
  isFeatured: boolean;
  commentsEnabled: boolean;
  publishedAt: string;
  scheduledAt: string;
  articleId?: number;
  isSubmitting: boolean;
  isSaving: boolean;
  onStatusChange: (status: string) => void;
  onFieldChange: (field: string, value: boolean | string) => void;
  onSave: () => void;
  onPublish: () => void;
  onDelete?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "مسودة", color: "text-slate-400 dark:bg-slate-700/50 bg-slate-100", icon: <Save className="w-3.5 h-3.5" /> },
  published: { label: "منشور", color: "text-green-400 dark:bg-green-500/10 bg-green-50", icon: <Globe className="w-3.5 h-3.5" /> },
  scheduled: { label: "مجدول", color: "text-amber-400 dark:bg-amber-500/10 bg-amber-50", icon: <Clock className="w-3.5 h-3.5" /> },
  archived: { label: "مؤرشف", color: "text-slate-500 dark:bg-slate-800 bg-slate-100", icon: <Archive className="w-3.5 h-3.5" /> },
};

export default function PublishSidebar({
  status, isPublished, isFeatured, commentsEnabled, publishedAt, scheduledAt,
  articleId, isSubmitting, isSaving, onStatusChange, onFieldChange, onSave, onPublish, onDelete
}: PublishSidebarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const cfg = statusConfig[status] || statusConfig.draft;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-xl border dark:border-white/10 border-slate-200 overflow-hidden">
        <div className="p-3 dark:bg-[#111827] bg-slate-50 border-b dark:border-white/10 border-slate-200">
          <h3 className="text-sm font-bold dark:text-white text-slate-900">النشر</h3>
        </div>
        <div className="p-3 space-y-3 dark:bg-[#0d1424] bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs dark:text-slate-400 text-slate-500">الحالة</span>
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>

          <div>
            <label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">تغيير الحالة</label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none focus:border-cyan-500"
            >
              <option value="draft" className="dark:bg-[#111827]">مسودة</option>
              <option value="published" className="dark:bg-[#111827]">منشور</option>
              <option value="scheduled" className="dark:bg-[#111827]">مجدول</option>
              <option value="archived" className="dark:bg-[#111827]">مؤرشف</option>
            </select>
          </div>

          {status === "scheduled" && (
            <div>
              <label className="block text-xs dark:text-slate-400 text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> تاريخ النشر المجدول
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => onFieldChange("scheduledAt", e.target.value)}
                className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {status === "published" && (
            <div>
              <label className="block text-xs dark:text-slate-400 text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> تاريخ النشر
              </label>
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => onFieldChange("publishedAt", e.target.value)}
                className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm outline-none focus:border-cyan-500"
              />
            </div>
          )}

          <div className="space-y-2 pt-1 border-t dark:border-white/5 border-slate-100">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-xs dark:text-slate-300 text-slate-700">
                {isFeatured ? <Star className="w-3.5 h-3.5 text-amber-400" /> : <StarOff className="w-3.5 h-3.5 dark:text-slate-500 text-slate-400" />}
                مقال مميز
              </span>
              <div
                onClick={() => onFieldChange("isFeatured", !isFeatured)}
                className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative ${isFeatured ? "bg-amber-500" : "dark:bg-white/10 bg-slate-200"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isFeatured ? "translate-x-1" : "translate-x-4"}`} />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-xs dark:text-slate-300 text-slate-700">
                {commentsEnabled ? <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> : <MessageSquareOff className="w-3.5 h-3.5 dark:text-slate-500 text-slate-400" />}
                تفعيل التعليقات
              </span>
              <div
                onClick={() => onFieldChange("commentsEnabled", !commentsEnabled)}
                className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative ${commentsEnabled ? "bg-cyan-500" : "dark:bg-white/10 bg-slate-200"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${commentsEnabled ? "translate-x-1" : "translate-x-4"}`} />
              </div>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-700 text-sm font-medium hover:dark:bg-white/10 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              حفظ
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              نشر
            </button>
          </div>

          {articleId && (
            <a
              href={`/articles/${articleId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              معاينة المقال
            </a>
          )}
        </div>
      </div>

      {onDelete && (
        <div className="rounded-xl border dark:border-red-500/20 border-red-100 overflow-hidden">
          <div className="p-3 dark:bg-[#111827] bg-slate-50 border-b dark:border-red-500/20 border-red-100">
            <h3 className="text-sm font-bold text-red-400">منطقة الخطر</h3>
          </div>
          <div className="p-3 dark:bg-[#0d1424] bg-white">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border dark:border-red-500/30 border-red-200 text-red-400 hover:dark:bg-red-500/10 hover:bg-red-50 text-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف المقال
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-400 text-center">هل أنت متأكد؟ لا يمكن التراجع!</p>
                <div className="flex gap-2">
                  <button type="button" onClick={onDelete} className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">حذف</button>
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-1.5 rounded-lg dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-700 text-xs transition-colors">إلغاء</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
