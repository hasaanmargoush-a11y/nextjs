"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";

import {
  BookOpen, Users, Zap, Trophy, Brain, Star, Code2, Globe,
  BarChart2, ArrowLeft, CheckCircle2, Layers, ChevronDown,
  Quote, List, Heading1, Heading2, Heading3, Minus, Play,
  Clock, Copy, Check,
} from "lucide-react";

const CloudIDELazy = dynamic(
  () => import("./CloudIDEBlock").then(m => ({ default: m.CloudIDEBlock })),
  { ssr: false }
);

interface Block {
  id: number;
  type: string;
  settings: Record<string, unknown>;
}

const COLOR_MAP: Record<string, string> = {
  cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 text-cyan-400",
  violet: "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400",
  amber: "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400",
  green: "from-green-500/20 to-green-600/10 border-green-500/20 text-green-400",
  rose: "from-rose-500/20 to-rose-600/10 border-rose-500/20 text-rose-400",
  blue: "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400",
};

type IconComponent = React.FC<{ className?: string }>;
const ICON_MAP: Record<string, IconComponent> = {
  BookOpen, Users, Zap, Trophy, Brain, Star, Code2, Globe,
  BarChart2, CheckCircle2, Layers, Quote, List,
};

function Icon({ name, className }: { name: unknown; className: string }) {
  const C = ICON_MAP[String(name ?? "")] ?? Star;
  return <C className={className} />;
}

const str = (v: unknown) => String(v ?? "");
const b = (v: unknown) => Boolean(v);
const num = (v: unknown, def = 0) => Number(v ?? def);

const PARTICLES_STATIC = [
  { left: 10, top: 15, dur: 4.2, del: 0 }, { left: 25, top: 40, dur: 5.1, del: 0.5 },
  { left: 45, top: 20, dur: 3.8, del: 1 }, { left: 60, top: 60, dur: 6.0, del: 0.3 },
  { left: 75, top: 30, dur: 4.5, del: 1.5 }, { left: 85, top: 75, dur: 3.5, del: 0.8 },
  { left: 15, top: 80, dur: 5.5, del: 0.2 }, { left: 35, top: 55, dur: 4.8, del: 1.2 },
  { left: 55, top: 85, dur: 3.9, del: 0.7 }, { left: 90, top: 45, dur: 5.2, del: 1.8 },
  { left: 5, top: 50, dur: 4.1, del: 0.4 }, { left: 70, top: 10, dur: 6.3, del: 2.0 },
  { left: 30, top: 70, dur: 4.7, del: 0.9 }, { left: 50, top: 35, dur: 5.8, del: 1.4 },
  { left: 80, top: 20, dur: 3.6, del: 0.6 }, { left: 20, top: 90, dur: 4.9, del: 1.7 },
];

const CODE_SNIPPETS = [
  "const sum = (a, b) => a + b", "function hello() {}", "import React from 'react'",
  "let x = 42", "console.log('hello')", "return <div/>", "useState(null)",
  "async/await", "for (let i=0; i<n; i++)", "arr.map(x => x*2)",
  "if (a > b) return a", "export default App", "npm install", "git commit -m",
];

