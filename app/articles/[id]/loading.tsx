import { Skeleton } from "@/components/ui/Skeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function ArticleDetailLoading() {
  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8 space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full dark:bg-white/8 bg-slate-200" />
              <Skeleton className="h-6 w-16 rounded-full dark:bg-white/8 bg-slate-200" />
            </div>
            <Skeleton className="h-10 w-full dark:bg-white/8 bg-slate-200" />
            <Skeleton className="h-8 w-4/5 dark:bg-white/8 bg-slate-200" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24 dark:bg-white/8 bg-slate-200" />
              <Skeleton className="h-4 w-20 dark:bg-white/8 bg-slate-200" />
              <Skeleton className="h-4 w-16 dark:bg-white/8 bg-slate-200" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-2xl dark:bg-white/5 bg-slate-100 mb-8" />
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full dark:bg-white/8 bg-slate-200" style={{ width: `${70 + Math.floor(i * 7) % 30}%` }} />
            ))}
          </div>
        </article>
      </div>
    </MainLayout>
  );
}
