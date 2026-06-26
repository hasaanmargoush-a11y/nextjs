"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, Palette } from "lucide-react";

interface Block {
  id: number;
  type: string;
  settings: Record<string, unknown>;
}

interface Props {
  block: Block;
  onChange: (settings: Record<string, unknown>) => void;
}

// ── Base UI Components ────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium dark:text-slate-400 text-slate-500 block">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, dir }: { value: string; onChange: (v: string) => void; placeholder?: string; dir?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} dir={dir}
      className="w-full px-3 py-2 text-sm rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 transition-colors" />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2 text-sm rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 resize-none transition-colors" />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full appearance-none px-3 py-2 text-sm rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 pr-8 transition-colors">
        {options.map(o => <option key={o.value} value={o.value} className="dark:bg-[#1a2035]">{o.label}</option>)}
      </select>
      <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-500 pointer-events-none" />
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm dark:text-slate-300 text-slate-600">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${value ? "bg-cyan-500" : "dark:bg-white/10 bg-slate-200"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-0.5"}`} />
      </button>
    </label>
  );
}

function Range({ label, value, onChange, min, max, step = 1, unit = "" }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string;
}) {
  return (
    <Field label={`${label}: ${value}${unit}`}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-full accent-cyan-500" />
    </Field>
  );
}

const PRESET_COLORS = [
  "#06b6d4", "#8b5cf6", "#f59e0b", "#22c55e", "#ec4899", "#ef4444",
  "#3b82f6", "#f97316", "#14b8a6", "#a855f7", "#ffffff", "#0f172a",
];

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label}>
      <div className="relative">
        <button onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 text-sm dark:text-white text-slate-900 hover:border-cyan-500 transition-colors">
          <div className="w-5 h-5 rounded-md border dark:border-white/20 border-slate-300 flex-shrink-0" style={{ background: value || "#06b6d4" }} />
          <span className="flex-1 text-left font-mono text-xs">{value || "#06b6d4"}</span>
          <Palette className="w-3.5 h-3.5 dark:text-slate-400 text-slate-500" />
        </button>
        {open && (
          <div className="absolute top-full mt-1 left-0 right-0 z-50 p-3 dark:bg-[#1a2035] bg-white rounded-xl border dark:border-white/10 border-slate-200 shadow-xl">
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => { onChange(c); setOpen(false); }}
                  className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${value === c ? "border-cyan-400 scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={value || "#06b6d4"} onChange={e => onChange(e.target.value)}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer" />
              <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder="#hex"
                dir="ltr" className="flex-1 px-2 py-1 text-xs rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none font-mono" />
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}

function BtnField({ label, value, onChange }: { label: string; value: { text: string; href: string }; onChange: (v: { text: string; href: string }) => void }) {
  return (
    <div className="p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 space-y-2">
      <p className="text-xs font-medium dark:text-slate-400 text-slate-500">{label}</p>
      <Input value={value.text} onChange={v => onChange({ ...value, text: v })} placeholder="نص الزر" />
      <Input value={value.href} onChange={v => onChange({ ...value, href: v })} placeholder="/courses" dir="ltr" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold dark:text-slate-400 text-slate-500 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

// ── Color Selection Row ───────────────────────────────────────────────────────
function ColorRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = ["cyan", "violet", "amber", "green", "rose", "blue"];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {opts.map(c => (
        <button key={c} onClick={() => onChange(c)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${value === c ? "ring-2 ring-cyan-400 ring-offset-1 dark:ring-offset-[#1a2035]" : ""}`}
          style={{ background: { cyan: "#06b6d4", violet: "#8b5cf6", amber: "#f59e0b", green: "#22c55e", rose: "#f43f5e", blue: "#3b82f6" }[c] + "33" }}>
          {c}
        </button>
      ))}
    </div>
  );
}