// ── Mascot SVGs ─────────────────────────────────────────────────────────────
function RobotMascot({ size = 120, color = "#06b6d4" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 120 168" fill="none">
      <defs>
        <linearGradient id="rBodyGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35"/><stop offset="100%" stopColor={color} stopOpacity="0.06"/></linearGradient>
        <radialGradient id="rEyeGrad" cx="30%" cy="25%"><stop offset="0%" stopColor="white"/><stop offset="35%" stopColor={color}/><stop offset="100%" stopColor={color} stopOpacity="0.2"/></radialGradient>
        <filter id="rGlow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <line x1="60" y1="2" x2="60" y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="60" cy="2" r="6" fill={color} filter="url(#rGlow)" opacity="0.9"/>
      <rect x="18" y="20" width="84" height="60" rx="18" fill="url(#rBodyGrad)" stroke={color} strokeWidth="2"/>
      <rect x="24" y="26" width="72" height="48" rx="12" fill="#050c1a" opacity="0.7"/>
      <circle cx="42" cy="44" r="12" fill="#080d1a" stroke={color} strokeWidth="1.5"/>
      <circle cx="78" cy="44" r="12" fill="#080d1a" stroke={color} strokeWidth="1.5"/>
      <circle cx="42" cy="44" r="7.5" fill="url(#rEyeGrad)" filter="url(#rGlow)"/>
      <circle cx="78" cy="44" r="7.5" fill="url(#rEyeGrad)" filter="url(#rGlow)"/>
      <circle cx="38.5" cy="40.5" r="2.5" fill="white" opacity="0.95"/>
      <circle cx="74.5" cy="40.5" r="2.5" fill="white" opacity="0.95"/>
      <rect x="30" y="62" width="60" height="10" rx="5" fill="#050c1a" stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
      <rect x="34" y="64" width="11" height="6" rx="3" fill={color} opacity="0.9"/>
      <rect x="50" y="64" width="11" height="6" rx="3" fill="#8b5cf6" opacity="0.9"/>
      <rect x="66" y="64" width="11" height="6" rx="3" fill={color} opacity="0.9"/>
      <rect x="46" y="80" width="28" height="10" rx="5" fill="#1a2440"/>
      <rect x="8" y="90" width="104" height="68" rx="20" fill="url(#rBodyGrad)" stroke={color} strokeWidth="2"/>
      <rect x="16" y="98" width="88" height="52" rx="12" fill="#050c1a" opacity="0.8"/>
      <text x="24" y="114" fontSize="6.5" fill={color} fontFamily="monospace" opacity="0.95">{"const nova = {learn:∞}"}</text>
      <text x="24" y="124" fontSize="6.5" fill="#8b5cf6" fontFamily="monospace" opacity="0.9">{"  think: () => ∞"}</text>
      <text x="24" y="134" fontSize="6.5" fill="#22c55e" fontFamily="monospace" opacity="0.9">{"> compiled ✓"}</text>
      <rect x="-4" y="95" width="16" height="50" rx="8" fill="url(#rBodyGrad)" stroke={color} strokeWidth="1.5"/>
      <rect x="108" y="95" width="16" height="50" rx="8" fill="url(#rBodyGrad)" stroke={color} strokeWidth="1.5"/>
      <circle cx="4" cy="150" r="8" fill="#1a2440" stroke={color} strokeWidth="1.5"/>
      <circle cx="116" cy="150" r="8" fill="#1a2440" stroke={color} strokeWidth="1.5"/>
      <rect x="24" y="155" width="30" height="12" rx="6" fill="#1a2440" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      <rect x="66" y="155" width="30" height="12" rx="6" fill="#1a2440" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      <ellipse cx="39" cy="168" rx="20" ry="4" fill={color} opacity="0.25"/>
      <ellipse cx="81" cy="168" rx="20" ry="4" fill={color} opacity="0.25"/>
    </svg>
  );
}

function AstronautMascot({ size = 120, color = "#8b5cf6" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 120 168" fill="none">
      <defs>
        <radialGradient id="aHelmet" cx="35%" cy="30%"><stop offset="0%" stopColor="white" stopOpacity="0.25"/><stop offset="60%" stopColor={color} stopOpacity="0.1"/><stop offset="100%" stopColor={color} stopOpacity="0"/></radialGradient>
        <linearGradient id="aSuit" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#2a3a5e"/><stop offset="100%" stopColor="#0f1a30"/></linearGradient>
        <filter id="aGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="60" cy="40" r="36" fill="url(#aSuit)" stroke={color} strokeWidth="2.5"/>
      <circle cx="60" cy="40" r="26" fill="#080e1f"/>
      <circle cx="60" cy="40" r="26" fill="url(#aHelmet)"/>
      <circle cx="50" cy="36" r="5" fill={color} opacity="0.85" filter="url(#aGlow)"/>
      <circle cx="70" cy="36" r="5" fill={color} opacity="0.85" filter="url(#aGlow)"/>
      <path d="M48 50 Q60 58 72 50" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="60" cy="113" rx="37" ry="47" fill="url(#aSuit)" stroke={color} strokeWidth="2"/>
      <rect x="34" y="80" width="52" height="32" rx="10" fill={`${color}25`} stroke={color} strokeWidth="1.5"/>
      <circle cx="60" cy="96" r="10" fill={`${color}40`} stroke={color} strokeWidth="1.5" filter="url(#aGlow)"/>
      <circle cx="60" cy="96" r="5" fill={color} opacity="0.5"/>
      <rect x="6" y="82" width="22" height="38" rx="11" fill="url(#aSuit)" stroke={color} strokeWidth="2"/>
      <rect x="92" y="82" width="22" height="38" rx="11" fill="url(#aSuit)" stroke={color} strokeWidth="2"/>
      <ellipse cx="17" cy="122" rx="11" ry="8" fill={color} opacity="0.4"/>
      <ellipse cx="103" cy="122" rx="11" ry="8" fill={color} opacity="0.4"/>
      <rect x="36" y="152" width="22" height="16" rx="7" fill="url(#aSuit)" stroke={color} strokeWidth="1.5"/>
      <rect x="62" y="152" width="22" height="16" rx="7" fill="url(#aSuit)" stroke={color} strokeWidth="1.5"/>
      <ellipse cx="47" cy="168" rx="16" ry="4" fill={color} opacity="0.3"/>
      <ellipse cx="73" cy="168" rx="16" ry="4" fill={color} opacity="0.3"/>
      <circle cx="95" cy="14" r="5" fill={color} opacity="0.7" filter="url(#aGlow)"/>
      <circle cx="108" cy="26" r="3" fill={color} opacity="0.45"/>
      <circle cx="88" cy="6" r="2" fill={color} opacity="0.55"/>
      <circle cx="16" cy="20" r="2.5" fill={color} opacity="0.4"/>
    </svg>
  );
}

function CoderMascot({ size = 120, color = "#f59e0b" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 120 168" fill="none">
      <defs>
        <linearGradient id="cFace" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0.08"/></linearGradient>
        <linearGradient id="cLaptop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e2a40"/><stop offset="100%" stopColor="#0a0f1e"/></linearGradient>
        <filter id="cGlow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="60" cy="30" r="26" fill="url(#cFace)" stroke={color} strokeWidth="2"/>
      <circle cx="51" cy="27" r="4" fill="#050c1a"/>
      <circle cx="69" cy="27" r="4" fill="#050c1a"/>
      <circle cx="51" cy="27" r="2.2" fill={color} opacity="0.9"/>
      <circle cx="69" cy="27" r="2.2" fill={color} opacity="0.9"/>
      <circle cx="49.5" cy="25.5" r="1" fill="white" opacity="0.9"/>
      <circle cx="67.5" cy="25.5" r="1" fill="white" opacity="0.9"/>
      <path d="M49 36 Q60 43 71 36" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="38" cy="26" r="4" fill={`${color}44`}/>
      <path d="M34 34 Q36 30 38 26 Q41 21 46 19" stroke={color} strokeWidth="1.5" fill="none" opacity="0.6"/>
      <rect x="10" y="55" width="100" height="68" rx="12" fill="url(#cLaptop)" stroke={color} strokeWidth="1.5"/>
      <rect x="16" y="61" width="88" height="56" rx="8" fill="#050c1a"/>
      <text x="22" y="76" fontSize="6" fill={color} fontFamily="monospace" opacity="0.95">{"function master() {"}</text>
      <text x="22" y="86" fontSize="6" fill="#8b5cf6" fontFamily="monospace" opacity="0.9">{"  const skill=Infinity"}</text>
      <text x="22" y="96" fontSize="6" fill="#22c55e" fontFamily="monospace" opacity="0.9">{"  while(alive) build()"}</text>
      <text x="22" y="106" fontSize="6" fill={color} fontFamily="monospace" opacity="0.85">{"}"}</text>
      <rect x="98" y="100" width="2" height="9" rx="1" fill={color} filter="url(#cGlow)"/>
      <rect x="4" y="55" width="14" height="65" rx="7" fill={`${color}35`} stroke={color} strokeWidth="1.5"/>
      <rect x="102" y="55" width="14" height="65" rx="7" fill={`${color}35`} stroke={color} strokeWidth="1.5"/>
      <rect x="32" y="123" width="56" height="40" rx="10" fill="url(#cLaptop)" stroke={color} strokeWidth="1.5"/>
      <rect x="40" y="132" width="40" height="22" rx="5" fill="#050c1a"/>
      <circle cx="60" cy="153" r="6" fill={color} filter="url(#cGlow)" opacity="0.8"/>
      <rect x="22" y="155" width="20" height="12" rx="6" fill="#1a2440"/>
      <rect x="78" y="155" width="20" height="12" rx="6" fill="#1a2440"/>
      <ellipse cx="32" cy="167" rx="14" ry="3.5" fill={color} opacity="0.25"/>
      <ellipse cx="88" cy="167" rx="14" ry="3.5" fill={color} opacity="0.25"/>
    </svg>
  );
}

function AlienMascot({ size = 120, color = "#22c55e" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 120 144" fill="none">
      <defs>
        <radialGradient id="alHead" cx="40%" cy="30%"><stop offset="0%" stopColor={color} stopOpacity="0.4"/><stop offset="100%" stopColor={color} stopOpacity="0.08"/></radialGradient>
        <radialGradient id="alEye" cx="30%" cy="25%"><stop offset="0%" stopColor="white"/><stop offset="30%" stopColor={color}/><stop offset="100%" stopColor={color} stopOpacity="0.3"/></radialGradient>
        <filter id="alGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="60" cy="37" rx="40" ry="35" fill="url(#alHead)" stroke={color} strokeWidth="2"/>
      <ellipse cx="42" cy="31" rx="13" ry="18" fill="#050c1a"/>
      <ellipse cx="78" cy="31" rx="13" ry="18" fill="#050c1a"/>
      <ellipse cx="42" cy="31" rx="9" ry="12" fill="url(#alEye)" filter="url(#alGlow)"/>
      <ellipse cx="78" cy="31" rx="9" ry="12" fill="url(#alEye)" filter="url(#alGlow)"/>
      <ellipse cx="42" cy="31" rx="4.5" ry="6" fill="#050c1a"/>
      <ellipse cx="78" cy="31" rx="4.5" ry="6" fill="#050c1a"/>
      <ellipse cx="40" cy="28" r="2.5" fill="white" opacity="0.9"/>
      <ellipse cx="76" cy="28" r="2.5" fill="white" opacity="0.9"/>
      <path d="M46 56 Q60 64 74 56" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <line x1="26" y1="13" x2="16" y2="2" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="16" cy="2" r="4" fill={color} filter="url(#alGlow)" opacity="0.9"/>
      <line x1="94" y1="13" x2="104" y2="2" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="104" cy="2" r="4" fill={color} filter="url(#alGlow)" opacity="0.9"/>
      <ellipse cx="60" cy="104" rx="35" ry="38" fill="#0f1f15" stroke={color} strokeWidth="2"/>
      <ellipse cx="60" cy="96" rx="18" ry="14" fill={`${color}20`} stroke={color} strokeWidth="1.5"/>
      <circle cx="60" cy="96" r="6" fill={color} opacity="0.4" filter="url(#alGlow)"/>
      <line x1="27" y1="76" x2="5" y2="92" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="5" cy="94" r="7" fill={`${color}50`} stroke={color} strokeWidth="1.5" filter="url(#alGlow)"/>
      <line x1="93" y1="76" x2="115" y2="92" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="115" cy="94" r="7" fill={`${color}50`} stroke={color} strokeWidth="1.5" filter="url(#alGlow)"/>
      <ellipse cx="60" cy="140" rx="20" ry="4.5" fill={color} opacity="0.3"/>
    </svg>
  );
}

function DragonMascot({ size = 120, color = "#ef4444" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.35} viewBox="0 0 120 162" fill="none">
      <defs>
        <linearGradient id="dgHead" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.5"/><stop offset="100%" stopColor="#7c0000" stopOpacity="0.8"/></linearGradient>
        <radialGradient id="dgEye" cx="30%" cy="25%"><stop offset="0%" stopColor="#ffff00"/><stop offset="50%" stopColor={color}/><stop offset="100%" stopColor="#300"/></radialGradient>
        <radialGradient id="dgFire" cx="50%" cy="100%"><stop offset="0%" stopColor="#fff7aa"/><stop offset="30%" stopColor="#f59e0b"/><stop offset="70%" stopColor={color}/><stop offset="100%" stopColor="transparent"/></radialGradient>
        <filter id="dgGlow"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Horns */}
      <path d="M38 22 L28 2 L36 18" fill={color} opacity="0.8"/>
      <path d="M56 16 L50 0 L56 14" fill={color} opacity="0.7"/>
      {/* Head */}
      <path d="M20 55 Q15 35 30 20 Q45 8 70 12 Q90 16 95 38 Q100 55 88 68 Q75 82 50 80 Q28 78 20 55Z" fill="url(#dgHead)" stroke={color} strokeWidth="2"/>
      {/* Scale pattern */}
      <path d="M35 35 Q42 30 48 35" stroke={color} strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M52 28 Q59 23 65 28" stroke={color} strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M42 48 Q50 43 57 48" stroke={color} strokeWidth="1" fill="none" opacity="0.4"/>
      {/* Eye */}
      <ellipse cx="68" cy="38" rx="14" ry="12" fill="#0a0000"/>
      <ellipse cx="68" cy="38" rx="9" ry="8" fill="url(#dgEye)" filter="url(#dgGlow)"/>
      <ellipse cx="68" cy="38" rx="4" ry="5" fill="#050000"/>
      <ellipse cx="65" cy="35" rx="2" ry="2.5" fill="white" opacity="0.85"/>
      {/* Nostril */}
      <ellipse cx="88" cy="58" rx="4" ry="2.5" fill="#0a0000" opacity="0.7"/>
      <ellipse cx="82" cy="62" rx="3" ry="2" fill="#0a0000" opacity="0.6"/>
      {/* Mouth / jaw */}
      <path d="M30 65 Q50 80 82 72" stroke={color} strokeWidth="2" fill="none" opacity="0.6"/>
      <path d="M34 68 L38 76 M44 72 L46 80 M54 74 L55 82 M64 73 L64 80" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      {/* Neck & Body */}
      <path d="M25 75 Q10 95 12 120 Q14 145 40 155 Q65 164 90 150 Q112 138 108 110 Q104 82 88 72" fill="url(#dgHead)" stroke={color} strokeWidth="2"/>
      {/* Wing left */}
      <path d="M15 90 Q-10 70 -5 40 Q0 20 20 30 Q15 55 25 80Z" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5"/>
      <path d="M15 90 Q5 75 8 55" stroke={color} strokeWidth="1" fill="none" opacity="0.5"/>
      {/* Wing right */}
      <path d="M105 88 Q130 65 125 35 Q120 12 100 24 Q108 50 96 78Z" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5"/>
      {/* Tail */}
      <path d="M40 155 Q20 160 10 148 Q0 136 15 130" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round"/>
      {/* Fire breath */}
      <ellipse cx="60" cy="158" rx="28" ry="14" fill="url(#dgFire)" filter="url(#dgGlow)" opacity="0.85"/>
      <ellipse cx="60" cy="162" rx="16" ry="8" fill="#fff7aa" opacity="0.6" filter="url(#dgGlow)"/>
    </svg>
  );
}

function WizardMascot({ size = 120, color = "#8b5cf6" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.45} viewBox="0 0 120 174" fill="none">
      <defs>
        <linearGradient id="wzRobe" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.5"/><stop offset="100%" stopColor={color} stopOpacity="0.12"/></linearGradient>
        <radialGradient id="wzOrb" cx="35%" cy="30%"><stop offset="0%" stopColor="white"/><stop offset="40%" stopColor={color}/><stop offset="100%" stopColor={color} stopOpacity="0.2"/></radialGradient>
        <filter id="wzGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="wzGlow2"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Hat */}
      <path d="M60 2 L35 52 L85 52Z" fill={color} opacity="0.85"/>
      <ellipse cx="60" cy="52" rx="28" ry="7" fill={color} opacity="0.7"/>
      {/* Hat stars */}
      <text x="48" y="30" fontSize="8" fill="white" opacity="0.8">✦</text>
      <text x="62" y="42" fontSize="6" fill="white" opacity="0.6">✦</text>
      {/* Face */}
      <circle cx="60" cy="70" r="22" fill="#f5e6c8" stroke={`${color}66`} strokeWidth="1.5"/>
      <circle cx="52" cy="66" r="4" fill="#3d2a14"/>
      <circle cx="68" cy="66" r="4" fill="#3d2a14"/>
      <circle cx="51" cy="64.5" r="1.5" fill="white" opacity="0.8"/>
      <circle cx="67" cy="64.5" r="1.5" fill="white" opacity="0.8"/>
      <path d="M52 78 Q60 84 68 78" stroke="#8b5c3a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Beard */}
      <path d="M42 82 Q45 100 60 104 Q75 100 78 82" fill="white" opacity="0.85"/>
      <path d="M48 84 L46 102 M54 85 L53 106 M60 85 L60 107 M66 85 L67 106 M72 84 L74 102" stroke="#e0d5c0" strokeWidth="1" opacity="0.5"/>
      {/* Robe */}
      <path d="M30 100 Q20 130 18 165 L102 165 Q100 130 90 100 Q75 92 60 91 Q45 92 30 100Z" fill="url(#wzRobe)" stroke={color} strokeWidth="1.5"/>
      {/* Robe details */}
      <path d="M60 110 L60 160" stroke={color} strokeWidth="1" opacity="0.4"/>
      <path d="M40 120 Q60 116 80 120" stroke={color} strokeWidth="1" opacity="0.3"/>
      <path d="M36 135 Q60 130 84 135" stroke={color} strokeWidth="1" opacity="0.25"/>
      {/* Staff */}
      <line x1="98" y1="56" x2="88" y2="164" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
      <circle cx="100" cy="50" r="14" fill="url(#wzOrb)" filter="url(#wzGlow)" opacity="0.95"/>
      <circle cx="100" cy="50" r="8" fill="white" opacity="0.35"/>
      {/* Magic particles */}
      <circle cx="18" cy="110" r="4" fill={color} filter="url(#wzGlow2)" opacity="0.7"/>
      <circle cx="10" cy="128" r="2.5" fill={color} opacity="0.5"/>
      <circle cx="22" cy="142" r="3" fill="#f59e0b" filter="url(#wzGlow2)" opacity="0.6"/>
      <text x="10" y="98" fontSize="8" fill={color} opacity="0.7" filter="url(#wzGlow2)">✦</text>
      <text x="4" y="115" fontSize="6" fill="#f59e0b" opacity="0.6">✦</text>
      <ellipse cx="60" cy="168" rx="30" ry="5" fill={color} opacity="0.2"/>
    </svg>
  );
}

function PhoenixMascot({ size = 120, color = "#f97316" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.35} viewBox="0 0 120 162" fill="none">
      <defs>
        <linearGradient id="phWing" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#dc2626"/><stop offset="50%" stopColor={color}/><stop offset="100%" stopColor="#fef08a"/></linearGradient>
        <radialGradient id="phCore" cx="50%" cy="50%"><stop offset="0%" stopColor="white"/><stop offset="40%" stopColor="#fef08a"/><stop offset="100%" stopColor={color}/></radialGradient>
        <radialGradient id="phFlame" cx="50%" cy="0%"><stop offset="0%" stopColor="#fef08a" stopOpacity="0.9"/><stop offset="50%" stopColor={color} stopOpacity="0.6"/><stop offset="100%" stopColor="transparent"/></radialGradient>
        <filter id="phGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="phGlow2"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Flame base */}
      <ellipse cx="60" cy="148" rx="36" ry="20" fill="url(#phFlame)" filter="url(#phGlow)" opacity="0.9"/>
      <ellipse cx="60" cy="155" rx="20" ry="10" fill="#fef08a" filter="url(#phGlow)" opacity="0.7"/>
      {/* Left wing lower */}
      <path d="M60 80 Q20 110 2 145 Q22 130 40 118 Q30 135 25 152 Q45 132 55 115Z" fill="url(#phWing)" opacity="0.85"/>
      {/* Right wing lower */}
      <path d="M60 80 Q100 110 118 145 Q98 130 80 118 Q90 135 95 152 Q75 132 65 115Z" fill="url(#phWing)" opacity="0.85"/>
      {/* Left wing upper */}
      <path d="M55 70 Q15 55 0 20 Q20 45 35 55 Q15 30 20 8 Q40 38 48 62Z" fill="url(#phWing)" opacity="0.8"/>
      {/* Right wing upper */}
      <path d="M65 70 Q105 55 120 20 Q100 45 85 55 Q105 30 100 8 Q80 38 72 62Z" fill="url(#phWing)" opacity="0.8"/>
      {/* Tail feathers */}
      <path d="M45 120 Q35 140 30 162" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      <path d="M55 125 Q48 148 46 165" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M65 125 Q72 148 74 165" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M75 120 Q85 140 90 162" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      {/* Body */}
      <ellipse cx="60" cy="82" rx="18" ry="22" fill="url(#phCore)" filter="url(#phGlow2)"/>
      {/* Head */}
      <circle cx="60" cy="55" r="16" fill="url(#phCore)" filter="url(#phGlow2)"/>
      {/* Crest */}
      <path d="M52 44 Q50 30 55 22 Q58 35 60 40" fill="url(#phWing)" opacity="0.9"/>
      <path d="M60 40 Q63 26 68 18 Q70 32 68 40" fill="#fef08a" opacity="0.85"/>
      <path d="M62 42 Q68 30 76 24 Q74 36 70 42" fill="url(#phWing)" opacity="0.8"/>
      {/* Eyes */}
      <circle cx="54" cy="52" r="5" fill="#050000"/>
      <circle cx="54" cy="52" r="3" fill="#fef08a" filter="url(#phGlow2)"/>
      <circle cx="52.5" cy="50.5" r="1.2" fill="white" opacity="0.95"/>
      {/* Beak */}
      <path d="M48 58 L42 62 L48 64Z" fill={color} opacity="0.9"/>
    </svg>
  );
}

function NinjaMascot({ size = 120, color = "#06b6d4" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 120 168" fill="none">
      <defs>
        <linearGradient id="njBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1e293b"/><stop offset="100%" stopColor="#0f172a"/></linearGradient>
        <linearGradient id="njBlade" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="white"/><stop offset="50%" stopColor={color}/><stop offset="100%" stopColor="transparent"/></linearGradient>
        <filter id="njGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Cape/shadow */}
      <path d="M20 80 Q10 120 15 165 L105 165 Q110 120 100 80 Q80 68 60 68 Q40 68 20 80Z" fill={color} opacity="0.12"/>
      {/* Body */}
      <path d="M24 82 Q20 115 22 162 L98 162 Q100 115 96 82 Q80 70 60 70 Q40 70 24 82Z" fill="url(#njBody)"/>
      {/* Chest symbol */}
      <text x="47" y="118" fontSize="22" fill={color} opacity="0.6" fontFamily="monospace" filter="url(#njGlow)">忍</text>
      {/* Arms */}
      <rect x="2" y="82" width="24" height="56" rx="10" fill="url(#njBody)"/>
      <rect x="94" y="82" width="24" height="56" rx="10" fill="url(#njBody)"/>
      {/* Gloves */}
      <ellipse cx="14" cy="142" rx="12" ry="9" fill="#111827"/>
      <ellipse cx="106" cy="142" rx="12" ry="9" fill="#111827"/>
      {/* Head */}
      <circle cx="60" cy="44" r="28" fill="url(#njBody)"/>
      {/* Mask */}
      <rect x="36" y="36" width="48" height="20" rx="6" fill="#111827"/>
      {/* Eyes */}
      <ellipse cx="50" cy="46" rx="7" ry="5" fill="#050c1a"/>
      <ellipse cx="70" cy="46" rx="7" ry="5" fill="#050c1a"/>
      <ellipse cx="50" cy="46" rx="5" ry="3.5" fill={color} filter="url(#njGlow)" opacity="0.9"/>
      <ellipse cx="70" cy="46" rx="5" ry="3.5" fill={color} filter="url(#njGlow)" opacity="0.9"/>
      <ellipse cx="48" cy="44.5" r="1.5" fill="white" opacity="0.9"/>
      <ellipse cx="68" cy="44.5" r="1.5" fill="white" opacity="0.9"/>
      {/* Headband */}
      <rect x="34" y="30" width="52" height="8" rx="3" fill={color} opacity="0.7"/>
      <rect x="56" y="28" width="8" height="12" rx="2" fill={color} opacity="0.5"/>
      {/* Katana */}
      <rect x="88" y="20" width="4" height="90" rx="2" fill="url(#njBlade)" filter="url(#njGlow)"/>
      <rect x="85" y="80" width="10" height="6" rx="2" fill={color} opacity="0.7"/>
      <rect x="88" y="86" width="4" height="24" rx="2" fill={color} opacity="0.4"/>
      {/* Shuriken */}
      <g transform="translate(8,28) rotate(30)" filter="url(#njGlow)">
        <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6Z" fill={color} opacity="0.8"/>
      </g>
      {/* Belt */}
      <rect x="22" y="110" width="76" height="8" rx="3" fill={color} opacity="0.35"/>
      <rect x="56" y="108" width="8" height="12" rx="2" fill={color} opacity="0.5"/>
      <ellipse cx="60" cy="166" rx="28" ry="4" fill={color} opacity="0.2"/>
    </svg>
  );
}

