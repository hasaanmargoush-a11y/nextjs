"use client";

import { useState } from "react";
import { Copy, Check, Rocket } from "lucide-react";

interface Props {
  code: string;
  language?: string;
  title?: string;
  showTryIt?: boolean;
}

export default function SchoolCodeBlock({ code, language = "html", title, showTryIt = true }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTryIt = () => {
    const params = new URLSearchParams({ school_code: code, school_lang: language });
    window.open(`/cloud-ide?${params.toString()}`, "_blank");
  };

  const lines = code.split("\n");

  return (
    /* Force LTR via both attribute and inline style for full cross-browser override */
    <div
      dir="ltr"
      style={{ direction: "ltr", unicodeBidi: "isolate" }}
      className="rounded-xl overflow-hidden my-4 border dark:border-white/10 border-slate-200 shadow-lg shadow-black/20"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 dark:bg-[#111827] bg-slate-100 border-b dark:border-white/10 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#28c840] inline-block" />
          </div>
          <span className="text-xs dark:text-slate-400 text-slate-500 dark:bg-white/5 bg-black/5 px-2 py-0.5 rounded-md font-mono">
            {title || language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showTryIt && (
            <button
              onClick={handleTryIt}
              className="flex items-center gap-1.5 text-xs gradient-bg text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              <Rocket size={11} />
              جرب بنفسك
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs dark:text-slate-400 text-slate-500 dark:bg-white/5 bg-slate-200 hover:dark:bg-white/10 hover:bg-slate-300 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "تم" : "نسخ"}
          </button>
        </div>
      </div>

      {/* Code — strictly LTR with inline style override */}
      <div
        className="overflow-x-auto dark:bg-[#0d1117] bg-[#f8fafc]"
        style={{ direction: "ltr" }}
      >
        <table
          className="w-full text-sm font-mono border-collapse"
          style={{ direction: "ltr" }}
        >
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="dark:hover:bg-white/[0.025] hover:bg-slate-50">
                {/* Line number — LEFT column in LTR */}
                <td
                  className="select-none text-right pr-3 pl-2 py-0.5 dark:text-slate-600 text-slate-400 text-xs border-r dark:border-white/5 border-slate-200 tabular-nums"
                  style={{ minWidth: "2.5rem", direction: "ltr", textAlign: "right" }}
                >
                  {i + 1}
                </td>
                {/* Code content — RIGHT column, LTR flow */}
                <td
                  className="px-4 py-0.5 dark:text-slate-200 text-slate-700 whitespace-pre"
                  style={{ direction: "ltr", textAlign: "left" }}
                >
                  {line || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