// ── Hero Settings ─────────────────────────────────────────────────────────────
function HeroSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="المحتوى">
        <Toggle value={Boolean(s.showBadge)} onChange={v => set("showBadge", v)} label="إظهار الشارة" />
        {Boolean(s.showBadge) && <Field label="نص الشارة"><Input value={String(s.badge ?? "")} onChange={v => set("badge", v)} placeholder="نوفيل 2025" /></Field>}
        <Field label="العنوان الرئيسي"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
        <Field label="الوصف"><Textarea value={String(s.description ?? "")} onChange={v => set("description", v)} rows={2} /></Field>
      </Section>
      <Section title="الأزرار">
        <BtnField label="الزر الأول" value={(s.primaryBtn as { text: string; href: string }) ?? { text: "", href: "" }} onChange={v => set("primaryBtn", v)} />
        <BtnField label="الزر الثاني" value={(s.secondaryBtn as { text: string; href: string }) ?? { text: "", href: "" }} onChange={v => set("secondaryBtn", v)} />
      </Section>
      <Section title="الخلفية">
        <Field label="نوع الخلفية">
          <Select value={String(s.bgType ?? "gradient")} onChange={v => set("bgType", v)} options={[
            { value: "gradient", label: "تدرج ملون" },
            { value: "solid", label: "لون ثابت" },
            { value: "image", label: "صورة" },
          ]} />
        </Field>
        {String(s.bgType) === "solid" && <ColorPicker label="لون الخلفية" value={String(s.bgColor ?? "#0f1629")} onChange={v => set("bgColor", v)} />}
        {(String(s.bgType) === "gradient" || !s.bgType) && (
          <>
            <ColorPicker label="لون البداية" value={String(s.bgFrom ?? "#0a0f1e")} onChange={v => set("bgFrom", v)} />
            <ColorPicker label="لون النهاية" value={String(s.bgTo ?? "#1a0a2e")} onChange={v => set("bgTo", v)} />
            <Field label="اتجاه التدرج">
              <Select value={String(s.gradientDir ?? "135deg")} onChange={v => set("gradientDir", v)} options={[
                { value: "135deg", label: "قطري ↘" }, { value: "90deg", label: "أفقي →" },
                { value: "180deg", label: "عمودي ↓" }, { value: "45deg", label: "قطري ↗" },
              ]} />
            </Field>
          </>
        )}
        {String(s.bgType) === "image" && <Field label="رابط الصورة"><Input value={String(s.bgImage ?? "")} onChange={v => set("bgImage", v)} placeholder="https://..." dir="ltr" /></Field>}
        <div className="space-y-2">
          <Toggle
            value={!s.textColor}
            onChange={v => set("textColor", v ? "" : "#ffffff")}
            label="لون النص تلقائي (أبيض ليلي / أسود نهاري)"
          />
          {Boolean(s.textColor) && (
            <ColorPicker label="لون النص المخصص" value={String(s.textColor)} onChange={v => set("textColor", v)} />
          )}
        </div>
      </Section>
      <Section title="الأنيميشن">
        <Field label="نوع الأنيميشن">
          <Select value={String(s.animation ?? "particles")} onChange={v => set("animation", v)} options={[
            { value: "aurora",        label: "🌌 أورورا — ألوان شمالية" },
            { value: "glass_blobs",   label: "🫧 كرات زجاجية ضبابية" },
            { value: "plasma",        label: "⚡ بلازما — طاقة متحولة" },
            { value: "nebula",        label: "🌠 سديم فضائي" },
            { value: "neon_circuit",  label: "🔌 دوائر نيون إلكترونية" },
            { value: "dna",           label: "🧬 حلزون DNA" },
            { value: "neural",        label: "🧠 شبكة عصبية" },
            { value: "cyber_grid",    label: "🕹️ شبكة سايبر ثلاثية الأبعاد" },
            { value: "fire",          label: "🔥 حريق ونيران متصاعدة" },
            { value: "lightning",     label: "⚡ صواعق كهربائية" },
            { value: "smoke",         label: "💨 دخان يتصاعد" },
            { value: "orbits",        label: "🪐 مدارات كوكبية" },
            { value: "stars",         label: "✨ نجوم متلألئة" },
            { value: "particles",     label: "🌊 جسيمات متطايرة" },
            { value: "bubbles",       label: "🔵 فقاعات صاعدة" },
            { value: "waves",         label: "〰️ موجات دائرية" },
            { value: "matrix",        label: "🔢 مصفوفة كود" },
            { value: "floating-code", label: "💻 كود يطفو" },
            { value: "grid",          label: "⊞ شبكة متحركة" },
            { value: "confetti",      label: "🎊 كونفيتي" },
            { value: "mesh-gradient", label: "🎨 تدرج شبكي" },
            { value: "none",          label: "— بدون أنيميشن" },
          ]} />
        </Field>
        {String(s.animation) !== "none" && (
          <>
            <ColorPicker label="لون الأنيميشن" value={String(s.animColor ?? "#06b6d4")} onChange={v => set("animColor", v)} />
            <Field label="عدد الجسيمات">
              <Select value={String(s.animCount ?? 20)} onChange={v => set("animCount", parseInt(v))} options={[
                { value: "10", label: "قليل (10)" }, { value: "20", label: "متوسط (20)" }, { value: "40", label: "كثير (40)" },
              ]} />
            </Field>
            <Field label="السرعة">
              <Select value={String(s.animSpeed ?? "normal")} onChange={v => set("animSpeed", v)} options={[
                { value: "slow", label: "بطيء" }, { value: "normal", label: "عادي" }, { value: "fast", label: "سريع" },
              ]} />
            </Field>
          </>
        )}
      </Section>
      <Section title="ماسكوت / شخصية">
        <Toggle value={Boolean(s.showMascot)} onChange={v => set("showMascot", v)} label="إظهار شخصية متحركة" />
        {Boolean(s.showMascot) && (
          <>
            <Field label="نوع الشخصية">
              <Select value={String(s.mascotType ?? "robot")} onChange={v => set("mascotType", v)} options={[
                { value: "robot",      label: "🤖 روبوت ذكاء اصطناعي" },
                { value: "astronaut",  label: "🧑‍🚀 رائد فضاء" },
                { value: "coder",      label: "👩‍💻 مبرمج محترف" },
                { value: "alien",      label: "👾 كائن فضائي" },
                { value: "dragon",     label: "🐉 تنين نيون" },
                { value: "wizard",     label: "🧙 ساحر كود" },
                { value: "phoenix",    label: "🔥 طائر الفينيق" },
                { value: "ninja",      label: "🥷 نينجا مبرمج" },
                { value: "cyber_cat",  label: "🐱 قطة سايبر" },
                { value: "crystal",    label: "💎 بلورة 3D" },
              ]} />
            </Field>
            <ColorPicker label="لون الشخصية" value={String(s.mascotColor ?? "#06b6d4")} onChange={v => set("mascotColor", v)} />
          </>
        )}
      </Section>
    </div>
  );
}

// ── Stats Settings ─────────────────────────────────────────────────────────────
function StatsSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const items = (s.items as Array<{ label: string; value: string; icon: string; color: string }>) ?? [];
  return (
    <div className="space-y-4">
      <Section title="العنوان">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
        <Toggle value={Boolean(s.autoFetch)} onChange={v => set("autoFetch", v)} label="جلب تلقائي من المنصة" />
      </Section>
      {!s.autoFetch && (
        <Section title="الإحصائيات">
          {items.map((item, i) => (
            <div key={i} className="p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs dark:text-slate-400 text-slate-500">إحصائية {i + 1}</p>
                <button onClick={() => set("items", items.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <Input value={item.value} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, value: v } : x))} placeholder="50+" />
              <Input value={item.label} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, label: v } : x))} placeholder="كورس" />
              <ColorRow value={item.color} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, color: v } : x))} />
            </div>
          ))}
          <button onClick={() => set("items", [...items, { label: "جديد", value: "0", icon: "Star", color: "cyan" }])}
            className="w-full py-2 rounded-xl border-dashed border dark:border-white/10 border-slate-200 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1">
            <Plus className="w-3.5 h-3.5" /> إضافة
          </button>
        </Section>
      )}
    </div>
  );
}