function CyberCatMascot({ size = 120, color = "#ec4899" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.35} viewBox="0 0 120 162" fill="none">
      <defs>
        <linearGradient id="ccBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1e293b"/><stop offset="100%" stopColor="#0f172a"/></linearGradient>
        <radialGradient id="ccEye" cx="30%" cy="25%"><stop offset="0%" stopColor="white"/><stop offset="35%" stopColor={color}/><stop offset="100%" stopColor={color} stopOpacity="0.2"/></radialGradient>
        <filter id="ccGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Ears */}
      <path d="M28 28 L22 2 L46 22Z" fill="url(#ccBody)" stroke={color} strokeWidth="1.5"/>
      <path d="M32 26 L28 8 L44 22Z" fill={color} opacity="0.4"/>
      <path d="M92 28 L98 2 L74 22Z" fill="url(#ccBody)" stroke={color} strokeWidth="1.5"/>
      <path d="M88 26 L92 8 L76 22Z" fill={color} opacity="0.4"/>
      {/* Head */}
      <circle cx="60" cy="52" r="34" fill="url(#ccBody)" stroke={color} strokeWidth="2"/>
      {/* Fur markings */}
      <path d="M44 40 Q52 35 60 40 Q68 35 76 40" stroke={color} strokeWidth="1" fill="none" opacity="0.3"/>
      {/* Eyes */}
      <ellipse cx="46" cy="50" rx="11" ry="10" fill="#050c1a"/>
      <ellipse cx="74" cy="50" rx="11" ry="10" fill="#050c1a"/>
      <ellipse cx="46" cy="50" rx="7" ry="7" fill="url(#ccEye)" filter="url(#ccGlow)"/>
      <ellipse cx="74" cy="50" rx="7" ry="7" fill="url(#ccEye)" filter="url(#ccGlow)"/>
      <ellipse cx="46" cy="50" rx="3.5" ry="5" fill="#050c1a"/>
      <ellipse cx="74" cy="50" rx="3.5" ry="5" fill="#050c1a"/>
      <ellipse cx="43.5" cy="47.5" rx="2" ry="2.5" fill="white" opacity="0.95"/>
      <ellipse cx="71.5" cy="47.5" rx="2" ry="2.5" fill="white" opacity="0.95"/>
      {/* Nose */}
      <path d="M56 62 L60 66 L64 62 Q60 60 56 62Z" fill={color} opacity="0.7"/>
      {/* Whiskers */}
      <line x1="22" y1="62" x2="50" y2="66" stroke={color} strokeWidth="1" opacity="0.4"/>
      <line x1="22" y1="68" x2="50" y2="68" stroke={color} strokeWidth="1" opacity="0.35"/>
      <line x1="70" y1="66" x2="98" y2="62" stroke={color} strokeWidth="1" opacity="0.4"/>
      <line x1="70" y1="68" x2="98" y2="68" stroke={color} strokeWidth="1" opacity="0.35"/>
      {/* Cyber collar */}
      <rect x="36" y="82" width="48" height="10" rx="5" fill={color} opacity="0.7"/>
      <rect x="57" y="80" width="6" height="14" rx="2" fill={color} filter="url(#ccGlow)" opacity="0.9"/>
      <text x="42" y="90" fontSize="6" fill="white" fontFamily="monospace" opacity="0.8">NOVA-9</text>
      {/* Body */}
      <ellipse cx="60" cy="124" rx="34" ry="40" fill="url(#ccBody)" stroke={color} strokeWidth="1.5"/>
      {/* Circuit pattern on body */}
      <path d="M40 108 L50 108 L50 118 L70 118 L70 108 L80 108" stroke={color} strokeWidth="1" fill="none" opacity="0.35"/>
      <circle cx="50" cy="118" r="2" fill={color} opacity="0.5"/>
      <circle cx="70" cy="118" r="2" fill={color} opacity="0.5"/>
      {/* Arms */}
      <ellipse cx="18" cy="110" rx="14" ry="30" fill="url(#ccBody)" stroke={color} strokeWidth="1.5" transform="rotate(-10,18,110)"/>
      <ellipse cx="102" cy="110" rx="14" ry="30" fill="url(#ccBody)" stroke={color} strokeWidth="1.5" transform="rotate(10,102,110)"/>
      {/* Paws */}
      <ellipse cx="12" cy="140" rx="12" ry="8" fill="#1e293b" stroke={color} strokeWidth="1.5"/>
      <ellipse cx="108" cy="140" rx="12" ry="8" fill="#1e293b" stroke={color} strokeWidth="1.5"/>
      {/* Tail */}
      <path d="M88 155 Q110 150 118 132 Q122 118 108 115" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round"/>
      <circle cx="108" cy="113" r="5" fill={color} filter="url(#ccGlow)" opacity="0.8"/>
      <ellipse cx="60" cy="162" rx="28" ry="4.5" fill={color} opacity="0.25"/>
    </svg>
  );
}

function CrystalMascot({ size = 120, color = "#06b6d4" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 120 156" fill="none">
      <defs>
        <linearGradient id="crTop" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor={color} stopOpacity="0.9"/><stop offset="100%" stopColor="white" stopOpacity="0.95"/></linearGradient>
        <linearGradient id="crLeft" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.7"/><stop offset="100%" stopColor={color} stopOpacity="0.25"/></linearGradient>
        <linearGradient id="crRight" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.4"/><stop offset="100%" stopColor={color} stopOpacity="0.1"/></linearGradient>
        <linearGradient id="crFront" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="white" stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0.5"/></linearGradient>
        <radialGradient id="crGlow" cx="50%" cy="50%"><stop offset="0%" stopColor={color} stopOpacity="0.8"/><stop offset="100%" stopColor={color} stopOpacity="0"/></radialGradient>
        <filter id="crBlur"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="crGlowF"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Outer glow */}
      <ellipse cx="60" cy="82" rx="50" ry="60" fill="url(#crGlow)" filter="url(#crBlur)" opacity="0.5"/>
      {/* Crystal facets */}
      {/* Top spike */}
      <path d="M60 4 L44 50 L60 42 L76 50Z" fill="url(#crTop)"/>
      <path d="M60 4 L44 50 L60 42Z" fill="white" opacity="0.4"/>
      {/* Upper left facet */}
      <path d="M44 50 L16 84 L44 92 L60 42Z" fill="url(#crLeft)"/>
      {/* Upper right facet */}
      <path d="M76 50 L104 84 L76 92 L60 42Z" fill="url(#crRight)"/>
      {/* Upper front facet */}
      <path d="M44 50 L60 42 L76 50 L76 92 L60 96 L44 92Z" fill="url(#crFront)"/>
      {/* Internal highlight */}
      <path d="M52 46 L56 90" stroke="white" strokeWidth="1.5" opacity="0.3"/>
      <path d="M60 42 L58 90" stroke="white" strokeWidth="1" opacity="0.2"/>
      {/* Lower left facet */}
      <path d="M16 84 L44 92 L60 140 L34 128Z" fill="url(#crLeft)" opacity="0.8"/>
      {/* Lower right facet */}
      <path d="M104 84 L76 92 L60 140 L86 128Z" fill="url(#crRight)" opacity="0.7"/>
      {/* Lower front facet */}
      <path d="M44 92 L76 92 L60 140Z" fill="url(#crFront)" opacity="0.9"/>
      {/* Bottom point */}
      <path d="M34 128 L60 140 L86 128 L60 152Z" fill={color} opacity="0.6"/>
      {/* Inner glow */}
      <ellipse cx="60" cy="85" rx="16" ry="20" fill={color} filter="url(#crGlowF)" opacity="0.4"/>
      {/* Sparkles */}
      <circle cx="28" cy="60" r="3" fill={color} filter="url(#crGlowF)" opacity="0.8"/>
      <circle cx="96" cy="72" r="2.5" fill={color} filter="url(#crGlowF)" opacity="0.7"/>
      <circle cx="18" cy="100" r="2" fill={color} opacity="0.5"/>
      <text x="50" y="72" fontSize="10" fill="white" opacity="0.3" fontFamily="serif">◆</text>
      {/* Ground glow */}
      <ellipse cx="60" cy="152" rx="30" ry="5" fill={color} filter="url(#crGlowF)" opacity="0.4"/>
    </svg>
  );
}

function getMascotComponent(type: string, size: number, color?: string) {
  switch (type) {
    case "robot":      return <RobotMascot size={size} color={color ?? "#06b6d4"} />;
    case "astronaut":  return <AstronautMascot size={size} color={color ?? "#8b5cf6"} />;
    case "coder":      return <CoderMascot size={size} color={color ?? "#f59e0b"} />;
    case "alien":      return <AlienMascot size={size} color={color ?? "#22c55e"} />;
    case "dragon":     return <DragonMascot size={size} color={color ?? "#ef4444"} />;
    case "wizard":     return <WizardMascot size={size} color={color ?? "#8b5cf6"} />;
    case "phoenix":    return <PhoenixMascot size={size} color={color ?? "#f97316"} />;
    case "ninja":      return <NinjaMascot size={size} color={color ?? "#06b6d4"} />;
    case "cyber_cat":  return <CyberCatMascot size={size} color={color ?? "#ec4899"} />;
    case "crystal":    return <CrystalMascot size={size} color={color ?? "#06b6d4"} />;
    default: return null;
  }
}

