import { Skeleton } from "@/components/ui/Skeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function ProfileLoading() {
  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Skeleton className="w-24 h-24 rounded-2xl flex-shrink-0 dark:bg-white/8 bg-slate-200" />
              <div className="flex-1 space-y-3 text-center sm:text-right">
                <Skeleton className="h-8 w-48 mx-auto sm:mx-0 dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-4 w-32 mx-auto sm:mx-0 dark:bg-white/5 bg-slate-100" />
                <Skeleton className="h-4 w-64 mx-auto sm:mx-0 dark:bg-white/5 bg-slate-100" />
                <div className="flex gap-3 justify-center sm:justify-start pt-1">
                  <Skeleton className="h-4 w-20 dark:bg-white/5 bg-slate-100" />
                  <Skeleton className="h-4 w-20 dark:bg-white/5 bg-slate-100" />
                  <Skeleton className="h-4 w-20 dark:bg-white/5 bg-slate-100" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="dark:bg-white/5 bg-slate-100 rounded-2xl p-5 text-center space-y-2"
                >
                  <Skeleton className="h-8 w-12 mx-auto dark:bg-white/8 bg-slate-200" />
                  <Skeleton className="h-3 w-20 mx-auto dark:bg-white/5 bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-7 w-40 dark:bg-white/8 bg-slate-200" />
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 flex items-center gap-4"
            >
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0 dark:bg-white/5 bg-slate-100" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-2 w-full rounded-full dark:bg-white/5 bg-slate-100" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full flex-shrink-0 dark:bg-white/5 bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
