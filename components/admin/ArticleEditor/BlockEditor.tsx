"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, GripVertical, Image as ImageIcon, Code2,
  Quote, Minus, List, ListOrdered, Heading1, Heading2, Heading3,
  Type, Video, Link as LinkIcon, Upload, Loader2, X, ChevronUp, ChevronDown
} from "lucide-react";

// ── Block types ───────────────────────────────────────────────────────────
export type BlockType =
  | "paragraph" | "heading" | "image" | "code"
  | "quote" | "divider" | "list" | "video" | "link";

export interface Block {
  id: string;
  type: BlockType;
  // paragraph
  text?: string;
  // heading
  level?: 1 | 2 | 3;
  // image
  src?: string;
  alt?: string;
  caption?: string;
  // code
  language?: string;
  code?: string;
  // quote
  author?: string;
  // list
  listStyle?: "ordered" | "unordered";
  items?: string[];
  // video
  videoUrl?: string;
  // link
  linkUrl?: string;
  linkText?: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultBlock(type: BlockType): Block {
  const id = uid();
  switch (type) {
    case "paragraph": return { id, type, text: "" };
    case "heading": return { id, type, level: 2, text: "" };
    case "image": return { id, type, src: "", alt: "", caption: "" };
    case "code": return { id, type, language: "javascript", code: "" };
    case "quote": return { id, type, text: "", author: "" };
    case "divider": return { id, type };
    case "list": return { id, type, listStyle: "unordered", items: [""] };
    case "video": return { id, type, videoUrl: "" };
    case "link": return { id, type, linkUrl: "", linkText: "" };
  }
}

// ── Serialise to HTML (for display) ───────────────────────────────────────
export function blocksToHtml(blocks: Block[]): string {
  return blocks.map((b) => {
    switch (b.type) {
      case "paragraph":
        return `<p>${escHtml(b.text || "")}</p>`;
      case "heading":
        return `<h${b.level}>${escHtml(b.text || "")}</h${b.level}>`;
      case "image":
        return `<figure><img src="${escHtml(b.src || "")}" alt="${escHtml(b.alt || "")}" />${b.caption ? `<figcaption>${escHtml(b.caption)}</figcaption>` : ""}</figure>`;
      case "code":
        return `<pre><code class="language-${escHtml(b.language || "text")}">${escHtml(b.code || "")}</code></pre>`;
      case "quote":
        return `<blockquote>${escHtml(b.text || "")}${b.author ? `<cite>— ${escHtml(b.author)}</cite>` : ""}</blockquote>`;
      case "divider":
        return `<hr />`;
      case "list":
        const tag = b.listStyle === "ordered" ? "ol" : "ul";
        const items = (b.items || []).map((i) => `<li>${escHtml(i)}</li>`).join("");
        return `<${tag}>${items}</${tag}>`;
      case "video":
        return `<div class="video-block"><video src="${escHtml(b.videoUrl || "")}" controls style="max-width:100%"></video></div>`;
      case "link":
        return `<p><a href="${escHtml(b.linkUrl || "")}" target="_blank" rel="noopener noreferrer">${escHtml(b.linkText || b.linkUrl || "")}</a></p>`;
      default: return "";
    }
  }).join("\n");
}

function escHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Parse JSON content → blocks ────────────────────────────────────────────
export function parseContent(raw: string): Block[] {
  if (!raw) return [defaultBlock("paragraph")];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Block[];
  } catch { /* fall through */ }
  // Legacy HTML — wrap in one paragraph block for display
  return [{ id: uid(), type: "paragraph", text: raw }];
}

// ── Block type menu ────────────────────────────────────────────────────────
const BLOCK_MENU: { type: BlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "paragraph",  label: "فقرة نصية",    icon: <Type className="w-4 h-4" />,        desc: "نص عادي" },
  { type: "heading",    label: "عنوان",         icon: <Heading2 className="w-4 h-4" />,    desc: "H1 / H2 / H3" },
  { type: "image",      label: "صورة",          icon: <ImageIcon className="w-4 h-4" />,   desc: "رفع صورة من الجهاز" },
  { type: "code",       label: "كود برمجي",     icon: <Code2 className="w-4 h-4" />,       desc: "مع تحديد اللغة" },
  { type: "quote",      label: "اقتباس",        icon: <Quote className="w-4 h-4" />,       desc: "اقتباس مع الكاتب" },
  { type: "list",       label: "قائمة",         icon: <List className="w-4 h-4" />,        desc: "نقطية أو مرقمة" },
  { type: "divider",    label: "فاصل",          icon: <Minus className="w-4 h-4" />,       desc: "خط فاصل" },
  { type: "video",      label: "فيديو",         icon: <Video className="w-4 h-4" />,       desc: "رابط فيديو" },
  { type: "link",       label: "رابط",          icon: <LinkIcon className="w-4 h-4" />,    desc: "رابط بنص" },
];

