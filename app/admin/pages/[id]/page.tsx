"use client";

import { useState, useEffect, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowRight, Save, Eye, Globe, EyeOff, Loader2, Plus, Trash2,
  Settings2, LayoutTemplate, GripVertical, X, ExternalLink,
  Monitor, Smartphone, LayoutDashboard, PanelLeft, List,
  Sun, Moon, Copy,
} from "lucide-react";
import { BlockSettings } from "@/components/page-builder/BlockSettings";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import { BLOCK_CATALOG } from "@/components/page-builder/blockCatalog";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Block {
  id: number;
  pageId: number;
  type: string;
  order: number;
  isVisible: boolean;
  settings: Record<string, unknown>;
}

interface Page {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  blocks: Block[];
}

type ViewMode = "desktop" | "mobile";
type PanelMode = "list" | "preview" | "split";
type MobileTab = "blocks" | "preview" | "settings";

// ─── Sortable Block Item ──────────────────────────────────────────────────────
function SortableBlockItem({
  block,
  index,
  isSelected,
  isDragging,
  onSelect,
  onToggleVisibility,
  onDelete,
  onDuplicate,
  getBlockInfo,
}: {
  block: Block;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  getBlockInfo: (type: string) => { label: string; icon: string; description: string; type: string };
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const info = getBlockInfo(block.type);

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={onSelect}
        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer group select-none ${
          isDragging
            ? "ring-2 ring-cyan-400 dark:bg-cyan-500/10 bg-cyan-50 dark:border-cyan-500/30 border-cyan-300"
            : isSelected
              ? "dark:bg-cyan-500/10 bg-cyan-50 dark:border-cyan-500/30 border-cyan-300"
              : block.isVisible
                ? "dark:bg-[#111827] bg-white dark:border-white/8 border-slate-200 hover:border-cyan-500/30 hover:dark:bg-[#161f35]"
                : "dark:bg-[#111827]/50 bg-slate-50 dark:border-white/5 border-slate-100 opacity-50"
        }`}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-0.5 rounded dark:text-slate-600 text-slate-300 hover:text-cyan-400 transition-colors"
          aria-label="اسحب لإعادة الترتيب"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* Icon */}
        <div className="w-7 h-7 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
          {info.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold dark:text-white text-slate-900 truncate">{info.label}</p>
          <p className="text-[10px] dark:text-slate-600 text-slate-400">#{index + 1}</p>
        </div>

        {/* Actions — always visible on mobile, hover-only on desktop */}
        <div
          className="flex items-center gap-1 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onToggleVisibility}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              block.isVisible ? "text-green-400" : "dark:text-slate-500 text-slate-400"
            }`}
            title={block.isVisible ? "إخفاء" : "إظهار"}
          >
            {block.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDuplicate}
            className="w-6 h-6 rounded flex items-center justify-center dark:text-slate-500 text-slate-400 hover:text-cyan-400 hover:dark:bg-cyan-500/10 hover:bg-cyan-50 transition-colors"
            title="نسخ البلوك"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="حذف البلوك"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Drag Overlay Card ────────────────────────────────────────────────────────
function DragOverlayCard({
  block,
  getBlockInfo,
}: {
  block: Block;
  getBlockInfo: (type: string) => { label: string; icon: string; description: string; type: string };
}) {
  const info = getBlockInfo(block.type);
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl border shadow-2xl dark:bg-[#111827] bg-white dark:border-cyan-500/40 border-cyan-300 ring-2 ring-cyan-400/50 cursor-grabbing">
      <GripVertical className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
      <div className="w-7 h-7 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
        {info.icon}
      </div>
      <p className="text-xs font-semibold dark:text-white text-slate-900 truncate">{info.label}</p>
    </div>
  );
}

// ─── Block List Panel ─────────────────────────────────────────────────────────
function BlockListPanel({
  blocks,
  selectedBlock,
  activeId,
  sensors,
  onDragStart,
  onDragEnd,
  onSelect,
  onToggleVisibility,
  onDelete,
  onDuplicate,
  onAddBlock,
  getBlockInfo,
}: {
  blocks: Block[];
  selectedBlock: Block | null;
  activeId: number | null;
  sensors: ReturnType<typeof useSensors>;
  onDragStart: (e: DragStartEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  onSelect: (block: Block | null) => void;
  onToggleVisibility: (block: Block) => void;
  onDelete: (id: number) => void;
  onDuplicate: (block: Block) => void;
  onAddBlock: () => void;
  getBlockInfo: (type: string) => { label: string; icon: string; description: string; type: string };
}) {
  const activeBlock = activeId ? blocks.find(b => b.id === activeId) ?? null : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <p className="text-xs font-bold dark:text-slate-400 text-slate-500 uppercase tracking-wider">
          البلوكات ({blocks.length})
        </p>
        <button
          onClick={onAddBlock}
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> إضافة
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {blocks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 dark:bg-[#111827] bg-white rounded-2xl border-2 border-dashed dark:border-white/10 border-slate-200">
            <LayoutTemplate className="w-8 h-8 mb-2 dark:text-slate-600 text-slate-300" />
            <p className="text-xs dark:text-slate-500 text-slate-400 text-center mb-3">لا توجد بلوكات بعد</p>
            <button
              onClick={onAddBlock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-bg text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> أضف أول بلوك
            </button>
          </div>
        )}

        {blocks.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {blocks.map((block, index) => (
                  <SortableBlockItem
                    key={block.id}
                    block={block}
                    index={index}
                    isSelected={selectedBlock?.id === block.id}
                    isDragging={activeId === block.id}
                    getBlockInfo={getBlockInfo}
                    onSelect={() => onSelect(selectedBlock?.id === block.id ? null : block)}
                    onToggleVisibility={() => onToggleVisibility(block)}
                    onDelete={() => onDelete(block.id)}
                    onDuplicate={() => onDuplicate(block)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
              {activeBlock && <DragOverlayCard block={activeBlock} getBlockInfo={getBlockInfo} />}
            </DragOverlay>
          </DndContext>
        )}

        {blocks.length > 0 && (
          <button
            onClick={onAddBlock}
            className="w-full mt-1.5 py-2.5 rounded-xl border-dashed border dark:border-white/10 border-slate-200 text-xs dark:text-slate-500 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> إضافة بلوك جديد
          </button>
        )}
      </div>

      {blocks.length > 1 && (
        <p className="text-[10px] dark:text-slate-700 text-slate-300 text-center mt-2 flex-shrink-0 flex items-center justify-center gap-1">
          <GripVertical className="w-3 h-3" /> اسحب الأيقونة لإعادة الترتيب
        </p>
      )}
    </div>
  );
}

// ─── Preview Panel ────────────────────────────────────────────────────────────
function PreviewPanel({
  blocks,
  viewMode,
  setViewMode,
}: {
  blocks: Block[];
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}) {
  const [previewTheme, setPreviewTheme] = useState<"dark" | "light">("dark");
  const visible = blocks.filter(b => b.isVisible);
  const isDark = previewTheme === "dark";
  const previewBg = isDark ? "#080d1a" : "#ffffff";
  const emptyColor = isDark ? "#334155" : "#94a3b8";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <p className="text-xs font-bold dark:text-slate-400 text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          معاينة حية
        </p>
        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            onClick={() => setPreviewTheme(p => p === "dark" ? "light" : "dark")}
            title={isDark ? "تبديل إلى الوضع النهاري" : "تبديل إلى الوضع الليلي"}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all ${
              isDark
                ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                : "border-amber-400/40 bg-amber-400/10 text-amber-500 hover:bg-amber-400/20"
            }`}
          >
            {isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
            <span>{isDark ? "ليلي" : "نهاري"}</span>
          </button>
          {/* View mode toggle */}
          <div className="flex items-center dark:bg-white/5 bg-slate-100 rounded-lg border dark:border-white/10 border-slate-200 p-0.5">
            <button
              onClick={() => setViewMode("desktop")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "desktop" ? "dark:bg-white/10 bg-white shadow text-cyan-400" : "dark:text-slate-500 text-slate-400"}`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("mobile")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "mobile" ? "dark:bg-white/10 bg-white shadow text-cyan-400" : "dark:text-slate-500 text-slate-400"}`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div
        className="flex-1 min-h-0 overflow-hidden rounded-2xl border dark:border-white/10 border-slate-200"
        style={{ backgroundColor: previewBg }}
      >
        <div className={`h-full overflow-y-auto ${isDark ? "dark" : ""}`}>
          {viewMode === "mobile" ? (
            <div className="flex justify-center py-4 px-2" style={{ backgroundColor: isDark ? "#0f172a" : "#f1f5f9" }}>
              <div
                className="w-[390px] flex-shrink-0 min-h-full rounded-2xl shadow-xl overflow-hidden"
                style={{ border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`, backgroundColor: previewBg }}
              >
                {visible.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64" style={{ color: emptyColor }}>
                    <LayoutTemplate className="w-10 h-10 mb-2" />
                    <p className="text-sm">لا توجد بلوكات مرئية</p>
                  </div>
                ) : (
                  <BlockRenderer blocks={visible} />
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-full" style={{ backgroundColor: previewBg }}>
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64" style={{ color: emptyColor }}>
                  <LayoutTemplate className="w-12 h-12 mb-3" />
                  <p className="text-sm">أضف بلوكات لترى المعاينة</p>
                </div>
              ) : (
                <BlockRenderer blocks={visible} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({
  selectedBlock,
  onClose,
  onToggleVisibility,
  onUpdateSettings,
  getBlockInfo,
}: {
  selectedBlock: Block | null;
  onClose: () => void;
  onToggleVisibility: (block: Block) => void;
  onUpdateSettings: (id: number, settings: Record<string, unknown>) => void;
  getBlockInfo: (type: string) => { label: string; icon: string; description: string; type: string };
}) {
  if (!selectedBlock) {
    return (
      <div className="flex flex-col items-center justify-center h-full dark:bg-[#111827]/40 bg-slate-50 rounded-2xl border dark:border-white/5 border-slate-200 border-dashed">
        <Settings2 className="w-8 h-8 dark:text-slate-700 text-slate-300 mb-2" />
        <p className="text-xs dark:text-slate-600 text-slate-400 text-center px-4">
          اختر بلوكاً من القائمة لتعديل إعداداته
        </p>
      </div>
    );
  }

  const info = getBlockInfo(selectedBlock.type);
  return (
    <div className="flex flex-col h-full dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/10 border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{info.icon}</span>
          <div>
            <p className="font-semibold dark:text-white text-slate-900 text-sm leading-tight">{info.label}</p>
            <p className="text-[10px] dark:text-slate-500 text-slate-400">إعدادات البلوك</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleVisibility(selectedBlock)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              selectedBlock.isVisible
                ? "dark:bg-green-500/10 bg-green-50 text-green-500"
                : "dark:bg-white/5 bg-slate-100 dark:text-slate-500 text-slate-400"
            }`}
            title={selectedBlock.isVisible ? "إخفاء" : "إظهار"}
          >
            {selectedBlock.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-red-400 transition-colors"
            title="إغلاق"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-4">
        <BlockSettings
          block={selectedBlock}
          onChange={(settings) => onUpdateSettings(selectedBlock.id, settings)}
        />
      </div>
    </div>
  );
}

// ─── Main Editor Page ──────────────────────────────────────────────────────────
export default function PageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [panelMode, setPanelMode] = useState<PanelMode>("split");
  const [mobileTab, setMobileTab] = useState<MobileTab>("blocks");
  const [activeId, setActiveId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Page>(`/admin/pages/${id}`);
      setPage(data);
      setBlocks(data.blocks);
      setTitle(data.title);
      setSlug(data.slug);
      setIsPublished(data.isPublished);
      setSeoTitle(data.seoTitle ?? "");
      setSeoDescription(data.seoDescription ?? "");
    } catch { toast.error("تعذّر تحميل الصفحة"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const savePage = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/pages/${id}`, { title, slug, isPublished, seoTitle, seoDescription });
      toast.success("تم الحفظ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ في الحفظ");
    } finally { setSaving(false); }
  };

  const addBlock = async (type: string) => {
    setAddingBlock(true);
    try {
      const block = await api.post<Block>(`/admin/pages/${id}/blocks`, { type });
      setBlocks(prev => [...prev, block]);
      setShowPalette(false);
      toast.success("تم إضافة البلوك");
      setSelectedBlock(block);
      setMobileTab("settings");
      if (panelMode === "list") setPanelMode("split");
    } catch { toast.error("خطأ في إضافة البلوك"); }
    finally { setAddingBlock(false); }
  };

  const deleteBlock = async (blockId: number) => {
    if (!confirm("هل تريد حذف هذا البلوك؟")) return;
    try {
      await api.delete(`/admin/pages/${id}/blocks/${blockId}`);
      setBlocks(prev => prev.filter(b => b.id !== blockId));
      if (selectedBlock?.id === blockId) setSelectedBlock(null);
      toast.success("تم الحذف");
    } catch { toast.error("خطأ في الحذف"); }
  };

  const toggleVisibility = async (block: Block) => {
    const newVal = !block.isVisible;
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, isVisible: newVal } : b));
    try {
      await api.put(`/admin/pages/${id}/blocks/${block.id}`, { isVisible: newVal });
      if (selectedBlock?.id === block.id) setSelectedBlock(b => b ? { ...b, isVisible: newVal } : b);
    } catch { toast.error("خطأ في تحديث الرؤية"); }
  };

  const updateBlockSettings = async (blockId: number, settings: Record<string, unknown>) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, settings } : b));
    setSelectedBlock(prev => prev?.id === blockId ? { ...prev, settings } : prev);
    try {
      await api.put(`/admin/pages/${id}/blocks/${blockId}`, { settings });
    } catch { toast.error("خطأ في حفظ الإعدادات"); }
  };

  const duplicateBlock = async (block: Block) => {
    try {
      const newBlock = await api.post<Block>(`/admin/pages/${id}/blocks`, {
        type: block.type,
        settings: block.settings,
      });
      setBlocks(prev => [...prev, newBlock]);
      setSelectedBlock(newBlock);
      setMobileTab("settings");
      toast.success("تم نسخ البلوك");
    } catch { toast.error("خطأ في نسخ البلوك"); }
  };

  const handleDragStart = (event: DragStartEvent) => { setActiveId(event.active.id as number); };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, order: i }));
    setBlocks(reordered);
    try {
      await api.put(`/admin/pages/${id}/blocks/reorder`, {
        items: reordered.map(b => ({ id: b.id, order: b.order })),
      });
    } catch {
      toast.error("خطأ في حفظ الترتيب");
      setBlocks(blocks);
    }
  };

  const getBlockInfo = (type: string) => {
    for (const cat of BLOCK_CATALOG) {
      const found = cat.blocks.find(b => b.type === type);
      if (found) return found;
    }
    return { type, label: type, icon: "□", description: "" };
  };

  const handleSelectBlock = (block: Block | null) => {
    setSelectedBlock(block);
    if (block) setMobileTab("settings");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-sm dark:text-slate-400 text-slate-500">جاري تحميل المحرر...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0" style={{ height: "calc(100vh - 80px)" }}>

      {/* ── Top Bar (Desktop) ────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-2 mb-3 flex-wrap flex-shrink-0">
        <Link href="/admin/pages"
          className="flex items-center gap-1.5 text-sm dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors flex-shrink-0">
          <ArrowRight className="w-4 h-4" /> الصفحات
        </Link>
        <span className="dark:text-slate-600 text-slate-300">/</span>

        <input value={title} onChange={e => setTitle(e.target.value)}
          className="flex-1 min-w-[140px] text-base font-bold dark:text-white text-slate-900 bg-transparent outline-none border-b-2 border-transparent focus:border-cyan-500 pb-0.5 transition-colors" />

        <div className="flex items-center text-xs dark:bg-white/5 bg-slate-100 px-2.5 py-1.5 rounded-lg border dark:border-white/10 border-slate-200">
          <span className="dark:text-slate-500 text-slate-400">/</span>
          <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))}
            dir="ltr" className="w-20 font-mono dark:text-white text-slate-900 bg-transparent outline-none text-xs" />
        </div>

        <button onClick={() => setIsPublished(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${isPublished ? "dark:bg-green-500/15 bg-green-50 text-green-500 border dark:border-green-500/20 border-green-200" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 border dark:border-white/10 border-slate-200"}`}>
          {isPublished ? <Globe className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {isPublished ? "منشور" : "مسودة"}
        </button>

        <button onClick={() => setShowSeo(v => !v)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex-shrink-0 ${showSeo ? "dark:bg-violet-500/15 bg-violet-50 text-violet-400 dark:border-violet-500/30 border-violet-200" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 dark:border-white/10 border-slate-200"}`}>
          SEO
        </button>

        <div className="flex items-center dark:bg-white/5 bg-slate-100 rounded-xl border dark:border-white/10 border-slate-200 p-0.5 flex-shrink-0">
          {([
            { mode: "list" as PanelMode, icon: PanelLeft, label: "قائمة" },
            { mode: "split" as PanelMode, icon: LayoutDashboard, label: "مقسّم" },
            { mode: "preview" as PanelMode, icon: Eye, label: "معاينة" },
          ]).map(({ mode, icon: Icon, label }) => (
            <button key={mode} onClick={() => setPanelMode(mode)} title={label}
              className={`p-1.5 rounded-lg transition-all ${panelMode === mode ? "dark:bg-white/10 bg-white shadow text-cyan-400" : "dark:text-slate-500 text-slate-400 hover:text-slate-600"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {isPublished && (
          <a href={`/${slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 border dark:border-white/10 border-slate-200 hover:text-cyan-400 transition-colors flex-shrink-0">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        <span className="text-xs dark:bg-white/5 bg-slate-100 px-2.5 py-1.5 rounded-lg border dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500 flex-shrink-0">
          {blocks.length} بلوك
        </span>

        <button onClick={savePage} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex-shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ
        </button>
      </div>

      {/* ── Top Bar (Mobile) ─────────────────────────────────────────── */}
      <div className="flex md:hidden items-center gap-2 mb-2 flex-shrink-0">
        <Link href="/admin/pages" className="flex items-center dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors flex-shrink-0">
          <ArrowRight className="w-4 h-4" />
        </Link>

        <input value={title} onChange={e => setTitle(e.target.value)}
          className="flex-1 min-w-0 text-sm font-bold dark:text-white text-slate-900 bg-transparent outline-none truncate" />

        <button onClick={() => setIsPublished(v => !v)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex-shrink-0 ${isPublished ? "dark:bg-green-500/15 bg-green-50 text-green-500 border dark:border-green-500/20 border-green-200" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 border dark:border-white/10 border-slate-200"}`}>
          {isPublished ? <Globe className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {isPublished ? "منشور" : "مسودة"}
        </button>

        <button onClick={savePage} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-bg text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex-shrink-0">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          حفظ
        </button>
      </div>

      {/* SEO Panel */}
      <AnimatePresence>
        {showSeo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3 flex-shrink-0">
            <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-violet-500/20 border-violet-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold dark:text-white text-slate-900">إعدادات SEO</p>
                <button onClick={() => setShowSeo(false)} className="dark:text-slate-500 text-slate-400 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs dark:text-slate-400 text-slate-500 mb-1 block">عنوان SEO</label>
                  <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="عنوان لمحركات البحث..."
                    className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="text-xs dark:text-slate-400 text-slate-500 mb-1 block">وصف SEO</label>
                  <input value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="وصف للمشاركة والبحث..."
                    className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-violet-500" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile Tab Bar ──────────────────────────────────────────── */}
      <div className="flex md:hidden items-stretch gap-1 mb-2 flex-shrink-0 dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-1">
        {([
          { tab: "blocks" as MobileTab, icon: List, label: `البلوكات (${blocks.length})` },
          { tab: "preview" as MobileTab, icon: Eye, label: "المعاينة" },
          { tab: "settings" as MobileTab, icon: Settings2, label: "الإعدادات" },
        ]).map(({ tab, icon: Icon, label }) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
              mobileTab === tab
                ? "dark:bg-cyan-500/15 bg-cyan-50 text-cyan-500 dark:border-cyan-500/20 border-cyan-200 border"
                : "dark:text-slate-400 text-slate-500"
            }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Main Content Area ────────────────────────────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">

        {/* ── Block List Panel ── */}
        {/* Mobile: shown only when mobileTab === "blocks" | Desktop: based on panelMode */}
        <div className={`
          flex-col min-h-0
          ${mobileTab === "blocks" ? "flex" : "hidden"}
          md:flex-shrink-0
          ${panelMode === "list" || panelMode === "split" ? "md:flex md:w-[260px]" : "md:hidden"}
          w-full md:w-auto
        `}>
          <BlockListPanel
            blocks={blocks}
            selectedBlock={selectedBlock}
            activeId={activeId}
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onSelect={handleSelectBlock}
            onToggleVisibility={toggleVisibility}
            onDelete={deleteBlock}
            onDuplicate={duplicateBlock}
            onAddBlock={() => setShowPalette(true)}
            getBlockInfo={getBlockInfo}
          />
        </div>

        {/* ── Preview Panel ── */}
        {/* Mobile: shown only when mobileTab === "preview" | Desktop: based on panelMode */}
        <div className={`
          flex-col min-h-0
          ${mobileTab === "preview" ? "flex" : "hidden"}
          ${panelMode === "preview" || panelMode === "split" ? "md:flex md:flex-1" : "md:hidden"}
          w-full md:w-auto
        `}>
          <PreviewPanel
            blocks={blocks}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </div>

        {/* ── Settings Panel ── */}
        {/* Mobile: shown only when mobileTab === "settings" | Desktop: shown if block selected */}
        <div className={`
          flex-col min-h-0
          ${mobileTab === "settings" ? "flex" : "hidden"}
          md:flex md:flex-shrink-0 md:w-[340px]
          w-full md:w-auto
          ${!selectedBlock ? "md:w-[240px]" : ""}
        `}>
          <SettingsPanel
            selectedBlock={selectedBlock}
            onClose={() => setSelectedBlock(null)}
            onToggleVisibility={toggleVisibility}
            onUpdateSettings={updateBlockSettings}
            getBlockInfo={getBlockInfo}
          />
        </div>
      </div>

      {/* ── Block Palette Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showPalette && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setShowPalette(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-2xl dark:bg-[#0f1629] bg-white rounded-t-3xl sm:rounded-2xl border dark:border-white/10 border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              {/* Modal handle for mobile */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full dark:bg-white/20 bg-slate-300" />
              </div>

              <div className="flex items-center justify-between p-5 pb-0">
                <div>
                  <h2 className="font-black dark:text-white text-slate-900 flex items-center gap-2 text-lg">
                    <Plus className="w-5 h-5 text-cyan-400" /> إضافة بلوك
                  </h2>
                  <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                    {BLOCK_CATALOG.reduce((acc, c) => acc + c.blocks.length, 0)} نوع متاح
                  </p>
                </div>
                <button onClick={() => setShowPalette(false)}
                  className="w-8 h-8 rounded-xl dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {BLOCK_CATALOG.map(cat => (
                  <div key={cat.category}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-black dark:text-slate-400 text-slate-500 uppercase tracking-widest">{cat.category}</p>
                      <div className="flex-1 h-px dark:bg-white/5 bg-slate-100" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cat.blocks.map(block => (
                        <button key={block.type} onClick={() => addBlock(block.type)} disabled={addingBlock}
                          className="flex items-start gap-3 p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/8 border-slate-200 hover:border-cyan-500/50 hover:dark:bg-cyan-500/5 hover:bg-cyan-50 active:scale-95 transition-all text-right group disabled:opacity-50">
                          <span className="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">{block.icon}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold dark:text-white text-slate-900 leading-tight">{block.label}</p>
                            <p className="text-[10px] dark:text-slate-500 text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{block.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {addingBlock && (
                  <div className="flex items-center justify-center gap-2 dark:text-slate-400 text-slate-500 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">جاري الإضافة...</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