// ── Animation Backgrounds ────────────────────────────────────────────────────
function AnimationLayer({ type, color = "#06b6d4", count = 20, speed = "normal" }: {
  type: string; color?: string; count?: number; speed?: string;
}) {
  const sm = speed === "slow" ? 1.8 : speed === "fast" ? 0.5 : 1;

  // ─── Classic (kept for backward compat) ───────────────────────────────────
  if (type === "particles") {
    const items = Array.from({ length: Math.min(count, 40) }, (_, i) => ({
      left: (i * 37 + 7) % 100, top: (i * 53 + 13) % 100,
      dur: (3 + (i % 4)) * sm, del: (i % 8) * 0.3, size: 2 + (i % 3),
    }));
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {items.map((p, i) => (
          <motion.div key={i} style={{ left:`${p.left}%`, top:`${p.top}%`, width: p.size*4, height: p.size*4, background: color, borderRadius:"50%", position:"absolute" }}
            animate={{ y:[0,-30,0], opacity:[0.15,0.7,0.15] }} transition={{ duration:p.dur, delay:p.del, repeat:Infinity }} />
        ))}
      </div>
    );
  }

  if (type === "bubbles") {
    const items = Array.from({ length: Math.min(count, 18) }, (_, i) => ({
      left:(i*47+5)%90, dur:(4+(i%5))*sm, del:(i%6)*0.6, size:10+(i%4)*10,
    }));
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {items.map((p,i) => (
          <motion.div key={i} style={{ left:`${p.left}%`, bottom:"-80px", width:p.size, height:p.size, border:`2px solid ${color}55`, borderRadius:"50%", position:"absolute", background:`${color}08` }}
            animate={{ y:[0,-500], opacity:[0.5,0] }} transition={{ duration:p.dur, delay:p.del, repeat:Infinity }} />
        ))}
      </div>
    );
  }

  if (type === "waves") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {[0,1,2,3].map(i => (
          <motion.div key={i} style={{ position:"absolute", border:`1px solid ${color}28`, borderRadius:"50%", width:200+i*130, height:200+i*130 }}
            animate={{ scale:[1,1.12,1], opacity:[0.3,0.08,0.3] }} transition={{ duration:(3+i)*sm, delay:i*0.5, repeat:Infinity }} />
        ))}
      </div>
    );
  }

  if (type === "orbits") {
    const orbs = [
      { r:160, dur:10, color },
      { r:260, dur:16, color:"#8b5cf6" },
      { r:360, dur:22, color:"#f59e0b" },
    ];
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {orbs.map((o,i) => (
          <motion.div key={i} style={{ position:"absolute", border:`1px solid ${o.color}22`, borderRadius:"50%", width:o.r, height:o.r }}
            animate={{ rotate:360 }} transition={{ duration:o.dur*sm, repeat:Infinity, ease:"linear" }}>
            <div style={{ position:"absolute", top:0, left:"50%", width:10, height:10, borderRadius:"50%", background:o.color, boxShadow:`0 0 12px 4px ${o.color}88`, transform:"translate(-50%,-50%)" }} />
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === "stars") {
    const items = Array.from({ length: Math.min(count,55) }, (_,i) => ({
      left:(i*43+11)%100, top:(i*29+7)%100, dur:(1+(i%3))*sm, del:(i%10)*0.22,
    }));
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {items.map((p,i) => (
          <motion.div key={i} style={{ left:`${p.left}%`, top:`${p.top}%`, position:"absolute", color, fontSize:"10px" }}
            animate={{ opacity:[0.05,1,0.05], scale:[0.4,1.3,0.4] }} transition={{ duration:p.dur, delay:p.del, repeat:Infinity }}>✦</motion.div>
        ))}
      </div>
    );
  }

  if (type === "matrix") {
    const CHARS = ["0","1","{","}","()","=>","fn","if","&&","||","</>","✓","∞","λ"];
    const cols = Array.from({ length: Math.min(count,16) }, (_,i) => ({
      left:(i*67+5)%100, dur:(2+(i%3))*sm, del:(i%7)*0.5,
    }));
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {cols.map((c,i) => (
          <motion.div key={i} style={{ left:`${c.left}%`, position:"absolute", top:"-40px", fontSize:"13px", fontFamily:"monospace", color, fontWeight:"bold" }}
            animate={{ y:[0,500], opacity:[0,0.7,0] }} transition={{ duration:c.dur, delay:c.del, repeat:Infinity }}>
            {CHARS[i%CHARS.length]}
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === "floating-code") {
    const items = CODE_SNIPPETS.slice(0, Math.min(9, count));
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {items.map((snippet,i) => (
          <motion.div key={i} style={{ left:`${(i*37+5)%78}%`, top:`${(i*53+10)%78}%`, position:"absolute", fontSize:"10px", fontFamily:"monospace", color, whiteSpace:"nowrap" }}
            animate={{ y:[0,-22,0], opacity:[0.18,0.5,0.18] }} transition={{ duration:4+i*0.9, delay:i*0.7, repeat:Infinity }}>
            {snippet}
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === "confetti") {
    const COLS = [color,"#8b5cf6","#f59e0b","#22c55e","#ec4899","#06b6d4"];
    const items = Array.from({ length: Math.min(count,32) }, (_,i) => ({
      left:(i*31+3)%100, dur:(2+(i%4))*sm, del:(i%8)*0.3, col:COLS[i%COLS.length], br:i%3===0?"50%":i%3===1?"3px":"0",
    }));
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {items.map((p,i) => (
          <motion.div key={i} style={{ left:`${p.left}%`, top:"-20px", position:"absolute", width:8, height:8, borderRadius:p.br, background:p.col }}
            animate={{ y:[0,520], rotate:[0,360*2], opacity:[1,0] }} transition={{ duration:p.dur, delay:p.del, repeat:Infinity }} />
        ))}
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${color}18 1px,transparent 1px),linear-gradient(90deg,${color}18 1px,transparent 1px)`, backgroundSize:"44px 44px" }}
          animate={{ backgroundPosition:["0px 0px","44px 44px"] }} transition={{ duration:4*sm, repeat:Infinity, ease:"linear" }} />
      </div>
    );
  }

  if (type === "mesh-gradient") {
    return (
      <motion.div className="absolute inset-0 pointer-events-none"
        style={{ background:`radial-gradient(ellipse at 20% 50%,${color}30 0%,transparent 55%),radial-gradient(ellipse at 80% 20%,#8b5cf630 0%,transparent 55%),radial-gradient(ellipse at 50% 80%,#f59e0b22 0%,transparent 55%)` }}
        animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:4*sm, repeat:Infinity }} />
    );
  }

  // ─── New Professional Animations ───────────────────────────────────────────

  if (type === "aurora") {
    const blobs = [
      { x:5,  y:10, w:"55%", h:"55%", c:color },
      { x:45, y:5,  w:"60%", h:"50%", c:"#8b5cf6" },
      { x:65, y:35, w:"50%", h:"60%", c:"#06b6d4" },
      { x:20, y:45, w:"55%", h:"50%", c:"#ec4899" },
      { x:50, y:55, w:"45%", h:"45%", c:color },
    ];
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {blobs.map((b,i) => (
          <motion.div key={i} style={{ position:"absolute", left:`${b.x}%`, top:`${b.y}%`, width:b.w, height:b.h,
              background:`radial-gradient(ellipse at 40% 40%,${b.c}60 0%,${b.c}28 40%,transparent 70%)`,
              filter:"blur(55px)", borderRadius:"60% 40% 70% 30% / 50% 60% 40% 50%", mixBlendMode:"screen" }}
            animate={{ x:[0,60,-40,30,0], y:[0,-45,35,-20,0], scale:[1,1.25,0.85,1.1,1], borderRadius:["60% 40% 70% 30%/50% 60% 40% 50%","40% 60% 30% 70%/60% 40% 60% 40%","60% 40% 70% 30%/50% 60% 40% 50%"] }}
            transition={{ duration:(7+i*2)*sm, delay:i*1.3, repeat:Infinity, ease:"easeInOut" }} />
        ))}
      </div>
    );
  }

  if (type === "glass_blobs") {
    const blobs = [
      { x:5,  y:5,  s:260, c:color,     dur:9 },
      { x:55, y:0,  s:220, c:"#8b5cf6", dur:11 },
      { x:60, y:50, s:200, c:"#ec4899", dur:8 },
      { x:10, y:55, s:180, c:"#f59e0b", dur:13 },
      { x:35, y:25, s:160, c:color,     dur:10 },
    ];
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {blobs.map((b,i) => (
          <motion.div key={i} style={{ position:"absolute", left:`${b.x}%`, top:`${b.y}%`, width:b.s, height:b.s,
              background:`radial-gradient(circle at 35% 30%,${b.c}50 0%,${b.c}28 35%,${b.c}0a 65%,transparent 80%)`,
              filter:"blur(45px)", borderRadius:"50%" }}
            animate={{ x:[0,50,-35,20,0], y:[0,-50,30,-15,0], scale:[1,1.2,0.9,1.15,1] }}
            transition={{ duration:b.dur*sm, delay:i*1.1, repeat:Infinity, ease:"easeInOut" }} />
        ))}
        {/* Glass sheen overlay */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 50%,rgba(255,255,255,0.02) 100%)" }} />
      </div>
    );
  }

  if (type === "plasma") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div style={{ position:"absolute", inset:"-20%", filter:"blur(30px)" }}
          animate={{ background:[
            `radial-gradient(ellipse at 20% 30%,${color}70,transparent 50%),radial-gradient(ellipse at 75% 20%,#8b5cf660,transparent 50%),radial-gradient(ellipse at 50% 80%,#ec489950,transparent 50%)`,
            `radial-gradient(ellipse at 70% 60%,${color}60,transparent 50%),radial-gradient(ellipse at 20% 70%,#8b5cf670,transparent 50%),radial-gradient(ellipse at 80% 30%,#ec489960,transparent 50%)`,
            `radial-gradient(ellipse at 40% 10%,${color}70,transparent 50%),radial-gradient(ellipse at 60% 90%,#8b5cf650,transparent 50%),radial-gradient(ellipse at 10% 50%,#ec489970,transparent 50%)`,
            `radial-gradient(ellipse at 20% 30%,${color}70,transparent 50%),radial-gradient(ellipse at 75% 20%,#8b5cf660,transparent 50%),radial-gradient(ellipse at 50% 80%,#ec489950,transparent 50%)`,
          ]}}
          transition={{ duration:8*sm, repeat:Infinity, ease:"easeInOut" }} />
      </div>
    );
  }

  if (type === "nebula") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div style={{ position:"absolute", inset:0,
            background:`radial-gradient(ellipse at 30% 40%,${color}40 0%,transparent 45%),radial-gradient(ellipse at 70% 60%,#8b5cf645 0%,transparent 40%),radial-gradient(ellipse at 50% 20%,#ec489935 0%,transparent 35%)`,
            filter:"blur(28px)" }}
          animate={{ opacity:[0.6,1,0.6], scale:[1,1.04,1] }} transition={{ duration:6*sm, repeat:Infinity, ease:"easeInOut" }} />
        {/* Star field */}
        {Array.from({length:30},(_,i) => ({
          left:(i*43+11)%100, top:(i*29+7)%100, s:0.5+(i%3)*0.5,
        })).map((s,i) => (
          <motion.div key={i} style={{ position:"absolute", left:`${s.left}%`, top:`${s.top}%`, width:s.s*2, height:s.s*2, borderRadius:"50%", background:"white" }}
            animate={{ opacity:[0.1,0.8,0.1] }} transition={{ duration:1.5+(i%3)*0.7, delay:i*0.18, repeat:Infinity }} />
        ))}
      </div>
    );
  }

  if (type === "neon_circuit") {
    const paths = [
      "M0,60 H40 V30 H80 V60 H120", "M0,100 H30 V70 H70 V100 H100 V130 H120",
      "M20,0 V40 H60 V20 H100 V40", "M120,80 H90 V110 H50 V80 H20 V120 H0",
    ];
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {paths.map((d,i) => (
          <svg key={i} className="absolute inset-0 w-full h-full" style={{ opacity:0.35 }}>
            <motion.path d={d} fill="none" stroke={color} strokeWidth="1.5"
              strokeDasharray="200" initial={{ strokeDashoffset:200 }}
              animate={{ strokeDashoffset:[200,0,-200] }}
              transition={{ duration:(5+i)*sm, delay:i*1.2, repeat:Infinity, ease:"linear" }} />
            {[0,0.25,0.5,0.75,1].map((t,j) => (
              <motion.circle key={j} r="3" fill={color}
                animate={{ opacity:[0,1,0] }}
                transition={{ duration:(5+i)*sm, delay:i*1.2+t*(5+i)*sm, repeat:Infinity }}>
                <animateMotion dur={`${(5+i)*sm}s`} repeatCount="indefinite" begin={`${i*1.2}s`} path={d} />
              </motion.circle>
            ))}
          </svg>
        ))}
        <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${color}08 1px,transparent 1px),linear-gradient(90deg,${color}08 1px,transparent 1px)`, backgroundSize:"60px 60px" }} />
      </div>
    );
  }

  if (type === "dna") {
    const points = Array.from({length:12}, (_,i) => i);
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div style={{ position:"relative", width:80, height:"90%", display:"flex", alignItems:"center" }}>
          {points.map(i => {
            const y = (i/11)*100;
            return (
              <div key={i} style={{ position:"absolute", width:"100%", top:`${y}%` }}>
                <motion.div style={{ position:"absolute", left:"0%", width:10, height:10, borderRadius:"50%", background:color, boxShadow:`0 0 10px 3px ${color}88` }}
                  animate={{ x:[0,70,0] }} transition={{ duration:3*sm, delay:i*0.25, repeat:Infinity, ease:"easeInOut" }} />
                <motion.div style={{ position:"absolute", right:"0%", width:10, height:10, borderRadius:"50%", background:"#8b5cf6", boxShadow:"0 0 10px 3px #8b5cf688" }}
                  animate={{ x:[0,-70,0] }} transition={{ duration:3*sm, delay:i*0.25, repeat:Infinity, ease:"easeInOut" }} />
                <motion.div style={{ position:"absolute", left:"5%", right:"5%", height:1, top:"50%", background:`linear-gradient(90deg,${color}60,#8b5cf660)`, opacity:0.5 }}
                  animate={{ scaleX:[1,0.1,1] }} transition={{ duration:3*sm, delay:i*0.25, repeat:Infinity, ease:"easeInOut" }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (type === "neural") {
    const nodes = [
      {x:10,y:20},{x:10,y:50},{x:10,y:80},
      {x:40,y:10},{x:40,y:35},{x:40,y:60},{x:40,y:85},
      {x:70,y:25},{x:70,y:55},{x:70,y:80},
      {x:95,y:40},{x:95,y:65},
    ];
    const edges = [[0,3],[0,4],[1,3],[1,4],[1,5],[2,5],[2,6],[3,7],[4,7],[4,8],[5,8],[5,9],[6,9],[7,10],[8,10],[8,11],[9,11]];
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity:0.45 }}>
        {edges.map(([a,b],i) => (
          <motion.line key={i}
            x1={`${nodes[a].x}%`} y1={`${nodes[a].y}%`} x2={`${nodes[b].x}%`} y2={`${nodes[b].y}%`}
            stroke={color} strokeWidth="0.8"
            animate={{ opacity:[0.15,0.6,0.15], strokeWidth:["0.8","1.5","0.8"] }}
            transition={{ duration:2+i*0.3, delay:i*0.15, repeat:Infinity }} />
        ))}
        {nodes.map((n,i) => (
          <motion.circle key={i} cx={`${n.x}%`} cy={`${n.y}%`} r="4" fill={i%3===0?color:i%3===1?"#8b5cf6":"#ec4899"}
            style={{ filter:`drop-shadow(0 0 4px ${color})` }}
            animate={{ r:[3,5,3], opacity:[0.5,1,0.5] }}
            transition={{ duration:1.5+i*0.2, delay:i*0.1, repeat:Infinity }} />
        ))}
      </svg>
    );
  }

  if (type === "fire") {
    const items = Array.from({length:Math.min(count,28)}, (_,i) => ({
      left:(i*37+5)%95, dur:(1.5+(i%4)*0.5)*sm, del:(i%7)*0.25,
      size:4+(i%4)*4, col:["#fef08a","#f59e0b","#f97316","#ef4444","#dc2626"][i%5],
    }));
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"40%", background:`linear-gradient(to top,${color}25,transparent)`, filter:"blur(20px)" }} />
        {items.map((p,i) => (
          <motion.div key={i} style={{ left:`${p.left}%`, bottom:"-10px", position:"absolute", width:p.size, height:p.size*2.5, borderRadius:"50% 50% 30% 30%", background:p.col, filter:"blur(3px)", opacity:0.7 }}
            animate={{ y:[0,-200-(i%4)*50], x:[0,(i%2===0?12:-12),0], opacity:[0.8,0.3,0], scaleX:[1,0.5,0.2] }}
            transition={{ duration:p.dur, delay:p.del, repeat:Infinity }} />
        ))}
      </div>
    );
  }

  if (type === "lightning") {
    const bolts = [
      "M60,0 L52,30 L65,30 L48,70 L62,70 L38,120",
      "M40,0 L32,25 L48,25 L28,60 L44,60 L22,110",
      "M80,0 L72,28 L85,28 L68,65 L80,65 L60,115",
    ];
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {bolts.map((d,i) => (
          <motion.svg key={i} style={{ position:"absolute", left:`${[20,5,50][i]}%`, top:`${[5,10,0][i]}%`, width:120, height:130 }}
            animate={{ opacity:[0,1,1,0] }} transition={{ duration:(2+i*0.5)*sm, delay:i*0.8+(i*2), repeat:Infinity }}>
            <path d={d} fill="none" stroke={color} strokeWidth="2.5" style={{ filter:`drop-shadow(0 0 6px ${color})` }} />
            <path d={d} fill="none" stroke="white" strokeWidth="1" opacity="0.7" />
          </motion.svg>
        ))}
        {/* Glow flashes */}
        {bolts.map((_,i) => (
          <motion.div key={`g${i}`} style={{ position:"absolute", left:`${[20,5,50][i]}%`, top:"0%", width:"25%", height:"50%",
              background:`radial-gradient(ellipse at 50% 0%,${color}30,transparent 70%)`, filter:"blur(20px)" }}
            animate={{ opacity:[0,0.8,0] }} transition={{ duration:(2+i*0.5)*sm, delay:i*0.8+(i*2), repeat:Infinity }} />
        ))}
      </div>
    );
  }

  if (type === "cyber_grid") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ perspective:"400px" }}>
        <motion.div style={{ position:"absolute", bottom:"-10%", left:"-20%", right:"-20%", height:"70%",
            backgroundImage:`linear-gradient(${color}35 1px,transparent 1px),linear-gradient(90deg,${color}35 1px,transparent 1px)`,
            backgroundSize:"60px 60px", transform:"rotateX(60deg)", transformOrigin:"bottom center" }}
          animate={{ backgroundPosition:["0px 0px","0px 60px"] }}
          transition={{ duration:2*sm, repeat:Infinity, ease:"linear" }} />
        {/* Horizon glow */}
        <div style={{ position:"absolute", bottom:"55%", left:0, right:0, height:"80px", background:`linear-gradient(transparent,${color}35,transparent)`, filter:"blur(15px)" }} />
      </div>
    );
  }

  if (type === "smoke") {
    const items = Array.from({length:Math.min(count,14)}, (_,i) => ({
      left:(i*41+8)%85, dur:(6+(i%4)*2)*sm, del:(i%7)*0.7, size:60+(i%3)*40,
    }));
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {items.map((p,i) => (
          <motion.div key={i} style={{ left:`${p.left}%`, bottom:"-60px", position:"absolute", width:p.size, height:p.size,
              background:`radial-gradient(circle,${color}28 0%,transparent 65%)`, borderRadius:"50%", filter:"blur(18px)" }}
            animate={{ y:[0,-350], x:[0,(i%2===0?40:-40),0], opacity:[0,0.6,0], scale:[0.8,1.4,0.5] }}
            transition={{ duration:p.dur, delay:p.del, repeat:Infinity }} />
        ))}
      </div>
    );
  }

  return null;
}

