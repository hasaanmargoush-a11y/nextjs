import { Skeleton } from "@/components/ui/Skeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function CourseDetailLoading() {
  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-5 w-24 rounded-full dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-10 w-full dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-8 w-4/5 dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-5 w-full dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-5 w-3/4 dark:bg-white/8 bg-slate-200" />
                <div className="flex gap-4 pt-2">
                  <Skeleton className="h-4 w-24 dark:bg-white/8 bg-slate-200" />
                  <Skeleton className="h-4 w-24 dark:bg-white/8 bg-slate-200" />
                  <Skeleton className="h-4 w-24 dark:bg-white/8 bg-slate-200" />
                </div>
              </div>
              <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 space-y-4">
                <Skeleton className="h-48 w-full rounded-xl dark:bg-white/5 bg-slate-100" />
                <Skeleton className="h-8 w-32 dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-12 w-full rounded-xl dark:bg-white/5 bg-slate-100" />
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full dark:bg-white/8 bg-slate-200" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-3">
              <Skeleton className="h-7 w-40 dark:bg-white/8 bg-slate-200 mb-4" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 flex items-center gap-4">
                  <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0 dark:bg-white/5 bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3 dark:bg-white/8 bg-slate-200" />
                    <Skeleton className="h-3 w-1/3 dark:bg-white/8 bg-slate-200" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full flex-shrink-0 dark:bg-white/5 bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
