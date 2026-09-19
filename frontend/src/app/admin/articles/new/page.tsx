import type { Metadata } from "next";
import ArticleEditorPage from "@/components/admin/ArticleEditorPage";

export const metadata: Metadata = {
  title: "写文章 - 管理后台",
};

export default function NewArticlePage() {
  // 确保从已有文章编辑页进入“新建”时不会复用编辑器实例状态。
  return <ArticleEditorPage key="new-article" />;
}