// ── Grid Settings ──────────────────────────────────────────────────────────────
function GridSettings({ s, set, type }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void; type: string }) {
  const filterOptions = {
    courses_grid: [{ value: "featured", label: "المميزة" }, { value: "recent", label: "الأحدث" }, { value: "all", label: "الكل" }],
    challenges_grid: [{ value: "all", label: "الكل" }, { value: "easy", label: "سهل" }, { value: "medium", label: "متوسط" }, { value: "hard", label: "صعب" }],
    articles_grid: [{ value: "recent", label: "الأحدث" }, { value: "featured", label: "المميزة" }, { value: "all", label: "الكل" }],
  }[type] ?? [];
  return (
    <div className="space-y-4">
      <Section title="العناوين">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
      </Section>
      <Section title="الإعدادات">
        <Field label="عدد العناصر">
          <Select value={String(s.count ?? 6)} onChange={v => set("count", parseInt(v))} options={[
            { value: "3", label: "3" }, { value: "6", label: "6" }, { value: "9", label: "9" }, { value: "12", label: "12" },
          ]} />
        </Field>
        {filterOptions.length > 0 && <Field label="الفلتر"><Select value={String(s.filter ?? "all")} onChange={v => set("filter", v)} options={filterOptions} /></Field>}
        <Toggle value={Boolean(s.showBtn)} onChange={v => set("showBtn", v)} label="عرض زر «عرض الكل»" />
        {Boolean(s.showBtn) && (
          <>
            <Field label="نص الزر"><Input value={String(s.btnText ?? "")} onChange={v => set("btnText", v)} /></Field>
            <Field label="مسار الزر"><Input value={String(s.btnHref ?? "")} onChange={v => set("btnHref", v)} dir="ltr" /></Field>
          </>
        )}
      </Section>
    </div>
  );
}

// ── Users Grid Settings ────────────────────────────────────────────────────────
function UsersGridSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="العناوين">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
      </Section>
      <Section title="الإعدادات">
        <Field label="عدد المستخدمين">
          <Select value={String(s.count ?? 6)} onChange={v => set("count", parseInt(v))} options={[
            { value: "6", label: "6" }, { value: "9", label: "9" }, { value: "12", label: "12" },
          ]} />
        </Field>
        <Toggle value={Boolean(s.showPoints)} onChange={v => set("showPoints", v)} label="إظهار النقاط" />
        <Toggle value={Boolean(s.showBio)} onChange={v => set("showBio", v)} label="إظهار البيوغرافيا" />
      </Section>
    </div>
  );
}

// ── Features Settings ──────────────────────────────────────────────────────────
function FeaturesSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const items = (s.items as Array<{ icon: string; title: string; description: string; color: string }>) ?? [];
  return (
    <div className="space-y-4">
      <Section title="العناوين">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
        <Field label="الأعمدة">
          <Select value={String(s.columns ?? 3)} onChange={v => set("columns", parseInt(v))} options={[
            { value: "2", label: "عمودان" }, { value: "3", label: "3 أعمدة" }, { value: "4", label: "4 أعمدة" },
          ]} />
        </Field>
      </Section>
      <Section title="العناصر">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs dark:text-slate-400 text-slate-500">ميزة {i + 1}</p>
              <button onClick={() => set("items", items.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <Input value={item.title} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, title: v } : x))} placeholder="عنوان الميزة" />
            <Textarea value={item.description} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, description: v } : x))} placeholder="الوصف" rows={2} />
            <ColorRow value={item.color} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, color: v } : x))} />
          </div>
        ))}
        <button onClick={() => set("items", [...items, { icon: "Star", title: "ميزة جديدة", description: "وصف الميزة", color: "cyan" }])}
          className="w-full py-2 rounded-xl border-dashed border dark:border-white/10 border-slate-200 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" /> إضافة ميزة
        </button>
      </Section>
    </div>
  );
}

// ── Cards Settings ─────────────────────────────────────────────────────────────
function CardsSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const items = (s.items as Array<{ title: string; description: string; icon: string; color: string; href: string; badge?: string }>) ?? [];
  return (
    <div className="space-y-4">
      <Section title="العناوين">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
        <Field label="الأعمدة">
          <Select value={String(s.columns ?? 3)} onChange={v => set("columns", parseInt(v))} options={[
            { value: "2", label: "عمودان" }, { value: "3", label: "3 أعمدة" }, { value: "4", label: "4 أعمدة" },
          ]} />
        </Field>
      </Section>
      <Section title="البطاقات">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs dark:text-slate-400 text-slate-500">بطاقة {i + 1}</p>
              <button onClick={() => set("items", items.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <Input value={item.title} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, title: v } : x))} placeholder="عنوان البطاقة" />
            <Textarea value={item.description} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, description: v } : x))} placeholder="الوصف" rows={2} />
            <Input value={item.badge ?? ""} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, badge: v } : x))} placeholder="شارة (اختياري)" />
            <Input value={item.href ?? ""} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, href: v } : x))} placeholder="/link" dir="ltr" />
            <ColorRow value={item.color} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, color: v } : x))} />
          </div>
        ))}
        <button onClick={() => set("items", [...items, { title: "بطاقة جديدة", description: "", icon: "Star", color: "cyan", href: "#" }])}
          className="w-full py-2 rounded-xl border-dashed border dark:border-white/10 border-slate-200 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" /> إضافة بطاقة
        </button>
      </Section>
    </div>
  );
}

