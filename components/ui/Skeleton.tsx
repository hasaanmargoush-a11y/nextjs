import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg dark:bg-white/8 bg-slate-200",
        className
      )}
      style={style}
    />
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
      <Skeleton className="h-40 rounded-none dark:bg-white/5 bg-slate-100" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-1/3 dark:bg-white/8 bg-slate-200" />
        <Skeleton className="h-4 w-full dark:bg-white/8 bg-slate-200" />
        <Skeleton className="h-3 w-2/3 dark:bg-white/8 bg-slate-200" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-3 w-16 dark:bg-white/8 bg-slate-200" />
          <Skeleton className="h-3 w-12 dark:bg-white/8 bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export function ProblemRowSkeleton() {
  return (
    <div className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 flex items-center gap-4">
      <Skeleton className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3 dark:bg-white/8 bg-slate-200" />
        <Skeleton className="h-3 w-1/3 dark:bg-white/8 bg-slate-200" />
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Skeleton className="h-6 w-14 rounded-lg dark:bg-white/5 bg-slate-100" />
        <Skeleton className="h-4 w-4 rounded dark:bg-white/5 bg-slate-100" />
      </div>
    </div>
  );
}

export function ArticleCardSkeleton() {
  return (
    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 space-y-3">
      <Skeleton className="h-5 w-20 rounded-full dark:bg-white/8 bg-slate-200" />
      <Skeleton className="h-5 w-full dark:bg-white/8 bg-slate-200" />
      <Skeleton className="h-4 w-5/6 dark:bg-white/8 bg-slate-200" />
      <Skeleton className="h-4 w-4/6 dark:bg-white/8 bg-slate-200" />
      <div className="flex gap-1 pt-1">
        <Skeleton className="h-5 w-14 rounded-lg dark:bg-white/5 bg-slate-100" />
        <Skeleton className="h-5 w-14 rounded-lg dark:bg-white/5 bg-slate-100" />
      </div>
      <div className="flex justify-between pt-1">
        <Skeleton className="h-3 w-24 dark:bg-white/8 bg-slate-200" />
        <Skeleton className="h-3 w-20 dark:bg-white/8 bg-slate-200" />
      </div>
    </div>
  );
}

export function ToolCardSkeleton() {
  return (
    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="w-12 h-12 rounded-xl dark:bg-white/5 bg-slate-100" />
        <Skeleton className="h-5 w-12 rounded-full dark:bg-white/5 bg-slate-100" />
      </div>
      <Skeleton className="h-5 w-2/3 dark:bg-white/8 bg-slate-200" />
      <Skeleton className="h-4 w-full dark:bg-white/8 bg-slate-200" />
      <Skeleton className="h-4 w-4/5 dark:bg-white/8 bg-slate-200" />
      <Skeleton className="h-4 w-1/2 dark:bg-white/8 bg-slate-200 mt-2" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <Skeleton className="h-6 w-24 rounded-full dark:bg-white/8 bg-slate-200" />
        <Skeleton className="h-9 w-80 dark:bg-white/8 bg-slate-200" />
        <Skeleton className="h-5 w-64 dark:bg-white/8 bg-slate-200" />
        <Skeleton className="h-11 w-full max-w-lg rounded-xl dark:bg-white/5 bg-slate-100 mt-6" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="dark:bg-white/5 bg-slate-100 rounded-xl p-3 text-center space-y-2">
      <Skeleton className="h-8 w-12 mx-auto dark:bg-white/8 bg-slate-200" />
      <Skeleton className="h-3 w-10 mx-auto dark:bg-white/8 bg-slate-200" />
    </div>
  );
}