// ── Image upload hook ──────────────────────────────────────────────────────
function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/articles/upload-image", {
        method: "POST",
        body: form,
        headers: { Authorization: `Bearer ${localStorage.getItem("nouvil_token") || ""}` },
      });
      if (!res.ok) throw new Error("فشل الرفع");
      const data = await res.json() as { url: string };
      return data.url;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading };
}

// ── Single block editor ────────────────────────────────────────────────────
function BlockItem({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  block: Block;
  onChange: (b: Block) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { upload, uploading } = useImageUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (fields: Partial<Block>) => onChange({ ...block, ...fields });

  const inputCls = "w-full bg-transparent outline-none dark:text-white text-slate-900 placeholder:dark:text-slate-500 placeholder:text-slate-400 resize-none";

  const renderContent = () => {
    switch (block.type) {
      case "paragraph":
        return (
          <textarea
            className={`${inputCls} text-base leading-relaxed min-h-[80px]`}
            placeholder="اكتب فقرة نصية..."
            value={block.text || ""}
            onChange={(e) => update({ text: e.target.value })}
            rows={3}
            style={{ fontFamily: "inherit" }}
          />
        );

      case "heading":
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => update({ level: l })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${block.level === l ? "bg-cyan-500 text-white" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 hover:bg-cyan-500/20"}`}
                >H{l}</button>
              ))}
            </div>
            <input
              className={`${inputCls} font-bold ${block.level === 1 ? "text-3xl" : block.level === 2 ? "text-2xl" : "text-xl"}`}
              placeholder={`عنوان H${block.level}`}
              value={block.text || ""}
              onChange={(e) => update({ text: e.target.value })}
            />
          </div>
        );

      case "image":
        return (
          <div className="space-y-3">
            {block.src ? (
              <div className="relative group">
                <img src={block.src} alt={block.alt || ""} className="w-full max-h-80 object-cover rounded-xl" />
                <button
                  onClick={() => update({ src: "" })}
                  className="absolute top-2 left-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                ><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed dark:border-white/10 border-slate-200 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-cyan-400 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 dark:text-slate-500 text-slate-400" />
                    <p className="dark:text-slate-400 text-slate-600 text-sm">انقر لرفع صورة من جهازك</p>
                    <p className="dark:text-slate-600 text-slate-400 text-xs">PNG, JPG, WebP — حتى 20MB</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await upload(file);
                    if (url) update({ src: url });
                  }}
                />
              </div>
            )}
            <input
              className={`${inputCls} text-sm dark:bg-white/5 bg-slate-100 rounded-lg px-3 py-2`}
              placeholder="النص البديل (Alt) — مهم لـ SEO"
              value={block.alt || ""}
              onChange={(e) => update({ alt: e.target.value })}
            />
            <input
              className={`${inputCls} text-sm dark:bg-white/5 bg-slate-100 rounded-lg px-3 py-2`}
              placeholder="تعليق على الصورة (اختياري)"
              value={block.caption || ""}
              onChange={(e) => update({ caption: e.target.value })}
            />
          </div>
        );

      case "code":
        return (
          <div className="space-y-2">
            <select
              className="px-3 py-1.5 rounded-lg text-sm dark:bg-[#0d1424] bg-slate-100 dark:text-slate-300 text-slate-700 border dark:border-white/10 border-slate-200 outline-none"
              value={block.language || "javascript"}
              onChange={(e) => update({ language: e.target.value })}
            >
              {["javascript","typescript","python","java","c","cpp","go","rust","php","css","html","json","bash","sql","kotlin","swift"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <textarea
              className="w-full dark:bg-[#0d1424] bg-slate-100 rounded-xl p-4 font-mono text-sm dark:text-cyan-300 text-cyan-700 border dark:border-white/5 border-slate-200 outline-none resize-y min-h-[120px] leading-relaxed"
              dir="ltr"
              placeholder="// أكتب الكود هنا..."
              value={block.code || ""}
              onChange={(e) => update({ code: e.target.value })}
              rows={6}
            />
          </div>
        );

      case "quote":
        return (
          <div className="space-y-2 border-r-4 border-cyan-400 pr-4">
            <textarea
              className={`${inputCls} text-lg italic min-h-[60px]`}
              placeholder="نص الاقتباس..."
              value={block.text || ""}
              onChange={(e) => update({ text: e.target.value })}
              rows={2}
            />
            <input
              className={`${inputCls} text-sm dark:text-slate-400 text-slate-600`}
              placeholder="المصدر أو الكاتب (اختياري)"
              value={block.author || ""}
              onChange={(e) => update({ author: e.target.value })}
            />
          </div>
        );

      case "divider":
        return <hr className="dark:border-white/10 border-slate-200 my-2" />;

      case "list":
        return (
          <div className="space-y-2">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => update({ listStyle: "unordered" })}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${block.listStyle !== "ordered" ? "bg-cyan-500 text-white" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600"}`}
              ><List className="w-3 h-3" /> نقطية</button>
              <button
                onClick={() => update({ listStyle: "ordered" })}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${block.listStyle === "ordered" ? "bg-cyan-500 text-white" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600"}`}
              ><ListOrdered className="w-3 h-3" /> مرقمة</button>
            </div>
            {(block.items || [""]).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="dark:text-slate-500 text-slate-400 text-sm w-6 text-center shrink-0">
                  {block.listStyle === "ordered" ? `${i + 1}.` : "•"}
                </span>
                <input
                  className={`${inputCls} flex-1`}
                  placeholder={`عنصر ${i + 1}...`}
                  value={item}
                  onChange={(e) => {
                    const newItems = [...(block.items || [])];
                    newItems[i] = e.target.value;
                    update({ items: newItems });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const newItems = [...(block.items || [])];
                      newItems.splice(i + 1, 0, "");
                      update({ items: newItems });
                    }
                    if (e.key === "Backspace" && item === "" && (block.items || []).length > 1) {
                      const newItems = [...(block.items || [])];
                      newItems.splice(i, 1);
                      update({ items: newItems });
                    }
                  }}
                />
                {(block.items || []).length > 1 && (
                  <button
                    onClick={() => {
                      const newItems = (block.items || []).filter((_, j) => j !== i);
                      update({ items: newItems });
                    }}
                    className="p-1 text-red-400 hover:text-red-500 shrink-0"
                  ><X className="w-3 h-3" /></button>
                )}
              </div>
            ))}
            <button
              onClick={() => update({ items: [...(block.items || []), ""] })}
              className="flex items-center gap-1.5 text-xs dark:text-slate-500 text-slate-400 hover:text-cyan-400 transition-colors mt-1"
            ><Plus className="w-3 h-3" /> إضافة عنصر</button>
          </div>
        );

      case "video":
        return (
          <div className="space-y-2">
            <input
              className={`${inputCls} dark:bg-white/5 bg-slate-100 rounded-lg px-3 py-2 text-sm`}
              dir="ltr"
              placeholder="https://example.com/video.mp4 أو رابط YouTube"
              value={block.videoUrl || ""}
              onChange={(e) => update({ videoUrl: e.target.value })}
            />
            {block.videoUrl && (
              <div className="rounded-xl overflow-hidden">
                {block.videoUrl.includes("youtube.com") || block.videoUrl.includes("youtu.be") ? (
                  <iframe
                    src={block.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                    className="w-full aspect-video rounded-xl"
                    allowFullScreen
                  />
                ) : (
                  <video src={block.videoUrl} controls className="w-full rounded-xl" />
                )}
              </div>
            )}
          </div>
        );

      case "link":
        return (
          <div className="space-y-2">
            <input
              className={`${inputCls} dark:bg-white/5 bg-slate-100 rounded-lg px-3 py-2 text-sm`}
              dir="ltr"
              placeholder="https://..."
              value={block.linkUrl || ""}
              onChange={(e) => update({ linkUrl: e.target.value })}
            />
            <input
              className={`${inputCls} dark:bg-white/5 bg-slate-100 rounded-lg px-3 py-2 text-sm`}
              placeholder="نص الرابط (اختياري)"
              value={block.linkText || ""}
              onChange={(e) => update({ linkText: e.target.value })}
            />
            {block.linkUrl && (
              <a href={block.linkUrl} target="_blank" rel="noopener noreferrer"
                className="text-cyan-400 text-sm hover:underline break-all"
              >{block.linkText || block.linkUrl}</a>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const blockLabel = BLOCK_MENU.find((m) => m.type === block.type)?.label || block.type;
  const blockIcon = BLOCK_MENU.find((m) => m.type === block.type)?.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 hover:border-cyan-400/50 transition-colors"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b dark:border-white/5 border-slate-100">
        <div className="flex items-center gap-2 dark:text-slate-500 text-slate-400 text-xs">
          <GripVertical className="w-4 h-4" />
          {blockIcon}
          <span>{blockLabel}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded dark:hover:bg-white/5 hover:bg-slate-100 disabled:opacity-20 transition-all"
            title="تحريك لأعلى"
          ><ChevronUp className="w-3.5 h-3.5" /></button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded dark:hover:bg-white/5 hover:bg-slate-100 disabled:opacity-20 transition-all"
            title="تحريك لأسفل"
          ><ChevronDown className="w-3.5 h-3.5" /></button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-all"
            title="حذف البلوك"
          ><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Block content */}
      {renderContent()}
    </motion.div>
  );
}

// ── Add block menu ─────────────────────────────────────────────────────────
function AddBlockMenu({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed dark:border-white/10 border-slate-200 dark:text-slate-500 text-slate-400 hover:border-cyan-400 hover:text-cyan-400 transition-all text-sm"
      >
        <Plus className="w-4 h-4" />
        إضافة بلوك
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full mb-2 right-0 z-20 w-full max-w-sm dark:bg-[#1a2235] bg-white rounded-2xl border dark:border-white/10 border-slate-200 shadow-2xl p-3 grid grid-cols-3 gap-2"
            >
              {BLOCK_MENU.map((item) => (
                <button
                  key={item.type}
                  onClick={() => { onAdd(item.type); setOpen(false); }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl dark:hover:bg-white/5 hover:bg-slate-50 transition-colors text-center"
                >
                  <span className="w-8 h-8 rounded-lg dark:bg-cyan-500/10 bg-cyan-50 flex items-center justify-center text-cyan-500">
                    {item.icon}
                  </span>
                  <span className="text-xs dark:text-slate-300 text-slate-700 font-medium">{item.label}</span>
                  <span className="text-[10px] dark:text-slate-600 text-slate-400">{item.desc}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main BlockEditor component ─────────────────────────────────────────────
interface BlockEditorProps {
  value: string;
  onChange: (json: string) => void;
}

export default function BlockEditor({ value, onChange }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseContent(value));

  // Sync blocks → parent JSON string
  const commit = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks);
    onChange(JSON.stringify(newBlocks));
  }, [onChange]);

  // Re-init if value resets externally (e.g. loading saved article)
  useEffect(() => {
    const parsed = parseContent(value);
    setBlocks(parsed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  const addBlock = (type: BlockType) => {
    commit([...blocks, defaultBlock(type)]);
  };

  const updateBlock = (id: string, updated: Block) => {
    commit(blocks.map((b) => (b.id === id ? updated : b)));
  };

  const deleteBlock = (id: string) => {
    const remaining = blocks.filter((b) => b.id !== id);
    commit(remaining.length > 0 ? remaining : [defaultBlock("paragraph")]);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newBlocks = [...blocks];
    [newBlocks[idx - 1], newBlocks[idx]] = [newBlocks[idx], newBlocks[idx - 1]];
    commit(newBlocks);
  };

  const moveDown = (idx: number) => {
    if (idx === blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[idx + 1]] = [newBlocks[idx + 1], newBlocks[idx]];
    commit(newBlocks);
  };

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {blocks.map((block, idx) => (
          <BlockItem
            key={block.id}
            block={block}
            onChange={(updated) => updateBlock(block.id, updated)}
            onDelete={() => deleteBlock(block.id)}
            onMoveUp={() => moveUp(idx)}
            onMoveDown={() => moveDown(idx)}
            isFirst={idx === 0}
            isLast={idx === blocks.length - 1}
          />
        ))}
      </AnimatePresence>

      <AddBlockMenu onAdd={addBlock} />

      <p className="text-xs dark:text-slate-600 text-slate-400 text-center">
        {blocks.length} {blocks.length === 1 ? "بلوك" : "بلوكات"} • انقر على البلوك لتعديله
      </p>
    </div>
  );
}