// ── Testimonials Settings ──────────────────────────────────────────────────────
function TestimonialsSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const items = (s.items as Array<{ name: string; role: string; content: string; rating: number }>) ?? [];
  return (
    <div className="space-y-4">
      <Section title="العناوين">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
        <Field label="الأعمدة">
          <Select value={String(s.columns ?? 3)} onChange={v => set("columns", parseInt(v))} options={[{ value: "2", label: "عمودان" }, { value: "3", label: "3 أعمدة" }]} />
        </Field>
      </Section>
      <Section title="الآراء">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs dark:text-slate-400 text-slate-500">رأي {i + 1}</p>
              <button onClick={() => set("items", items.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <Input value={item.name} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="اسم المستخدم" />
            <Input value={item.role} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, role: v } : x))} placeholder="المنصب / الوصف" />
            <Textarea value={item.content} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, content: v } : x))} placeholder="نص الرأي..." rows={2} />
            <Field label="التقييم">
              <Select value={String(item.rating ?? 5)} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, rating: parseInt(v) } : x))} options={[
                { value: "5", label: "⭐⭐⭐⭐⭐" }, { value: "4", label: "⭐⭐⭐⭐" }, { value: "3", label: "⭐⭐⭐" },
              ]} />
            </Field>
          </div>
        ))}
        <button onClick={() => set("items", [...items, { name: "مستخدم جديد", role: "طالب", content: "رأي رائع...", rating: 5 }])}
          className="w-full py-2 rounded-xl border-dashed border dark:border-white/10 border-slate-200 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" /> إضافة رأي
        </button>
      </Section>
    </div>
  );
}

// ── FAQ Settings ───────────────────────────────────────────────────────────────
function FaqSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const items = (s.items as Array<{ question: string; answer: string }>) ?? [];
  return (
    <div className="space-y-4">
      <Section title="العناوين">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
      </Section>
      <Section title="الأسئلة">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs dark:text-slate-400 text-slate-500">سؤال {i + 1}</p>
              <button onClick={() => set("items", items.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <Input value={item.question} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, question: v } : x))} placeholder="السؤال؟" />
            <Textarea value={item.answer} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, answer: v } : x))} placeholder="الإجابة..." rows={2} />
          </div>
        ))}
        <button onClick={() => set("items", [...items, { question: "سؤال جديد؟", answer: "الإجابة هنا..." }])}
          className="w-full py-2 rounded-xl border-dashed border dark:border-white/10 border-slate-200 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" /> إضافة سؤال
        </button>
      </Section>
    </div>
  );
}

// ── Pricing Settings ───────────────────────────────────────────────────────────
function PricingSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const items = (s.items as Array<{ name: string; price: string; period: string; description: string; features: string[]; color: string; badge?: string; isPopular: boolean; btnText: string; btnHref: string }>) ?? [];
  return (
    <div className="space-y-4">
      <Section title="العناوين">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
      </Section>
      <Section title="الباقات">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs dark:text-slate-400 text-slate-500">باقة {i + 1}</p>
              <button onClick={() => set("items", items.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <Input value={item.name} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="اسم الباقة" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={item.price} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, price: v } : x))} placeholder="مجانًا / 99ر.س" />
              <Input value={item.period} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, period: v } : x))} placeholder="/شهر" />
            </div>
            <Input value={item.description} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, description: v } : x))} placeholder="وصف مختصر" />
            <Textarea value={(item.features ?? []).join("\n")} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, features: v.split("\n").filter(Boolean) } : x))} placeholder="ميزة 1&#10;ميزة 2&#10;ميزة 3" rows={3} />
            <Input value={item.badge ?? ""} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, badge: v } : x))} placeholder="شارة (الأكثر شعبية)" />
            <Toggle value={item.isPopular} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, isPopular: v } : x))} label="الأكثر شعبية" />
            <Input value={item.btnText} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, btnText: v } : x))} placeholder="نص الزر" />
            <Input value={item.btnHref} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, btnHref: v } : x))} placeholder="/auth/register" dir="ltr" />
            <ColorRow value={item.color} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, color: v } : x))} />
          </div>
        ))}
        <button onClick={() => set("items", [...items, { name: "باقة جديدة", price: "0", period: "/شهر", description: "", features: [], color: "cyan", isPopular: false, btnText: "ابدأ الآن", btnHref: "#" }])}
          className="w-full py-2 rounded-xl border-dashed border dark:border-white/10 border-slate-200 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" /> إضافة باقة
        </button>
      </Section>
    </div>
  );
}

// ── CTA Settings ───────────────────────────────────────────────────────────────
function CtaSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="المحتوى">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="الوصف"><Textarea value={String(s.description ?? "")} onChange={v => set("description", v)} rows={2} /></Field>
      </Section>
      <Section title="الأزرار">
        <BtnField label="الزر الأول" value={(s.primaryBtn as { text: string; href: string }) ?? { text: "", href: "" }} onChange={v => set("primaryBtn", v)} />
        <BtnField label="الزر الثاني" value={(s.secondaryBtn as { text: string; href: string }) ?? { text: "", href: "" }} onChange={v => set("secondaryBtn", v)} />
      </Section>
      <Section title="المظهر">
        <Field label="النمط">
          <Select value={String(s.style ?? "gradient")} onChange={v => set("style", v)} options={[{ value: "gradient", label: "تدرج ملون" }, { value: "glass", label: "زجاجي" }]} />
        </Field>
      </Section>
    </div>
  );
}

// ── Rich Text Settings ─────────────────────────────────────────────────────────
function RichTextSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="النوع والمحتوى">
        <Field label="نوع العنصر">
          <Select value={String(s.textType ?? "paragraph")} onChange={v => set("textType", v)} options={[
            { value: "h1", label: "🔠 عنوان رئيسي (H1)" },
            { value: "h2", label: "🔡 عنوان ثانوي (H2)" },
            { value: "h3", label: "🔤 عنوان ثالث (H3)" },
            { value: "paragraph", label: "📝 فقرة نصية" },
            { value: "quote", label: "💬 اقتباس" },
            { value: "list", label: "📋 قائمة (سطر = عنصر)" },
            { value: "badge", label: "🏷️ شارة / تاغ" },
          ]} />
        </Field>
        <Field label="المحتوى"><Textarea value={String(s.content ?? "")} onChange={v => set("content", v)} rows={4} placeholder="اكتب النص هنا..." /></Field>
      </Section>
      <Section title="التنسيق">
        <Field label="المحاذاة">
          <Select value={String(s.align ?? "right")} onChange={v => set("align", v)} options={[{ value: "right", label: "يمين" }, { value: "center", label: "وسط" }, { value: "left", label: "يسار" }]} />
        </Field>
        <Field label="الحجم">
          <Select value={String(s.size ?? "md")} onChange={v => set("size", v)} options={[{ value: "sm", label: "صغير" }, { value: "md", label: "متوسط" }, { value: "lg", label: "كبير" }, { value: "xl", label: "كبير جداً" }]} />
        </Field>
        <ColorPicker label="لون النص (اختياري)" value={String(s.color ?? "")} onChange={v => set("color", v)} />
        <ColorPicker label="لون الخلفية (اختياري)" value={String(s.bgColor ?? "")} onChange={v => set("bgColor", v)} />
        <Field label="الحشو (Padding)">
          <Select value={String(s.padding ?? "md")} onChange={v => set("padding", v)} options={[{ value: "none", label: "بدون" }, { value: "sm", label: "صغير" }, { value: "md", label: "متوسط" }, { value: "lg", label: "كبير" }]} />
        </Field>
      </Section>
    </div>
  );
}

