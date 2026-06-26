import { ArticleCardSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";
import { MainLayout } from "@/components/layout/MainLayout";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ArticlesLoading() {
  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <PageHeaderSkeleton />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Skeleton className="w-5 h-5 rounded dark:bg-white/8 bg-slate-200" />
              <Skeleton className="h-6 w-32 dark:bg-white/8 bg-slate-200" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border dark:border-cyan-500/20 border-cyan-200 p-6 space-y-3 dark:bg-cyan-900/10 bg-cyan-50/50"
                >
                  <Skeleton className="h-5 w-24 rounded-full dark:bg-white/8 bg-slate-200" />
                  <Skeleton className="h-6 w-5/6 dark:bg-white/8 bg-slate-200" />
                  <Skeleton className="h-4 w-full dark:bg-white/8 bg-slate-200" />
                  <Skeleton className="h-4 w-4/5 dark:bg-white/8 bg-slate-200" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-3 w-28 dark:bg-white/8 bg-slate-200" />
                    <Skeleton className="h-3 w-20 dark:bg-white/8 bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-9 w-20 rounded-xl animate-pulse dark:bg-white/5 bg-slate-200 flex-shrink-0"
              />
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
