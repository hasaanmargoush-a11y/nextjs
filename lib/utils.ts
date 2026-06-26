import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("ar-EG").format(num);
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getLevelLabel(level: string) {
  const labels: Record<string, string> = {
    beginner: "مبتدئ",
    intermediate: "متوسط",
    advanced: "متقدم",
    expert: "خبير",
  };
  return labels[level] || level;
}

export function getLevelColor(level: string) {
  const colors: Record<string, string> = {
    beginner: "badge-green",
    intermediate: "badge-cyan",
    advanced: "badge-violet",
    expert: "badge-orange",
  };
  return colors[level] || "badge-cyan";
}