// ── Code Block Settings ────────────────────────────────────────────────────────
function CodeBlockSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="الكود">
        <Field label="اللغة">
          <Select value={String(s.language ?? "javascript")} onChange={v => set("language", v)} options={[
            { value: "javascript", label: "JavaScript" }, { value: "typescript", label: "TypeScript" },
            { value: "python", label: "Python" }, { value: "html", label: "HTML" },
            { value: "css", label: "CSS" }, { value: "sql", label: "SQL" },
            { value: "bash", label: "Bash / Shell" }, { value: "json", label: "JSON" },
            { value: "java", label: "Java" }, { value: "rust", label: "Rust" },
          ]} />
        </Field>
        <Field label="الكود"><Textarea value={String(s.code ?? "")} onChange={v => set("code", v)} rows={8} placeholder="اكتب الكود هنا..." /></Field>
        <Field label="اسم الملف (اختياري)"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} placeholder="App.tsx" dir="ltr" /></Field>
      </Section>
      <Section title="المظهر">
        <Field label="الثيم">
          <Select value={String(s.theme ?? "dark")} onChange={v => set("theme", v)} options={[{ value: "dark", label: "🌙 داكن (GitHub)" }, { value: "monokai", label: "🎨 Monokai" }, { value: "light", label: "☀️ فاتح" }]} />
        </Field>
        <Toggle value={Boolean(s.showLineNumbers)} onChange={v => set("showLineNumbers", v)} label="إظهار أرقام الأسطر" />
        <Toggle value={Boolean(s.copyButton !== false)} onChange={v => set("copyButton", v)} label="زر النسخ" />
      </Section>
    </div>
  );
}

// ── Video Embed Settings ───────────────────────────────────────────────────────
function VideoEmbedSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="الفيديو">
        <Field label="رابط الفيديو (YouTube أو مباشر)"><Input value={String(s.url ?? "")} onChange={v => set("url", v)} placeholder="https://youtube.com/watch?v=..." dir="ltr" /></Field>
        <Field label="عنوان القسم (اختياري)"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
      </Section>
      <Section title="الإعدادات">
        <Field label="نسبة العرض">
          <Select value={String(s.aspectRatio ?? "16:9")} onChange={v => set("aspectRatio", v)} options={[{ value: "16:9", label: "16:9 (افتراضي)" }, { value: "4:3", label: "4:3" }, { value: "1:1", label: "مربع 1:1" }]} />
        </Field>
        <Toggle value={Boolean(s.autoplay)} onChange={v => set("autoplay", v)} label="تشغيل تلقائي" />
        <Toggle value={Boolean(s.controls !== false)} onChange={v => set("controls", v)} label="أدوات التشغيل" />
      </Section>
    </div>
  );
}

// ── Image Banner Settings ──────────────────────────────────────────────────────
function ImageBannerSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="الصورة">
        <Field label="رابط الصورة"><Input value={String(s.imageUrl ?? "")} onChange={v => set("imageUrl", v)} placeholder="https://..." dir="ltr" /></Field>
        <Range label="الارتفاع" value={Number(s.height ?? 400)} onChange={v => set("height", v)} min={200} max={700} step={50} unit="px" />
      </Section>
      <Section title="الطبقة الشفافة">
        <ColorPicker label="لون الطبقة" value={String(s.overlayColor ?? "#000000")} onChange={v => set("overlayColor", v)} />
        <Range label="الشفافية" value={Number(s.overlayOpacity ?? 0.5)} onChange={v => set("overlayOpacity", v)} min={0} max={0.95} step={0.05} unit="" />
      </Section>
      <Section title="المحتوى">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
        <BtnField label="الزر" value={(s.primaryBtn as { text: string; href: string }) ?? { text: "", href: "" }} onChange={v => set("primaryBtn", v)} />
        <Field label="موضع المحتوى">
          <Select value={String(s.contentPosition ?? "center")} onChange={v => set("contentPosition", v)} options={[{ value: "center", label: "وسط" }, { value: "left", label: "يسار" }, { value: "right", label: "يمين" }]} />
        </Field>
      </Section>
    </div>
  );
}

// ── Countdown Settings ─────────────────────────────────────────────────────────
function CountdownSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="الإعدادات">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
        <Field label="التاريخ المستهدف">
          <input type="date" value={String(s.targetDate ?? "")} onChange={e => set("targetDate", e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500" />
        </Field>
        <Field label="اللون">
          <Select value={String(s.color ?? "cyan")} onChange={v => set("color", v)} options={[{ value: "cyan", label: "سماوي" }, { value: "violet", label: "بنفسجي" }, { value: "amber", label: "ذهبي" }, { value: "green", label: "أخضر" }]} />
        </Field>
      </Section>
    </div>
  );
}

