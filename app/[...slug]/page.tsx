"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import { MainLayout } from "@/components/layout/MainLayout";
import { Loader2, LayoutTemplate } from "lucide-react";
import Link from "next/link";

interface Block {
  id: number;
  type: string;
  settings: Record<string, unknown>;
  isVisible: boolean;
}

interface Page {
  id: number;
  title: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  blocks: Block[];
}

export default function DynamicBuilderPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params);
  const fullSlug = Array.isArray(slug) ? slug.join("/") : slug;

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get<Page>(`/pages/render/${fullSlug}`)
      .then(data => setPage(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [fullSlug]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (notFound || !page) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <LayoutTemplate className="w-16 h-16 dark:text-slate-600 text-slate-300 mb-4" />
          <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-2">الصفحة غير موجودة</h1>
          <p className="dark:text-slate-400 text-slate-500 mb-6">الصفحة التي تبحث عنها غير موجودة أو غير منشورة</p>
          <Link href="/" className="px-5 py-2.5 rounded-xl gradient-bg text-white font-semibold text-sm hover:opacity-90 transition-opacity">
            الرئيسية
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="dark:bg-[#080d1a] bg-white transition-colors">
        <BlockRenderer blocks={page.blocks} />
      </div>
    </MainLayout>
  );
}