// ── Hero Block ───────────────────────────────────────────────────────────────
function HeroBlock({ s }: { s: Record<string, unknown> }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isDark = !mounted || resolvedTheme === "dark";

  // Theme-aware defaults — only used when admin has not set a custom value
  const defaultBgFrom   = isDark ? "#0a0f1e" : "#e0f2fe";
  const defaultBgTo     = isDark ? "#1a0a2e" : "#ede9fe";
  const defaultBgColor  = isDark ? "#0f1629" : "#f8fafc";
  const defaultTextColor = isDark ? "#ffffff" : "#0f172a";
  const borderRgba      = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";
  const overlayRgba     = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)";

  type Btn = { text: string; href: string };
  const primaryBtn = s.primaryBtn as Btn | undefined;
  const secondaryBtn = s.secondaryBtn as Btn | undefined;
  const bgType = str(s.bgType) || "gradient";
  const animationType = str(s.animation) || "particles";
  const animColor = str(s.animColor) || "#06b6d4";
  const textColor = str(s.textColor) || defaultTextColor;
  const showMascot = b(s.showMascot);
  const mascotType = str(s.mascotType) || "robot";
  const mascotColor = str(s.mascotColor) || "#06b6d4";

  let bgStyle: React.CSSProperties = {};
  if (bgType === "solid") bgStyle = { background: str(s.bgColor) || defaultBgColor };
  else if (bgType === "gradient") bgStyle = {
    background: `linear-gradient(${str(s.gradientDir) || "135deg"}, ${str(s.bgFrom) || defaultBgFrom}, ${str(s.bgTo) || defaultBgTo})`,
  };
  else if (bgType === "image" && s.bgImage) bgStyle = {
    backgroundImage: `url(${str(s.bgImage)})`, backgroundSize: "cover", backgroundPosition: "center",
  };

  return (
    <section className="relative overflow-hidden py-20 px-6" style={bgStyle}>
      {bgType === "image" && Boolean(s.bgImage) && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      {animationType !== "none" && (
        <AnimationLayer type={animationType} color={animColor} count={num(s.animCount, 20)} speed={str(s.animSpeed) || "normal"} />
      )}
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className={`flex flex-col items-center gap-8 ${showMascot ? "lg:flex-row lg:items-center lg:text-right" : "text-center"}`}>
          <div className={`flex-1 ${showMascot ? "lg:order-1" : ""}`}>
            {b(s.showBadge) && b(s.badge) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6"
                style={{ color: animColor, border: `1px solid ${borderRgba}`, background: overlayRgba }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: animColor }} />
                {str(s.badge)}
              </motion.div>
            )}
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight"
              style={{ color: textColor }}>
              {str(s.title)}
            </motion.h1>
            {b(s.subtitle) && (
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="text-xl mb-3 opacity-80" style={{ color: textColor }}>
                {str(s.subtitle)}
              </motion.p>
            )}
            {b(s.description) && (
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="mb-8 max-w-2xl mx-auto opacity-60 leading-relaxed" style={{ color: textColor }}>
                {str(s.description)}
              </motion.p>
            )}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className={`flex flex-wrap gap-4 ${showMascot ? "" : "justify-center"}`}>
              {b(primaryBtn?.text) && (
                <Link href={primaryBtn?.href ?? "#"}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold hover:opacity-90 transition-opacity"
                  style={{ background: animColor, color: "#fff" }}>
                  {str(primaryBtn?.text)} <ArrowLeft className="w-4 h-4" />
                </Link>
              )}
              {b(secondaryBtn?.text) && (
                <Link href={secondaryBtn?.href ?? "#"}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl transition-opacity hover:opacity-80"
                  style={{ color: textColor, border: `1px solid ${borderRgba}`, background: overlayRgba }}>
                  {str(secondaryBtn?.text)}
                </Link>
              )}
            </motion.div>
          </div>
          {showMascot && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, y: [0, -12, 0] }}
              transition={{ opacity: { delay: 0.3, duration: 0.4 }, scale: { delay: 0.3, duration: 0.4 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
              className="flex-shrink-0 lg:order-2">
              {getMascotComponent(mascotType, 160, mascotColor)}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Stats Block ──────────────────────────────────────────────────────────────
function StatsBlock({ s }: { s: Record<string, unknown> }) {
  const [liveStats, setLiveStats] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    if (s.autoFetch) api.get<{ users: number; courses: number; problems: number; articles: number }>("/stats/platform")
      .then(d => setLiveStats(d)).catch(() => {});
  }, [s.autoFetch]);
  type StatItem = { label: string; value: string; icon: string; color: string };
  const items: StatItem[] = b(s.autoFetch) && liveStats
    ? [
        { label: "مستخدم", value: liveStats.users?.toLocaleString() ?? "0", icon: "Users", color: "cyan" },
        { label: "كورس", value: liveStats.courses?.toLocaleString() ?? "0", icon: "BookOpen", color: "violet" },
        { label: "تحدي", value: liveStats.problems?.toLocaleString() ?? "0", icon: "Zap", color: "amber" },
        { label: "مقال", value: liveStats.articles?.toLocaleString() ?? "0", icon: "Layers", color: "green" },
      ]
    : (s.items as StatItem[]) ?? [];
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 text-center mb-2">{str(s.title)}</h2>}
        {b(s.subtitle) && <p className="text-center dark:text-slate-400 text-slate-500 mb-10">{str(s.subtitle)}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {items.map((item, i) => {
            const colors = COLOR_MAP[item.color] ?? COLOR_MAP.cyan;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`p-5 rounded-2xl bg-gradient-to-br border text-center ${colors}`}>
                <div className="flex items-center justify-center mb-3"><Icon name={item.icon} className="w-5 h-5" /></div>
                <p className="text-2xl font-black mb-1">{item.value}</p>
                <p className="text-sm opacity-80">{item.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Features Block ───────────────────────────────────────────────────────────
function FeaturesBlock({ s }: { s: Record<string, unknown> }) {
  type FeatureItem = { icon: string; title: string; description: string; color: string };
  const items = (s.items as FeatureItem[]) ?? [];
  const cols = num(s.columns, 3);
  const gridCols = ({ 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as Record<number, string>)[cols] ?? "sm:grid-cols-3";
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 text-center mb-2">{str(s.title)}</h2>}
        {b(s.subtitle) && <p className="text-center dark:text-slate-400 text-slate-500 mb-10">{str(s.subtitle)}</p>}
        <div className={`grid gap-4 ${gridCols}`}>
          {items.map((item, i) => {
            const colors = COLOR_MAP[item.color] ?? COLOR_MAP.cyan;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`p-5 rounded-2xl bg-gradient-to-br border ${colors}`}>
                <div className="mb-3"><Icon name={item.icon} className="w-5 h-5" /></div>
                <h3 className="font-bold dark:text-white text-slate-900 mb-1">{item.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Courses Grid Block ────────────────────────────────────────────────────────
function CoursesGridBlock({ s }: { s: Record<string, unknown> }) {
  const [courses, setCourses] = useState<Array<{ id: number; title: string; category: string; level: string; thumbnail: string | null }>>([]);
  useEffect(() => { api.get<typeof courses>("/courses").then(d => setCourses(d.slice(0, num(s.count, 6)))).catch(() => {}); }, [s.count]);
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900">{str(s.title)}</h2>}
            {b(s.subtitle) && <p className="dark:text-slate-400 text-slate-500 mt-1">{str(s.subtitle)}</p>}
          </div>
          {b(s.showBtn) && <Link href={str(s.btnHref) || "/courses"} className="flex items-center gap-2 text-sm text-cyan-400 hover:underline">{str(s.btnText) || "عرض الكل"} <ArrowLeft className="w-4 h-4" /></Link>}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course, i) => (
            <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Link href={`/courses/${course.id}`} className="block dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden hover:border-cyan-500/40 transition-all group">
                {course.thumbnail ? <img src={course.thumbnail} alt={course.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform" />
                  : <div className="w-full h-40 bg-gradient-to-br from-cyan-500/20 to-violet-600/20 flex items-center justify-center"><BookOpen className="w-10 h-10 text-cyan-400/50" /></div>}
                <div className="p-4">
                  <p className="font-bold dark:text-white text-slate-900 line-clamp-2 text-sm mb-2">{course.title}</p>
                  <span className="text-xs px-2 py-1 rounded-lg dark:bg-cyan-500/10 bg-cyan-50 text-cyan-500">{course.category}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Challenges Grid Block ─────────────────────────────────────────────────────
function ChallengesGridBlock({ s }: { s: Record<string, unknown> }) {
  const [challenges, setChallenges] = useState<Array<{ id: number; title: string; difficulty: string; points: number; category: string }>>([]);
  useEffect(() => { api.get<typeof challenges>("/problems").then(d => setChallenges(d.slice(0, num(s.count, 6)))).catch(() => {}); }, [s.count]);
  const diffColor: Record<string, string> = { easy: "text-green-400 dark:bg-green-500/10 bg-green-50", medium: "text-amber-400 dark:bg-amber-500/10 bg-amber-50", hard: "text-red-400 dark:bg-red-500/10 bg-red-50" };
  const diffLabel: Record<string, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900">{str(s.title)}</h2>}
            {b(s.subtitle) && <p className="dark:text-slate-400 text-slate-500 mt-1">{str(s.subtitle)}</p>}
          </div>
          {b(s.showBtn) && <Link href={str(s.btnHref) || "/problems"} className="flex items-center gap-2 text-sm text-cyan-400 hover:underline">{str(s.btnText) || "عرض الكل"} <ArrowLeft className="w-4 h-4" /></Link>}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {challenges.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Link href={`/problems/${c.id}`} className="flex items-center gap-3 p-4 dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 hover:border-cyan-500/40 transition-all">
                <div className="w-10 h-10 rounded-xl dark:bg-amber-500/10 bg-amber-50 flex items-center justify-center text-amber-400 flex-shrink-0"><Zap className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold dark:text-white text-slate-900 text-sm truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${diffColor[c.difficulty] ?? diffColor.medium}`}>{diffLabel[c.difficulty] ?? c.difficulty}</span>
                    <span className="text-xs dark:text-slate-500 text-slate-400">{c.points} نقطة</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Articles Grid Block ───────────────────────────────────────────────────────
function ArticlesGridBlock({ s }: { s: Record<string, unknown> }) {
  const [articles, setArticles] = useState<Array<{ id: number; title: string; category: string; readTime: number; thumbnail: string | null; authorName: string }>>([]);
  useEffect(() => { api.get<typeof articles>("/articles").then(d => setArticles(d.slice(0, num(s.count, 6)))).catch(() => {}); }, [s.count]);
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900">{str(s.title)}</h2>}
            {b(s.subtitle) && <p className="dark:text-slate-400 text-slate-500 mt-1">{str(s.subtitle)}</p>}
          </div>
          {b(s.showBtn) && <Link href={str(s.btnHref) || "/articles"} className="flex items-center gap-2 text-sm text-cyan-400 hover:underline">{str(s.btnText) || "عرض الكل"} <ArrowLeft className="w-4 h-4" /></Link>}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Link href={`/articles/${a.id}`} className="block dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden hover:border-cyan-500/40 transition-all">
                {a.thumbnail ? <img src={a.thumbnail} alt={a.title} className="w-full h-36 object-cover" />
                  : <div className="w-full h-36 bg-gradient-to-br from-violet-500/20 to-pink-600/20 flex items-center justify-center"><Layers className="w-8 h-8 text-violet-400/50" /></div>}
                <div className="p-4">
                  <p className="font-bold dark:text-white text-slate-900 line-clamp-2 text-sm mb-2">{a.title}</p>
                  <div className="flex items-center gap-2 text-xs dark:text-slate-400 text-slate-500">
                    <span>{a.category}</span><span>·</span><span>{a.readTime} دقائق</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Users Grid Block ──────────────────────────────────────────────────────────
function UsersGridBlock({ s }: { s: Record<string, unknown> }) {
  const [users, setUsers] = useState<Array<{ id: number; username: string; fullName?: string; bio?: string; points?: number; avatar?: string }>>([]);
  useEffect(() => { api.get<typeof users>("/users/leaderboard").then(d => setUsers(d.slice(0, num(s.count, 6)))).catch(() => {}); }, [s.count]);
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 text-center mb-2">{str(s.title)}</h2>}
        {b(s.subtitle) && <p className="text-center dark:text-slate-400 text-slate-500 mb-10">{str(s.subtitle)}</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="p-5 dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 text-center hover:border-cyan-500/30 transition-all">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-gradient-to-br from-cyan-500/30 to-violet-600/30 flex items-center justify-center text-2xl font-black text-cyan-400">
                {(u.username ?? "U")[0].toUpperCase()}
              </div>
              <p className="font-bold dark:text-white text-slate-900 text-sm">@{u.username}</p>
              {b(s.showPoints) && u.points && <p className="text-xs text-amber-400 mt-1">{u.points.toLocaleString()} نقطة</p>}
              {b(s.showBio) && u.bio && <p className="text-xs dark:text-slate-400 text-slate-500 mt-2 line-clamp-2">{u.bio}</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Leaderboard Block ─────────────────────────────────────────────────────────
function LeaderboardBlock({ s }: { s: Record<string, unknown> }) {
  const [users, setUsers] = useState<Array<{ id: number; username: string; avatar?: string; points: number }>>([]);
  useEffect(() => { api.get<typeof users>("/users/leaderboard").then(d => setUsers(d.slice(0, num(s.count, 10)))).catch(() => {}); }, [s.count]);
  return (
    <section className="py-16 px-6">
      <div className="max-w-2xl mx-auto">
        {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 text-center mb-2">{str(s.title)}</h2>}
        {b(s.subtitle) && <p className="text-center dark:text-slate-400 text-slate-500 mb-8">{str(s.subtitle)}</p>}
        <div className="space-y-3">
          {users.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-4 dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-400/20 text-slate-400" : i === 2 ? "bg-orange-500/20 text-orange-400" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500"}`}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </span>
              <div className="flex-1"><p className="font-bold dark:text-white text-slate-900 text-sm">@{u.username}</p></div>
              <span className="text-sm font-bold text-amber-400">{(u.points ?? 0).toLocaleString()} نقطة</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Block ─────────────────────────────────────────────────────────────────
function CtaBlock({ s }: { s: Record<string, unknown> }) {
  type Btn = { text: string; href: string };
  const primaryBtn = s.primaryBtn as Btn | undefined;
  const secondaryBtn = s.secondaryBtn as Btn | undefined;
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className={`rounded-3xl p-10 text-center ${str(s.style) === "glass" ? "dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 backdrop-blur-sm" : "bg-gradient-to-r from-cyan-600/20 via-violet-600/20 to-cyan-600/20 border dark:border-cyan-500/20 border-cyan-200"}`}>
          {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 mb-4">{str(s.title)}</h2>}
          {b(s.description) && <p className="dark:text-slate-300 text-slate-600 mb-8 max-w-2xl mx-auto">{str(s.description)}</p>}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {b(primaryBtn?.text) && <Link href={primaryBtn?.href ?? "#"} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:opacity-90 transition-opacity">{str(primaryBtn?.text)} <ArrowLeft className="w-4 h-4" /></Link>}
            {b(secondaryBtn?.text) && <Link href={secondaryBtn?.href ?? "#"} className="flex items-center gap-2 px-6 py-3 rounded-2xl border dark:border-white/20 border-slate-300 dark:text-white text-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">{str(secondaryBtn?.text)}</Link>}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Cards Block ───────────────────────────────────────────────────────────────
function CardsBlock({ s }: { s: Record<string, unknown> }) {
  type CardItem = { title: string; description: string; icon: string; color: string; href: string; badge?: string };
  const items = (s.items as CardItem[]) ?? [];
  const cols = num(s.columns, 3);
  const gridCols = ({ 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as Record<number, string>)[cols] ?? "sm:grid-cols-3";
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 text-center mb-2">{str(s.title)}</h2>}
        {b(s.subtitle) && <p className="text-center dark:text-slate-400 text-slate-500 mb-10">{str(s.subtitle)}</p>}
        <div className={`grid gap-4 ${gridCols}`}>
          {items.map((item, i) => {
            const colors = COLOR_MAP[item.color] ?? COLOR_MAP.cyan;
            const card = (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`p-5 rounded-2xl bg-gradient-to-br border ${colors} ${item.href && item.href !== "#" ? "hover:scale-105 transition-transform cursor-pointer" : ""}`}>
                {item.badge && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-white/10 mb-3">{item.badge}</span>}
                <div className="mb-3"><Icon name={item.icon} className="w-6 h-6" /></div>
                <h3 className="font-bold dark:text-white text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{item.description}</p>
              </motion.div>
            );
            return item.href && item.href !== "#" ? <Link key={i} href={item.href}>{card}</Link> : card;
          })}
        </div>
      </div>
    </section>
  );
}

// ── Categories Block ──────────────────────────────────────────────────────────
function CategoriesBlock({ s }: { s: Record<string, unknown> }) {
  type CatItem = { name: string; icon: string; color: string; href: string; count: string };
  const items = (s.items as CatItem[]) ?? [];
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 text-center mb-2">{str(s.title)}</h2>}
        {b(s.subtitle) && <p className="text-center dark:text-slate-400 text-slate-500 mb-10">{str(s.subtitle)}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item, i) => {
            const colors = COLOR_MAP[item.color] ?? COLOR_MAP.cyan;
            return (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <Link href={item.href ?? "#"} className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br border text-center hover:scale-105 transition-transform ${colors}`}>
                  <Icon name={item.icon} className="w-6 h-6" />
                  <p className="font-bold text-sm dark:text-white text-slate-900">{item.name}</p>
                  {b(item.count) && <p className="text-xs opacity-70">{item.count}</p>}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials Block ────────────────────────────────────────────────────────
function TestimonialsBlock({ s }: { s: Record<string, unknown> }) {
  type Testimonial = { name: string; role: string; content: string; rating: number };
  const items = (s.items as Testimonial[]) ?? [];
  const cols = num(s.columns, 3);
  const gridCols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3" }[cols] ?? "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 text-center mb-2">{str(s.title)}</h2>}
        {b(s.subtitle) && <p className="text-center dark:text-slate-400 text-slate-500 mb-10">{str(s.subtitle)}</p>}
        <div className={`grid gap-4 ${gridCols}`}>
          {items.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="p-6 dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200">
              <div className="flex mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`w-4 h-4 ${j < (item.rating ?? 5) ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} />
                ))}
              </div>
              <p className="dark:text-slate-300 text-slate-600 text-sm leading-relaxed mb-4 italic">&ldquo;{item.content}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-600/30 flex items-center justify-center text-sm font-black text-cyan-400">
                  {(item.name ?? "م")[0]}
                </div>
                <div>
                  <p className="font-bold dark:text-white text-slate-900 text-sm">{item.name}</p>
                  <p className="text-xs dark:text-slate-500 text-slate-400">{item.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ Block ─────────────────────────────────────────────────────────────────
function FaqBlock({ s }: { s: Record<string, unknown> }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  type FaqItem = { question: string; answer: string };
  const items = (s.items as FaqItem[]) ?? [];
  return (
    <section className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 text-center mb-2">{str(s.title)}</h2>}
        {b(s.subtitle) && <p className="text-center dark:text-slate-400 text-slate-500 mb-10">{str(s.subtitle)}</p>}
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-right">
                <span className="font-semibold dark:text-white text-slate-900 text-sm">{item.question}</span>
                <motion.div animate={{ rotate: openIndex === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 dark:text-slate-400 text-slate-500 flex-shrink-0 mr-2" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm dark:text-slate-400 text-slate-500 leading-relaxed border-t dark:border-white/5 border-slate-100 pt-3">{item.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing Block ─────────────────────────────────────────────────────────────
function PricingBlock({ s }: { s: Record<string, unknown> }) {
  type PricingItem = { name: string; price: string; period: string; description: string; features: string[]; color: string; badge?: string; isPopular: boolean; btnText: string; btnHref: string };
  const items = (s.items as PricingItem[]) ?? [];
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 text-center mb-2">{str(s.title)}</h2>}
        {b(s.subtitle) && <p className="text-center dark:text-slate-400 text-slate-500 mb-10">{str(s.subtitle)}</p>}
        <div className={`grid gap-6 ${items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {items.map((item, i) => {
            const colors = COLOR_MAP[item.color] ?? COLOR_MAP.cyan;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`relative p-6 rounded-2xl bg-gradient-to-br border ${colors} ${item.isPopular ? "scale-105" : ""}`}>
                {item.isPopular && item.badge && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-full bg-cyan-500 text-white">{item.badge}</span>}
                <h3 className="font-black dark:text-white text-slate-900 text-lg mb-1">{item.name}</h3>
                <p className="text-sm opacity-70 mb-4">{item.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-black">{item.price}</span>
                  <span className="text-sm opacity-70 mr-1">{item.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {(item.features ?? []).map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href={item.btnHref ?? "#"} className="block text-center py-2.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors">{item.btnText || "ابدأ الآن"}</Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Rich Text Block ───────────────────────────────────────────────────────────
function RichTextBlock({ s }: { s: Record<string, unknown> }) {
  const type = str(s.textType) || "paragraph";
  const content = str(s.content);
  const align = str(s.align) || "right";
  const color = str(s.color) || "";
  const size = str(s.size) || "md";
  const padding = str(s.padding) || "md";
  const padMap = { none: "py-4 px-6", sm: "py-8 px-6", md: "py-12 px-6", lg: "py-20 px-6" } as const;
  const sizeMap = { sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-xl" } as const;
  const alignMap = { right: "text-right", center: "text-center", left: "text-left" } as const;
  const bgStyle = s.bgColor ? { backgroundColor: str(s.bgColor) } : {};
  const padKey = padding as keyof typeof padMap;
  const alignKey = align as keyof typeof alignMap;
  const sizeKey = size as keyof typeof sizeMap;

  return (
    <section className={`${padMap[padKey] ?? padMap.md}`} style={bgStyle}>
      <div className="max-w-4xl mx-auto">
        {type === "h1" && <h1 className={`font-black dark:text-white text-slate-900 ${alignMap[alignKey] ?? alignMap.right} text-4xl leading-tight`} style={color ? { color } : {}}>{content}</h1>}
        {type === "h2" && <h2 className={`font-black dark:text-white text-slate-900 ${alignMap[alignKey] ?? alignMap.right} text-3xl leading-tight`} style={color ? { color } : {}}>{content}</h2>}
        {type === "h3" && <h3 className={`font-bold dark:text-white text-slate-900 ${alignMap[alignKey] ?? alignMap.right} text-2xl`} style={color ? { color } : {}}>{content}</h3>}
        {type === "paragraph" && <p className={`dark:text-slate-300 text-slate-600 leading-relaxed ${alignMap[alignKey] ?? alignMap.right} ${sizeMap[sizeKey] ?? sizeMap.md}`} style={color ? { color } : {}}>{content}</p>}
        {type === "quote" && (
          <blockquote className="border-r-4 border-cyan-500 pr-6">
            <p className={`italic text-xl dark:text-slate-300 text-slate-600 leading-relaxed ${alignMap[alignKey] ?? alignMap.right}`} style={color ? { color } : {}}>{content}</p>
          </blockquote>
        )}
        {type === "badge" && (
          <div className={`flex ${align === "center" ? "justify-center" : align === "left" ? "justify-start" : "justify-end"}`}>
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold" style={color ? { color } : {}}>{content}</span>
          </div>
        )}
        {type === "list" && (
          <ul className={`space-y-2 ${alignMap[alignKey] ?? alignMap.right} dark:text-slate-300 text-slate-600 ${sizeMap[sizeKey] ?? sizeMap.md}`}>
            {content.split("\n").filter(Boolean).map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ── Code Block ────────────────────────────────────────────────────────────────
function CodeBlockRenderer({ s }: { s: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const code = str(s.code);
  const language = str(s.language) || "javascript";
  const title = str(s.title);
  const theme = str(s.theme) || "dark";

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const bgColor = theme === "light" ? "#f8fafc" : theme === "monokai" ? "#272822" : "#0d1117";
  const textColor = theme === "light" ? "#1e293b" : "#e2e8f0";
  const borderColor = theme === "light" ? "#e2e8f0" : "#30363d";

  return (
    <section className="py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: theme === "light" ? "#e2e8f0" : "#161b22" }}>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              {title && <span className="text-xs font-mono" style={{ color: textColor, opacity: 0.7 }}>{title}</span>}
              {!title && <span className="text-xs font-mono" style={{ color: textColor, opacity: 0.5 }}>{language}</span>}
            </div>
            {b(s.copyButton !== false) && (
              <button onClick={handleCopy} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors" style={{ color: textColor, opacity: 0.6 }}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "تم" : "نسخ"}
              </button>
            )}
          </div>
          <pre className="overflow-x-auto p-5 text-sm leading-relaxed" dir="ltr" style={{ background: bgColor, color: textColor, margin: 0 }}>
            <code>{code}</code>
          </pre>
          {b(s.showLineNumbers) && (
            <div className="text-xs text-center py-2" style={{ background: bgColor, color: textColor, opacity: 0.4, borderTop: `1px solid ${borderColor}` }}>
              {language} · {code.split("\n").length} سطر
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Video Embed Block ─────────────────────────────────────────────────────────
function VideoEmbedBlock({ s }: { s: Record<string, unknown> }) {
  const url = str(s.url);
  const getYoutubeId = (u: string) => {
    const match = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };
  const ytId = getYoutubeId(url);
  const aspectMap = { "16:9": "aspect-video", "4:3": "aspect-4/3", "1:1": "aspect-square" };
  const aspect = aspectMap[str(s.aspectRatio) as keyof typeof aspectMap] ?? "aspect-video";
  return (
    <section className="py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {b(s.title) && <h2 className="text-2xl font-black dark:text-white text-slate-900 text-center mb-6">{str(s.title)}</h2>}
        <div className={`relative ${aspect} rounded-2xl overflow-hidden dark:bg-black bg-slate-900 shadow-2xl`}>
          {ytId ? (
            <iframe src={`https://www.youtube.com/embed/${ytId}?${b(s.autoplay) ? "autoplay=1&" : ""}rel=0`}
              className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope" allowFullScreen />
          ) : url ? (
            <video src={url} controls={b(s.controls !== false)} autoPlay={b(s.autoplay)} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-16 h-16 text-white/30" />
              <p className="absolute text-white/50 text-sm mt-20">أضف رابط الفيديو</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Image Banner Block ────────────────────────────────────────────────────────
function ImageBannerBlock({ s }: { s: Record<string, unknown> }) {
  type Btn = { text: string; href: string };
  const primaryBtn = s.primaryBtn as Btn | undefined;
  const height = num(s.height, 400);
  const overlayOpacity = num(s.overlayOpacity, 0.5);
  const overlayColor = str(s.overlayColor) || "#000000";
  const posMap = { center: "justify-center items-center text-center", left: "justify-start items-end text-right", right: "justify-end items-end text-left" } as const;
  const pos = posMap[str(s.contentPosition) as keyof typeof posMap] ?? posMap.center;
  return (
    <section className="relative overflow-hidden" style={{ height }}>
      {s.imageUrl ? (
        <img src={str(s.imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
      )}
      <div className="absolute inset-0" style={{ background: overlayColor, opacity: overlayOpacity }} />
      <div className={`relative z-10 h-full flex p-10 ${pos}`}>
        <div className="max-w-2xl">
          {b(s.title) && <h2 className="text-4xl font-black text-white mb-3 leading-tight">{str(s.title)}</h2>}
          {b(s.subtitle) && <p className="text-white/80 text-lg mb-6">{str(s.subtitle)}</p>}
          {b(primaryBtn?.text) && (
            <Link href={primaryBtn?.href ?? "#"} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-slate-900 font-bold hover:bg-white/90 transition-colors">
              {str(primaryBtn?.text)} <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Countdown Block ───────────────────────────────────────────────────────────
function CountdownBlock({ s }: { s: Record<string, unknown> }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const target = new Date(str(s.targetDate) || "2025-12-31").getTime();
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [s.targetDate]);
  const color = str(s.color) || "cyan";
  const colors = COLOR_MAP[color] ?? COLOR_MAP.cyan;
  const units = [
    { label: "يوم", value: timeLeft.days },
    { label: "ساعة", value: timeLeft.hours },
    { label: "دقيقة", value: timeLeft.minutes },
    { label: "ثانية", value: timeLeft.seconds },
  ];
  return (
    <section className="py-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
        {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 mb-2">{str(s.title)}</h2>}
        {b(s.subtitle) && <p className="dark:text-slate-400 text-slate-500 mb-8">{str(s.subtitle)}</p>}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {units.map(({ label, value }, i) => (
            <motion.div key={i} className={`p-5 rounded-2xl bg-gradient-to-br border w-24 ${colors}`} whileInView={{ scale: [0.9, 1] }} viewport={{ once: true }}>
              <motion.p key={value} className="text-4xl font-black" animate={{ scale: [1.1, 1] }} transition={{ duration: 0.2 }}>
                {String(value).padStart(2, "0")}
              </motion.p>
              <p className="text-xs opacity-70 mt-1">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Mascot Section Block ──────────────────────────────────────────────────────
function MascotSectionBlock({ s }: { s: Record<string, unknown> }) {
  type Btn = { text: string; href: string };
  const primaryBtn = s.primaryBtn as Btn | undefined;
  const mascotType = str(s.mascotType) || "robot";
  const mascotColor = str(s.mascotColor) || "#06b6d4";
  const mascotPos = str(s.mascotPosition) || "right";
  const sizeMap = { sm: 100, md: 150, lg: 200 };
  const mascotSize = sizeMap[str(s.mascotSize) as keyof typeof sizeMap] ?? 150;
  const animMap = {
    float: { y: [0, -16, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } },
    bounce: { y: [0, -10, 0], transition: { duration: 0.6, repeat: Infinity, ease: "easeOut" as const } },
    pulse: { scale: [1, 1.05, 1], transition: { duration: 2, repeat: Infinity } },
    rotate: { rotate: [0, 5, 0, -5, 0], transition: { duration: 4, repeat: Infinity } },
  };
  const anim = animMap[str(s.animationType) as keyof typeof animMap] ?? animMap.float;

  const bgClass = {
    gradient: "dark:bg-gradient-to-r dark:from-cyan-500/10 dark:via-violet-500/10 dark:to-cyan-500/10 bg-gradient-to-r from-cyan-50 via-violet-50 to-cyan-50",
    dark: "dark:bg-[#0a0f1e] bg-slate-900",
    transparent: "",
  }[str(s.bgStyle)] ?? "";

  return (
    <section className={`py-16 px-6 ${bgClass}`}>
      <div className={`max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-10 ${mascotPos === "left" ? "lg:flex-row-reverse" : ""}`}>
        <div className="flex-1">
          {b(s.title) && <h2 className="text-3xl font-black dark:text-white text-slate-900 mb-3">{str(s.title)}</h2>}
          {b(s.description) && <p className="dark:text-slate-300 text-slate-600 leading-relaxed mb-6">{str(s.description)}</p>}
          {b(primaryBtn?.text) && (
            <Link href={primaryBtn?.href ?? "#"} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:opacity-90 transition-opacity">
              {str(primaryBtn?.text)} <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
        </div>
        <motion.div className="flex-shrink-0" {...anim}>
          {getMascotComponent(mascotType, mascotSize, mascotColor)}
        </motion.div>
      </div>
    </section>
  );
}

// ── Animation Block ───────────────────────────────────────────────────────────
function AnimationBlock({ s }: { s: Record<string, unknown> }) {
  const height = num(s.height, 300);
  const opacity = num(s.opacity, 0.8);
  const animType = str(s.animationType) || "particles";
  const animColor = str(s.particleColor) || "#06b6d4";
  const speed = str(s.speed) || "normal";
  const count = num(s.particleCount, 25);
  const showMascot = b(s.showMascot);
  const mascotType = str(s.mascotType) || "robot";
  const mascotColor = str(s.mascotColor) || "#06b6d4";
  const mascotPos = str(s.mascotPosition) || "center";
  const showContent = b(s.showContent);

  let bgStyle: React.CSSProperties = {};
  const bgType = str(s.backgroundType) || "transparent";
  if (bgType === "solid") bgStyle = { background: str(s.bgColor) || "#0f172a" };
  else if (bgType === "gradient") bgStyle = {
    background: `linear-gradient(${str(s.gradientDir) || "135deg"}, ${str(s.bgFrom) || "#0a0f1e"}, ${str(s.bgTo) || "#1a0a2e"})`,
  };

  const posMap = { left: "justify-start", center: "justify-center", right: "justify-end" } as const;
  const posKey = mascotPos as keyof typeof posMap;

  return (
    <div className="relative overflow-hidden" style={{ height, opacity, ...bgStyle }}>
      <AnimationLayer type={animType} color={animColor} count={count} speed={speed} />
      {showMascot && (
        <div className={`absolute inset-0 flex items-center ${posMap[posKey] ?? "justify-center"} px-10 pointer-events-none`}>
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" as const }}>
            {getMascotComponent(mascotType, 140, mascotColor)}
          </motion.div>
        </div>
      )}
      {showContent && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
          {b(s.contentTitle) && <h3 className="text-2xl font-black text-white mb-2">{str(s.contentTitle)}</h3>}
          {b(s.contentSubtitle) && <p className="text-white/70">{str(s.contentSubtitle)}</p>}
        </div>
      )}
    </div>
  );
}

// ── Text Block ────────────────────────────────────────────────────────────────
function TextBlock({ s }: { s: Record<string, unknown> }) {
  const sizeMap = { sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-xl" } as const;
  const alignMap = { right: "text-right", center: "text-center", left: "text-left" } as const;
  const alignKey = str(s.align) as keyof typeof alignMap;
  const sizeKey = str(s.size) as keyof typeof sizeMap;
  return (
    <section className="py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <p className={`dark:text-slate-300 text-slate-600 leading-relaxed ${alignMap[alignKey] ?? alignMap.right} ${sizeMap[sizeKey] ?? sizeMap.md} whitespace-pre-wrap`}>
          {str(s.content)}
        </p>
      </div>
    </section>
  );
}

// ── Divider Block ─────────────────────────────────────────────────────────────
function DividerBlock({ s }: { s: Record<string, unknown> }) {
  const spacingMap = { sm: "py-4", md: "py-8", lg: "py-16" } as const;
  const spacingKey = str(s.spacing) as keyof typeof spacingMap;
  const style = str(s.style) || "gradient";
  return (
    <div className={`px-6 ${spacingMap[spacingKey] ?? spacingMap.md}`}>
      <div className="max-w-4xl mx-auto">
        {style === "line" && <hr className="dark:border-white/10 border-slate-200" />}
        {style === "gradient" && <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />}
        {style === "dots" && <div className="flex justify-center gap-2">{[0,1,2,3,4].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full dark:bg-white/20 bg-slate-300" />)}</div>}
        {style === "wave" && <div className="text-center text-slate-400 dark:text-slate-600 text-2xl">〰</div>}
      </div>
    </div>
  );
}

// ── Spacer Block ──────────────────────────────────────────────────────────────
function SpacerBlock({ s }: { s: Record<string, unknown> }) {
  const height = num(s.height, 60);
  return (
    <div style={{ height }}>
      {b(s.showLine) && <div className="h-full flex items-center px-6"><div className="w-full h-px dark:border-white/5 border-slate-100 border-dashed border" /></div>}
    </div>
  );
}

// ── Courses Browser Block ─────────────────────────────────────────────────────
function CoursesBrowserBlock({ s }: { s: Record<string, unknown> }) {
  const headerTitle = str(s.headerTitle) || "استعرض جميع الكورسات";
  const headerSubtitle = str(s.headerSubtitle) || "اختر من الكورسات المتاحة";
  const badge = str(s.badge) || "📚 الكورسات";
  const categories = Array.isArray(s.categories) ? (s.categories as string[]) : ["Python", "JavaScript", "React", "C++"];
  const pageSize = num(s.pageSize, 12);
  const showLevelFilter = s.showLevelFilter !== false;
  const showSortOptions = s.showSortOptions !== false;

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const offsetRef = { current: 0 };

  const levels = [
    { value: "", label: "كل المستويات" },
    { value: "beginner", label: "مبتدئ" },
    { value: "intermediate", label: "متوسط" },
    { value: "advanced", label: "متقدم" },
    { value: "expert", label: "خبير" },
  ];
  const sortOptions = [
    { value: "newest", label: "الأحدث أولاً" },
    { value: "oldest", label: "الأقدم أولاً" },
    { value: "popular", label: "الأكثر طلاباً" },
  ];
  const levelColors: Record<string, string> = {
    beginner: "text-green-400 bg-green-500/10 border-green-500/20",
    intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    advanced: "text-red-400 bg-red-500/10 border-red-500/20",
    expert: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  };
  const levelLabels: Record<string, string> = {
    beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", expert: "خبير",
  };

  const fetchCourses = async (reset = true) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (category && category !== "الكل") q.set("category", category);
    if (level) q.set("level", level);
    q.set("sort", sort);
    q.set("limit", String(pageSize));
    q.set("offset", String(reset ? 0 : offsetRef.current));
    try {
      const data = await api.get<{ courses: Record<string, unknown>[]; total: number; hasMore: boolean }>(`/courses?${q}`);
      if (reset) {
        setCourses(data.courses ?? []);
        offsetRef.current = pageSize;
      } else {
        setCourses(prev => [...prev, ...(data.courses ?? [])]);
        offsetRef.current += pageSize;
      }
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
    } catch { if (reset) setCourses([]); }
  };

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => fetchCourses(true).finally(() => setLoading(false)), 300);
    return () => clearTimeout(t);
  }, [search, category, level, sort]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchCourses(false);
    setLoadingMore(false);
  };

  return (
    <div className="min-h-[60vh] dark:bg-[#0a0f1e] bg-slate-50">
      <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="badge badge-cyan mb-4 inline-block">{badge}</span>
            <h2 className="text-3xl font-black dark:text-white text-slate-900 mb-3">{headerTitle}</h2>
            <p className="dark:text-slate-400 text-slate-600 mb-6 text-sm">{headerSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="relative flex-1">
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="ابحث عن كورس..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full py-2.5 pr-10 pl-4 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 transition-colors text-sm" />
              </div>
              {(showLevelFilter || showSortOptions) && (
                <button onClick={() => setShowFilters(f => !f)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${showFilters ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "dark:bg-white/5 bg-slate-100 dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-600"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                  فلترة
                </button>
              )}
            </div>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 flex flex-wrap gap-3">
                {showLevelFilter && (
                  <select value={level} onChange={e => setLevel(e.target.value)}
                    className="px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm">
                    {levels.map(l => <option key={l.value} value={l.value} className="dark:bg-[#111827]">{l.label}</option>)}
                  </select>
                )}
                {(search || category || level) && (
                  <button onClick={() => { setSearch(""); setCategory(""); setLevel(""); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                    ✕ مسح الفلاتر
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
            {["الكل", ...categories].map(cat => (
              <button key={cat} onClick={() => setCategory(cat === "الكل" ? "" : cat)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${(cat === "الكل" && !category) || category === cat ? "gradient-bg text-white shadow-lg shadow-cyan-500/25" : "dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400"}`}>
                {cat}
              </button>
            ))}
          </div>
          {showSortOptions && (
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm appearance-none cursor-pointer flex-shrink-0">
              {sortOptions.map(o => <option key={o.value} value={o.value} className="dark:bg-[#111827]">{o.label}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden animate-pulse">
                <div className="h-36 dark:bg-white/5 bg-slate-100" />
                <div className="p-4 space-y-2"><div className="h-3 dark:bg-white/10 bg-slate-200 rounded w-1/3" /><div className="h-4 dark:bg-white/10 bg-slate-200 rounded" /></div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-14 h-14 dark:text-slate-700 text-slate-300 mx-auto mb-4" />
            <p className="dark:text-slate-400 text-slate-600 font-medium">لا توجد كورسات</p>
            <p className="dark:text-slate-500 text-slate-400 text-sm mt-1">جرب تغيير كلمة البحث أو الفلاتر</p>
          </div>
        ) : (
          <>
            <p className="dark:text-slate-400 text-slate-600 text-sm mb-5">يعرض <span className="text-cyan-400 font-semibold">{courses.length}</span> من <span className="text-cyan-400 font-semibold">{total}</span> كورس</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {courses.map((course, i) => {
                const lv = str(course.level);
                const lvStyle = levelColors[lv] ?? levelColors.beginner;
                const lvLabel = levelLabels[lv] ?? lv;
                return (
                  <motion.div key={str(course.id)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }} whileHover={{ y: -3 }}>
                    <Link href={`/courses/${str(course.id)}`}>
                      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group h-full">
                        <div className="relative h-36 dark:bg-gradient-to-br dark:from-cyan-900/30 dark:to-violet-900/30 bg-gradient-to-br from-cyan-50 to-violet-50">
                          {course.thumbnail ? <img src={str(course.thumbnail)} alt={str(course.title)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 dark:text-white/10 text-slate-200" /></div>}
                          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-xs font-bold ${course.isPaid ? "bg-amber-500" : "bg-green-500"}`}>{course.isPaid ? "مدفوع" : "مجاني"}</span>
                        </div>
                        <div className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded-lg border mb-2 inline-block ${lvStyle}`}>{lvLabel}</span>
                          <h3 className="font-bold dark:text-white text-slate-900 text-sm leading-snug mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">{str(course.title)}</h3>
                          <div className="flex items-center justify-between text-xs dark:text-slate-400 text-slate-500">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{num(course.enrolledCount).toLocaleString("ar-EG")}</span>
                            {course.isPaid && course.price ? <span className="font-bold text-amber-400">{str(course.price)} ج.م</span> : <span className="font-bold text-green-400">مجاني</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button onClick={handleLoadMore} disabled={loadingMore}
                  className="btn-secondary px-8 py-2.5 text-sm disabled:opacity-60 flex items-center gap-2 mx-auto">
                  {loadingMore ? "جاري التحميل..." : `تحميل المزيد (${total - courses.length} متبقي)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Articles Browser Block ────────────────────────────────────────────────────
function ArticlesBrowserBlock({ s }: { s: Record<string, unknown> }) {
  const headerTitle = str(s.headerTitle) || "مقالات ونصائح تقنية";
  const headerSubtitle = str(s.headerSubtitle) || "أحدث المقالات التقنية بالعربي";
  const badge = str(s.badge) || "📰 المقالات";
  const categories = Array.isArray(s.categories) ? (s.categories as string[]) : ["Python", "JavaScript", "React"];
  const showFeatured = s.showFeatured !== false;

  interface ArticleItem { id: number; slug: string; title: string; excerpt: string; category: string; authorName: string; readTime: number; views: number; tags: string[]; isFeatured: boolean; thumbnail: string | null; createdAt: string; }
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("الكل");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category !== "الكل") params.set("category", category);
    setLoading(true);
    api.get<ArticleItem[]>(`/articles?${params}`).then(setArticles).catch(() => setArticles([])).finally(() => setLoading(false));
  }, [search, category]);

  const featured = showFeatured ? articles.filter(a => a.isFeatured) : [];
  const display = articles.filter(a => !(category === "الكل" && !search && a.isFeatured));
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-[60vh] dark:bg-[#0a0f1e] bg-slate-50">
      <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="badge badge-cyan mb-4 inline-block">{badge}</span>
            <h2 className="text-3xl font-black dark:text-white text-slate-900 mb-3">{headerTitle}</h2>
            <p className="dark:text-slate-400 text-slate-600 mb-6 text-sm">{headerSubtitle}</p>
            <div className="relative max-w-xl">
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" placeholder="ابحث في المقالات..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full py-2.5 pr-10 pl-4 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 transition-colors text-sm" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 space-y-3 animate-pulse">
                <div className="h-4 dark:bg-white/10 bg-slate-200 rounded w-1/3" />
                <div className="h-5 dark:bg-white/10 bg-slate-200 rounded" />
                <div className="h-4 dark:bg-white/10 bg-slate-200 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {showFeatured && !search && category === "الكل" && featured.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-bold dark:text-white text-slate-900 mb-5 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" /> مقالات مميزة
                </h3>
                <div className="grid md:grid-cols-2 gap-5">
                  {featured.map((a, i) => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -3 }}>
                      <Link href={`/articles/${a.slug || a.id}`}>
                        <div className="dark:bg-gradient-to-br dark:from-cyan-900/20 dark:to-violet-900/20 bg-gradient-to-br from-cyan-50 to-violet-50 rounded-2xl border dark:border-cyan-500/20 border-cyan-200 p-6 hover:shadow-xl hover:shadow-cyan-500/10 transition-all group h-full">
                          <span className="badge badge-cyan text-xs mb-3 inline-block">{a.category}</span>
                          <h3 className="text-base font-bold dark:text-white text-slate-900 mb-2 group-hover:text-cyan-400 transition-colors">{a.title}</h3>
                          <p className="dark:text-slate-400 text-slate-600 text-sm line-clamp-2 mb-4">{a.excerpt}</p>
                          <div className="flex items-center justify-between text-xs dark:text-slate-500 text-slate-400">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.readTime} دقائق</span>
                            <span className="text-cyan-400 font-medium">اقرأ المزيد ←</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {["الكل", ...categories].map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${category === cat ? "gradient-bg text-white shadow-lg shadow-cyan-500/25" : "dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400"}`}>
                  {cat}
                </button>
              ))}
            </div>
            {display.length === 0 ? (
              <div className="text-center py-16"><p className="dark:text-slate-400 text-slate-600">لا توجد مقالات مطابقة</p></div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {display.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }}>
                    <Link href={`/articles/${a.slug || a.id}`}>
                      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5 transition-all group h-full flex flex-col">
                        <span className="badge text-xs dark:bg-violet-500/20 dark:text-violet-300 bg-violet-50 text-violet-700 border dark:border-violet-500/20 border-violet-200 mb-3 self-start">{a.category}</span>
                        <h3 className="font-bold dark:text-white text-slate-900 mb-2 group-hover:text-cyan-400 transition-colors leading-snug flex-1">{a.title}</h3>
                        <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed mb-3 line-clamp-2">{a.excerpt}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(a.tags ?? []).slice(0, 3).map(tag => <span key={tag} className="px-2 py-0.5 text-xs rounded-lg dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500">{tag}</span>)}
                        </div>
                        <div className="flex items-center justify-between text-xs dark:text-slate-500 text-slate-400 mt-auto">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.readTime} د</span>
                          <span>{fmtDate(a.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Problems Browser Block ────────────────────────────────────────────────────
function ProblemsBrowserBlock({ s }: { s: Record<string, unknown> }) {
  const headerTitle = str(s.headerTitle) || "التحديات البرمجية";
  const headerSubtitle = str(s.headerSubtitle) || "حل مئات المسائل واكسب النقاط";
  const badge = str(s.badge) || "💻 التحديات";
  const languages = Array.isArray(s.languages) ? (s.languages as string[]) : ["Python", "JavaScript"];
  const showStats = s.showStats !== false;
  const showAiChallenge = s.showAiChallenge !== false;

  interface ProblemItem { id: number; title: string; difficulty: string; category: string; language: string; points: number; solvedCount: number; isSolved?: boolean; }
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("الكل");
  const [difficulty, setDifficulty] = useState("الكل");

  const diffConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    easy:   { label: "سهل",   color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
    medium: { label: "متوسط", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
    hard:   { label: "صعب",   color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20" },
    expert: { label: "خبير",  color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  };
  const diffAr: Record<string, string> = { "سهل": "easy", "متوسط": "medium", "صعب": "hard", "خبير": "expert" };
  const difficulties = ["الكل", "سهل", "متوسط", "صعب", "خبير"];

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (difficulty !== "الكل") params.set("difficulty", diffAr[difficulty] || difficulty);
    if (language !== "الكل") params.set("language", language);
    setLoading(true);
    api.get<ProblemItem[]>(`/problems?${params}`).then(setProblems).catch(() => {}).finally(() => setLoading(false));
  }, [search, language, difficulty]);

  const stats = { total: problems.length, easy: problems.filter(p => p.difficulty === "easy").length, medium: problems.filter(p => p.difficulty === "medium").length, hard: problems.filter(p => p.difficulty === "hard").length, expert: problems.filter(p => p.difficulty === "expert").length };

  return (
    <div className="min-h-[60vh] dark:bg-[#0a0f1e] bg-slate-50">
      <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="badge badge-cyan">{badge}</span>
              {showAiChallenge && (
                <Link href="/problems/ai" className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/20 transition-colors">
                  <Brain className="w-3.5 h-3.5" /> تحدي الذكاء الاصطناعي
                </Link>
              )}
            </div>
            <h2 className="text-3xl font-black dark:text-white text-slate-900 mb-3">{headerTitle}</h2>
            <p className="dark:text-slate-400 text-slate-600 mb-6 text-sm">{headerSubtitle}</p>
            {showStats && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                {[{ label: "الكل", value: stats.total, color: "text-slate-400" }, { label: "سهل", value: stats.easy, color: "text-green-400" }, { label: "متوسط", value: stats.medium, color: "text-amber-400" }, { label: "صعب", value: stats.hard, color: "text-red-400" }, { label: "خبير", value: stats.expert, color: "text-violet-400" }].map((s, i) => (
                  <div key={i} className="dark:bg-white/5 bg-slate-100 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                    <div className="text-xs dark:text-slate-400 text-slate-600">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <div className="relative flex-1">
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="ابحث عن مسألة..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full py-2.5 pr-10 pl-4 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 transition-colors text-sm" />
              </div>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="px-3 py-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm">
                {["الكل", ...languages].map(l => <option key={l} value={l} className="dark:bg-[#111827]">{l}</option>)}
              </select>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {difficulties.map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${difficulty === d ? "gradient-bg text-white" : "dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400"}`}>
              {d}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 animate-pulse h-14" />)}</div>
        ) : (
          <div className="space-y-2">
            {problems.map((p, i) => {
              const diff = diffConfig[p.difficulty] ?? diffConfig.easy;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ x: -4 }}>
                  <Link href={`/problems/${p.id}`}>
                    <div className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 hover:border-cyan-500/30 transition-all group flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center text-sm font-bold dark:text-slate-500 text-slate-400 flex-shrink-0">{p.id}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold dark:text-white text-slate-900 group-hover:text-cyan-400 transition-colors truncate text-sm">{p.title}</p>
                        <div className="flex items-center gap-2 text-xs dark:text-slate-500 text-slate-400">
                          <span className={diff.color}>{diff.label}</span>
                          <span>•</span><span>{p.category}</span>
                          <span>•</span><span>{p.language}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-center hidden sm:block">
                          <p className="text-xs dark:text-slate-500 text-slate-400">حُلّت</p>
                          <p className="text-sm font-bold dark:text-slate-300 text-slate-700">{p.solvedCount.toLocaleString("ar-EG")}</p>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${diff.bg} ${diff.border} border`}>
                          <Star className={`w-3 h-3 ${diff.color}`} />
                          <span className={`text-xs font-bold ${diff.color}`}>{p.points}</span>
                        </div>
                        <ArrowLeft className="w-4 h-4 dark:text-slate-600 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            {problems.length === 0 && <div className="text-center py-14"><p className="dark:text-slate-400 text-slate-600">لا توجد مسائل مطابقة</p></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Block Dispatcher ──────────────────────────────────────────────────────────
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.filter(b => b).map((block) => {
        const s = block.settings ?? {};
        switch (block.type) {
          case "hero": return <HeroBlock key={block.id} s={s} />;
          case "stats": return <StatsBlock key={block.id} s={s} />;
          case "features": return <FeaturesBlock key={block.id} s={s} />;
          case "courses_grid": return <CoursesGridBlock key={block.id} s={s} />;
          case "courses_browser": return <CoursesBrowserBlock key={block.id} s={s} />;
          case "challenges_grid": return <ChallengesGridBlock key={block.id} s={s} />;
          case "problems_browser": return <ProblemsBrowserBlock key={block.id} s={s} />;
          case "articles_grid": return <ArticlesGridBlock key={block.id} s={s} />;
          case "articles_browser": return <ArticlesBrowserBlock key={block.id} s={s} />;
          case "users_grid": return <UsersGridBlock key={block.id} s={s} />;
          case "leaderboard": return <LeaderboardBlock key={block.id} s={s} />;
          case "cta": return <CtaBlock key={block.id} s={s} />;
          case "cards": return <CardsBlock key={block.id} s={s} />;
          case "categories": return <CategoriesBlock key={block.id} s={s} />;
          case "testimonials": return <TestimonialsBlock key={block.id} s={s} />;
          case "faq": return <FaqBlock key={block.id} s={s} />;
          case "pricing": return <PricingBlock key={block.id} s={s} />;
          case "rich_text": return <RichTextBlock key={block.id} s={s} />;
          case "code_block": return <CodeBlockRenderer key={block.id} s={s} />;
          case "video_embed": return <VideoEmbedBlock key={block.id} s={s} />;
          case "image_banner": return <ImageBannerBlock key={block.id} s={s} />;
          case "countdown": return <CountdownBlock key={block.id} s={s} />;
          case "mascot_section": return <MascotSectionBlock key={block.id} s={s} />;
          case "animation": return <AnimationBlock key={block.id} s={s} />;
          case "text": return <TextBlock key={block.id} s={s} />;
          case "divider": return <DividerBlock key={block.id} s={s} />;
          case "spacer": return <SpacerBlock key={block.id} s={s} />;
          case "cloud_ide": return <CloudIDELazy key={block.id} s={s} />;
          default: return <div key={block.id} className="py-8 text-center text-sm dark:text-slate-500 text-slate-400">بلوك غير معروف: {block.type}</div>;
        }
      })}
    </>
  );
}

export default BlockRenderer;
