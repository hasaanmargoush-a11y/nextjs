"use client";

import { use } from "react";
import ArticleEditorPage from "@/components/admin/ArticleEditor/ArticleEditorPage";

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ArticleEditorPage articleId={parseInt(id, 10)} />;
}
