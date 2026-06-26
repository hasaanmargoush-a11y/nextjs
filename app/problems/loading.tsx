import { ProblemRowSkeleton, PageHeaderSkeleton, StatCardSkeleton } from "@/components/ui/Skeleton";
import { MainLayout } from "@/components/layout/MainLayout";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProblemsLoading() {
  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full dark:bg-white/8 bg-slate-200" />
              <Skeleton className="h-6 w-32 rounded-full dark:bg-white/8 bg-slate-200" />
            </div>
            <Skeleton className="h-9 w-60 dark:bg-white/8 bg-slate-200" />
            <Skeleton className="h-5 w-80 dark:bg-white/8 bg-slate-200" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
              {[...Array(5)].map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
            <Skeleton className="h-11 w-full max-w-lg rounded-xl dark:bg-white/5 bg-slate-100" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-9 w-16 rounded-xl animate-pulse dark:bg-white/5 bg-slate-200 flex-shrink-0"
              />
            ))}
          </div>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <ProblemRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