// ── Mascot Section Settings ────────────────────────────────────────────────────
function MascotSectionSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="الشخصية">
        <Field label="نوع الشخصية">
          <Select value={String(s.mascotType ?? "robot")} onChange={v => set("mascotType", v)} options={[
            { value: "robot", label: "🤖 روبوت" }, { value: "astronaut", label: "🧑‍🚀 رائد فضاء" },
            { value: "coder", label: "👩‍💻 مبرمج" }, { value: "alien", label: "👾 كائن فضائي" },
          ]} />
        </Field>
        <ColorPicker label="لون الشخصية" value={String(s.mascotColor ?? "#06b6d4")} onChange={v => set("mascotColor", v)} />
        <Field label="الحجم">
          <Select value={String(s.mascotSize ?? "md")} onChange={v => set("mascotSize", v)} options={[{ value: "sm", label: "صغير" }, { value: "md", label: "متوسط" }, { value: "lg", label: "كبير" }]} />
        </Field>
        <Field label="موضع الشخصية">
          <Select value={String(s.mascotPosition ?? "right")} onChange={v => set("mascotPosition", v)} options={[{ value: "right", label: "يمين" }, { value: "left", label: "يسار" }]} />
        </Field>
        <Field label="نوع الأنيميشن">
          <Select value={String(s.animationType ?? "float")} onChange={v => set("animationType", v)} options={[
            { value: "float", label: "طافي" }, { value: "bounce", label: "ارتداد" },
            { value: "pulse", label: "نبض" }, { value: "rotate", label: "تأرجح" },
          ]} />
        </Field>
      </Section>
      <Section title="المحتوى">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="الوصف"><Textarea value={String(s.description ?? "")} onChange={v => set("description", v)} rows={3} /></Field>
        <BtnField label="الزر" value={(s.primaryBtn as { text: string; href: string }) ?? { text: "", href: "" }} onChange={v => set("primaryBtn", v)} />
      </Section>
      <Section title="المظهر">
        <Field label="خلفية القسم">
          <Select value={String(s.bgStyle ?? "gradient")} onChange={v => set("bgStyle", v)} options={[{ value: "gradient", label: "تدرج خفيف" }, { value: "dark", label: "داكن" }, { value: "transparent", label: "شفاف" }]} />
        </Field>
      </Section>
    </div>
  );
}

// ── Animation Block Settings ───────────────────────────────────────────────────
function AnimationSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="الخلفية">
        <Field label="نوع الخلفية">
          <Select value={String(s.backgroundType ?? "transparent")} onChange={v => set("backgroundType", v)} options={[
            { value: "transparent", label: "شفافة" }, { value: "solid", label: "لون ثابت" }, { value: "gradient", label: "تدرج ملون" },
          ]} />
        </Field>
        {String(s.backgroundType) === "solid" && <ColorPicker label="لون الخلفية" value={String(s.bgColor ?? "#0f172a")} onChange={v => set("bgColor", v)} />}
        {String(s.backgroundType) === "gradient" && (
          <>
            <ColorPicker label="لون البداية" value={String(s.bgFrom ?? "#0a0f1e")} onChange={v => set("bgFrom", v)} />
            <ColorPicker label="لون النهاية" value={String(s.bgTo ?? "#1a0a2e")} onChange={v => set("bgTo", v)} />
            <Field label="الاتجاه">
              <Select value={String(s.gradientDir ?? "135deg")} onChange={v => set("gradientDir", v)} options={[
                { value: "135deg", label: "قطري ↘" }, { value: "90deg", label: "أفقي →" }, { value: "180deg", label: "عمودي ↓" },
              ]} />
            </Field>
          </>
        )}
      </Section>
      <Section title="الأنيميشن">
        <Field label="نوع الأنيميشن">
          <Select value={String(s.animationType ?? "particles")} onChange={v => set("animationType", v)} options={[
            { value: "particles", label: "🌊 جسيمات متطايرة" },
            { value: "bubbles", label: "🫧 فقاعات صاعدة" },
            { value: "waves", label: "〰️ موجات" },
            { value: "orbits", label: "🪐 مدارات دوارة" },
            { value: "stars", label: "✨ نجوم متلألئة" },
            { value: "matrix", label: "🔢 كود يتساقط" },
            { value: "floating-code", label: "💻 كود يطفو" },
            { value: "grid", label: "⊞ شبكة متحركة" },
            { value: "confetti", label: "🎊 كونفيتي" },
            { value: "mesh-gradient", label: "🎨 تدرج شبكي" },
            { value: "none", label: "بدون أنيميشن" },
          ]} />
        </Field>
        {String(s.animationType) !== "none" && (
          <>
            <ColorPicker label="لون الأنيميشن" value={String(s.particleColor ?? "#06b6d4")} onChange={v => set("particleColor", v)} />
            <Range label="عدد الجسيمات" value={Number(s.particleCount ?? 25)} onChange={v => set("particleCount", v)} min={5} max={80} step={5} />
            <Field label="السرعة">
              <Select value={String(s.speed ?? "normal")} onChange={v => set("speed", v)} options={[{ value: "slow", label: "بطيء" }, { value: "normal", label: "عادي" }, { value: "fast", label: "سريع" }]} />
            </Field>
          </>
        )}
        <Range label="الارتفاع" value={Number(s.height ?? 300)} onChange={v => set("height", v)} min={100} max={700} step={50} unit="px" />
        <Range label="الشفافية" value={Number(s.opacity ?? 0.8)} onChange={v => set("opacity", v)} min={0.1} max={1} step={0.1} unit="" />
      </Section>
      <Section title="ماسكوت / شخصية">
        <Toggle value={Boolean(s.showMascot)} onChange={v => set("showMascot", v)} label="إظهار شخصية متحركة" />
        {Boolean(s.showMascot) && (
          <>
            <Field label="نوع الشخصية">
              <Select value={String(s.mascotType ?? "robot")} onChange={v => set("mascotType", v)} options={[
                { value: "robot", label: "🤖 روبوت" }, { value: "astronaut", label: "🧑‍🚀 رائد فضاء" },
                { value: "coder", label: "👩‍💻 مبرمج" }, { value: "alien", label: "👾 كائن فضائي" },
              ]} />
            </Field>
            <ColorPicker label="لون الشخصية" value={String(s.mascotColor ?? "#06b6d4")} onChange={v => set("mascotColor", v)} />
            <Field label="موضع الشخصية">
              <Select value={String(s.mascotPosition ?? "center")} onChange={v => set("mascotPosition", v)} options={[{ value: "left", label: "يسار" }, { value: "center", label: "وسط" }, { value: "right", label: "يمين" }]} />
            </Field>
          </>
        )}
        <Toggle value={Boolean(s.showContent)} onChange={v => set("showContent", v)} label="إظهار نص فوق الأنيميشن" />
        {Boolean(s.showContent) && (
          <>
            <Field label="العنوان"><Input value={String(s.contentTitle ?? "")} onChange={v => set("contentTitle", v)} /></Field>
            <Field label="العنوان الفرعي"><Input value={String(s.contentSubtitle ?? "")} onChange={v => set("contentSubtitle", v)} /></Field>
          </>
        )}
      </Section>
    </div>
  );
}

