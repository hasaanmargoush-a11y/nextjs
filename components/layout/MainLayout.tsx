import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import type { ReactNode } from "react";

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col dark:bg-[#0a0f1e] bg-slate-50">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