// ── Text Settings ─────────────────────────────────────────────────────────────
function TextSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Field label="المحتوى"><Textarea value={String(s.content ?? "")} onChange={v => set("content", v)} rows={5} /></Field>
      <Field label="المحاذاة">
        <Select value={String(s.align ?? "right")} onChange={v => set("align", v)} options={[{ value: "right", label: "يمين" }, { value: "center", label: "وسط" }, { value: "left", label: "يسار" }]} />
      </Field>
      <Field label="الحجم">
        <Select value={String(s.size ?? "md")} onChange={v => set("size", v)} options={[{ value: "sm", label: "صغير" }, { value: "md", label: "متوسط" }, { value: "lg", label: "كبير" }, { value: "xl", label: "كبير جداً" }]} />
      </Field>
    </div>
  );
}

// ── Divider Settings ──────────────────────────────────────────────────────────
function DividerSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Field label="النمط">
        <Select value={String(s.style ?? "gradient")} onChange={v => set("style", v)} options={[{ value: "line", label: "خط" }, { value: "gradient", label: "تدرج" }, { value: "dots", label: "نقاط" }, { value: "wave", label: "موجة" }]} />
      </Field>
      <Field label="المسافة">
        <Select value={String(s.spacing ?? "md")} onChange={v => set("spacing", v)} options={[{ value: "sm", label: "صغيرة" }, { value: "md", label: "متوسطة" }, { value: "lg", label: "كبيرة" }]} />
      </Field>
    </div>
  );
}

// ── Spacer Settings ───────────────────────────────────────────────────────────
function SpacerSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Range label="الارتفاع" value={Number(s.height ?? 60)} onChange={v => set("height", v)} min={20} max={300} step={10} unit="px" />
      <Toggle value={Boolean(s.showLine)} onChange={v => set("showLine", v)} label="إظهار خط منقط" />
    </div>
  );
}

// ── Leaderboard Settings ──────────────────────────────────────────────────────
function LeaderboardSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
      <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
      <Field label="عدد المستخدمين">
        <Select value={String(s.count ?? 10)} onChange={v => set("count", parseInt(v))} options={[{ value: "5", label: "5" }, { value: "10", label: "10" }, { value: "20", label: "20" }]} />
      </Field>
    </div>
  );
}

// ── Categories Settings ───────────────────────────────────────────────────────
function CategoriesSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const items = (s.items as Array<{ name: string; icon: string; color: string; href: string; count: string }>) ?? [];
  return (
    <div className="space-y-4">
      <Section title="العناوين">
        <Field label="العنوان"><Input value={String(s.title ?? "")} onChange={v => set("title", v)} /></Field>
        <Field label="العنوان الفرعي"><Input value={String(s.subtitle ?? "")} onChange={v => set("subtitle", v)} /></Field>
      </Section>
      <Section title="التصنيفات">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs dark:text-slate-400 text-slate-500">تصنيف {i + 1}</p>
              <button onClick={() => set("items", items.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <Input value={item.name} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="Python" />
            <Input value={item.count ?? ""} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, count: v } : x))} placeholder="10 كورسات" />
            <Input value={item.href ?? ""} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, href: v } : x))} placeholder="/courses?cat=python" dir="ltr" />
            <ColorRow value={item.color} onChange={v => set("items", items.map((x, j) => j === i ? { ...x, color: v } : x))} />
          </div>
        ))}
        <button onClick={() => set("items", [...items, { name: "تصنيف جديد", icon: "Code2", color: "cyan", href: "#", count: "" }])}
          className="w-full py-2 rounded-xl border-dashed border dark:border-white/10 border-slate-200 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" /> إضافة تصنيف
        </button>
      </Section>
    </div>
  );
}

// ── Browser Block Settings (shared base) ──────────────────────────────────────
function BrowserHeaderSettings({
  s, set, badgePlaceholder, categoriesLabel, extraFields,
}: {
  s: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
  badgePlaceholder: string;
  categoriesLabel: string;
  extraFields?: React.ReactNode;
}) {
  const cats = Array.isArray(s.categories) ? (s.categories as string[]).join("،") : "";
  return (
    <div className="space-y-4">
      <Section title="رأس الصفحة">
        <Field label="الشارة (Badge)"><Input value={String(s.badge ?? "")} onChange={v => set("badge", v)} placeholder={badgePlaceholder} /></Field>
        <Field label="العنوان الرئيسي"><Input value={String(s.headerTitle ?? "")} onChange={v => set("headerTitle", v)} /></Field>
        <Field label="العنوان الفرعي"><Textarea value={String(s.headerSubtitle ?? "")} onChange={v => set("headerSubtitle", v)} rows={2} /></Field>
      </Section>
      <Section title={categoriesLabel}>
        <Field label="التصنيفات (مفصولة بفاصلة عربية ،)">
          <Textarea value={cats} onChange={v => set("categories", v.split("،").map((c: string) => c.trim()).filter(Boolean))} rows={3} placeholder="Python،JavaScript،React" />
        </Field>
      </Section>
      {extraFields}
    </div>
  );
}

function CoursesBrowserSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <BrowserHeaderSettings s={s} set={set} badgePlaceholder="📚 الكورسات" categoriesLabel="التصنيفات"
      extraFields={
        <Section title="خيارات إضافية">
          <Toggle value={s.showLevelFilter !== false} onChange={v => set("showLevelFilter", v)} label="إظهار فلتر المستوى" />
          <Toggle value={s.showSortOptions !== false} onChange={v => set("showSortOptions", v)} label="إظهار خيارات الترتيب" />
          <Field label="عدد الكورسات في الصفحة">
            <Select value={String(s.pageSize ?? 12)} onChange={v => set("pageSize", parseInt(v))}
              options={[{ value: "6", label: "6" }, { value: "12", label: "12" }, { value: "24", label: "24" }]} />
          </Field>
        </Section>
      }
    />
  );
}

function ArticlesBrowserSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <BrowserHeaderSettings s={s} set={set} badgePlaceholder="📰 المقالات" categoriesLabel="التصنيفات"
      extraFields={
        <Section title="خيارات إضافية">
          <Toggle value={s.showFeatured !== false} onChange={v => set("showFeatured", v)} label="إظهار المقالات المميزة" />
        </Section>
      }
    />
  );
}

function ProblemsBrowserSettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const langs = Array.isArray(s.languages) ? (s.languages as string[]).join("،") : "";
  return (
    <div className="space-y-4">
      <Section title="رأس الصفحة">
        <Field label="الشارة (Badge)"><Input value={String(s.badge ?? "")} onChange={v => set("badge", v)} placeholder="💻 التحديات" /></Field>
        <Field label="العنوان الرئيسي"><Input value={String(s.headerTitle ?? "")} onChange={v => set("headerTitle", v)} /></Field>
        <Field label="العنوان الفرعي"><Textarea value={String(s.headerSubtitle ?? "")} onChange={v => set("headerSubtitle", v)} rows={2} /></Field>
      </Section>
      <Section title="لغات البرمجة">
        <Field label="اللغات (مفصولة بفاصلة عربية ،)">
          <Textarea value={langs} onChange={v => set("languages", v.split("،").map((l: string) => l.trim()).filter(Boolean))} rows={3} placeholder="Python،JavaScript،C++" />
        </Field>
      </Section>
      <Section title="خيارات إضافية">
        <Toggle value={s.showStats !== false} onChange={v => set("showStats", v)} label="إظهار إحصائيات الصعوبة" />
        <Toggle value={s.showAiChallenge !== false} onChange={v => set("showAiChallenge", v)} label="إظهار تحدي الذكاء الاصطناعي" />
      </Section>
    </div>
  );
}

// ── Cloud IDE Settings ────────────────────────────────────────────────────────
function CloudIDESettings({ s, set }: { s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Section title="العنوان">
        <Toggle value={s.showTitle !== false} onChange={v => set("showTitle", v)} label="إظهار عنوان البلوك" />
        <Field label="عنوان البلوك">
          <Input value={String(s.title ?? "Cloud IDE — محرر الكود")} onChange={v => set("title", v)} />
        </Field>
      </Section>
      <Section title="الإعدادات">
        <Field label="ارتفاع المحرر">
          <div className="flex gap-2" dir="ltr">
            <input
              type="number"
              value={String(s.editorHeight ?? 520)}
              onChange={e => set("editorHeight", Number(e.target.value) || 520)}
              placeholder="520"
              className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <select
              value={String(s.editorHeightUnit ?? "px")}
              onChange={e => set("editorHeightUnit", e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="px">px</option>
              <option value="vh">vh</option>
              <option value="%">%</option>
              <option value="em">em</option>
              <option value="rem">rem</option>
            </select>
          </div>
        </Field>
        <Field label="لغة افتراضية">
          <Select
            value={String(s.defaultLanguage ?? "javascript")}
            onChange={v => set("defaultLanguage", v)}
            options={[
              { value: "javascript", label: "JavaScript" },
              { value: "typescript", label: "TypeScript" },
              { value: "html", label: "HTML" },
              { value: "css", label: "CSS" },
              { value: "python", label: "Python" },
            ]}
          />
        </Field>
      </Section>
    </div>
  );
}

// ── Main BlockSettings Dispatcher ─────────────────────────────────────────────
export function BlockSettings({ block, onChange }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...block.settings, [k]: v });
  const s = block.settings;

  switch (block.type) {
    case "hero": return <HeroSettings s={s} set={set} />;
    case "stats": return <StatsSettings s={s} set={set} />;
    case "features": return <FeaturesSettings s={s} set={set} />;
    case "courses_grid": return <GridSettings s={s} set={set} type="courses_grid" />;
    case "courses_browser": return <CoursesBrowserSettings s={s} set={set} />;
    case "challenges_grid": return <GridSettings s={s} set={set} type="challenges_grid" />;
    case "problems_browser": return <ProblemsBrowserSettings s={s} set={set} />;
    case "articles_grid": return <GridSettings s={s} set={set} type="articles_grid" />;
    case "articles_browser": return <ArticlesBrowserSettings s={s} set={set} />;
    case "users_grid": return <UsersGridSettings s={s} set={set} />;
    case "leaderboard": return <LeaderboardSettings s={s} set={set} />;
    case "cta": return <CtaSettings s={s} set={set} />;
    case "cards": return <CardsSettings s={s} set={set} />;
    case "categories": return <CategoriesSettings s={s} set={set} />;
    case "testimonials": return <TestimonialsSettings s={s} set={set} />;
    case "faq": return <FaqSettings s={s} set={set} />;
    case "pricing": return <PricingSettings s={s} set={set} />;
    case "rich_text": return <RichTextSettings s={s} set={set} />;
    case "code_block": return <CodeBlockSettings s={s} set={set} />;
    case "video_embed": return <VideoEmbedSettings s={s} set={set} />;
    case "image_banner": return <ImageBannerSettings s={s} set={set} />;
    case "countdown": return <CountdownSettings s={s} set={set} />;
    case "mascot_section": return <MascotSectionSettings s={s} set={set} />;
    case "animation": return <AnimationSettings s={s} set={set} />;
    case "text": return <TextSettings s={s} set={set} />;
    case "divider": return <DividerSettings s={s} set={set} />;
    case "spacer": return <SpacerSettings s={s} set={set} />;
    case "cloud_ide": return <CloudIDESettings s={s} set={set} />;
    default: return <p className="text-sm dark:text-slate-400 text-slate-500 text-center py-4">لا توجد إعدادات لهذا البلوك</p>;
  }
}

export default BlockSettings;
