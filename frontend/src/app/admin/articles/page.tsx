"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { PenLine, Trash2, Loader2, FileText, ExternalLink, Pin, PinOff, Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { formatArticleTime } from "@/lib/mock-data";

import { useSiteSettings } from "@/lib/site-settings-store";
import { stripMarkdownAndHtml } from "@/lib/frontmatter";
import { resolveCoverImage } from "@/lib/post-image";
import { notifyContentUpdated } from "@/lib/content-sync";


interface ArticleListItem {
  id: string;
  shortId: string;
  type: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
  content: string;
  articleType: "original" | "repost" | "ai";
  repostUrl: string;
  pinned: boolean;
  status: "published" | "draft";
  createdAt: string;
  author: string;
}

const ARTICLE_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  original: { label: "原创", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
  repost: { label: "转载", cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
  ai: { label: "AI", cls: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400" },
};

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pinning, setPinning] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const defaultCover = useSiteSettings((s) => s.defaultCover);

  const fetchArticles = useCallback(async (p: number) => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await apiFetch(`/admin/posts?type=article&page=${p}&limit=20`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "文章加载失败");
      }
      const data = await res.json();
      const rawList: ArticleListItem[] = data.data || [];
      // 严格过滤掉“项目”分类，确保文章列表纯粹独立
      const cleanList = rawList.filter((item) => item.category !== "项目" && item.type !== "project");
      setArticles(cleanList);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("加载文章列表异常:", err);
      setArticles([]);
      setTotalPages(1);
      setLoadError(err instanceof Error ? err.message : "文章加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchArticles(1);
  }, [fetchArticles]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("确定删除这篇文章吗？")) return;
      setDeleting(id);
      try {
        const res = await apiFetch(`/posts/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("删除失败");
        setArticles((prev) => prev.filter((a) => a.id !== id));
        notifyContentUpdated();
      } catch (err) {
        alert(err instanceof Error ? err.message : "删除失败");
      } finally {
        setDeleting(null);
      }
    },
    []
  );

  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const handlePin = useCallback(
    async (id: string, currentPinned: boolean) => {
      setPinning(id);
      try {
        const res = await apiFetch(`/posts/${id}/pin`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned: !currentPinned }),
        });
        if (!res.ok) throw new Error("操作失败");
        const data = await res.json();
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, pinned: !!data.pinned } : a))
        );
        notifyContentUpdated();
      } catch (err) {
        alert(err instanceof Error ? err.message : "操作失败");
      } finally {
        setPinning(null);
      }
    },
    []
  );

  const handleToggleStatus = useCallback(
    async (id: string, currentStatus: "published" | "draft") => {
      const nextStatus = currentStatus === "published" ? "draft" : "published";
      setUpdatingStatusId(id);
      try {
        const res = await apiFetch(`/posts/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!res.ok) throw new Error("切换发布状态失败");
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a))
        );
        notifyContentUpdated();
      } catch (err) {
        alert(err instanceof Error ? err.message : "状态切换失败");
      } finally {
        setUpdatingStatusId(null);
      }
    },
    []
  );


  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (statusFilter === "published" && a.status !== "published") return false;
      if (statusFilter === "draft" && a.status !== "draft") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (a.title || "").toLowerCase().includes(q);
        const matchExcerpt = (a.excerpt || "").toLowerCase().includes(q);
        const matchCategory = (a.category || "").toLowerCase().includes(q);
        if (!matchTitle && !matchExcerpt && !matchCategory) return false;
      }
      return true;
    });
  }, [articles, statusFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-adm-text">文章管理</h1>
          <p className="mt-0.5 text-sm text-adm-text-secondary">
            管理已发布长文、分类与草稿
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <PenLine className="h-4 w-4" />
          写新文章
        </Link>
      </div>

      {/* 搜索与状态筛选工具栏 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* 状态筛选 Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-adm-border bg-adm-card p-1 self-start sm:self-auto">
          {[
            { key: "all", label: "全部", count: articles.length },
            { key: "published", label: "已发布", count: articles.filter((a) => a.status === "published").length },
            { key: "draft", label: "草稿箱", count: articles.filter((a) => a.status === "draft").length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key as "all" | "published" | "draft")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-adm-primary text-adm-primary-text shadow-xs"
                  : "text-adm-text-secondary hover:text-adm-text"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* 搜索框 */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-adm-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索文章标题或分类..."
            className="w-full rounded-xl border border-adm-border bg-adm-card pl-8 pr-8 py-1.5 text-xs text-adm-text placeholder:text-adm-text-tertiary focus:outline-none focus:ring-2 focus:ring-gray-400/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-adm-text-tertiary hover:text-adm-text cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Article list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-adm-text-tertiary" />
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-dashed border-adm-border bg-adm-card px-4 py-16 text-center">
          <p className="text-sm text-adm-danger">{loadError}</p>
          <button
            type="button"
            onClick={() => fetchArticles(page)}
            className="mt-4 rounded-lg bg-adm-primary px-3 py-2 text-xs font-medium text-adm-primary-text transition-opacity hover:opacity-90"
          >
            重试
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-adm-border bg-adm-card py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-adm-input">
            <FileText className="h-7 w-7 text-adm-text-tertiary" />
          </div>
          <p className="mt-3 text-sm text-adm-text-secondary">还没有文章</p>
          <Link
            href="/admin/articles/new"
            className="mt-4 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            写第一篇文章 →
          </Link>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-adm-border bg-adm-card py-16 text-center">
          <p className="text-sm text-adm-text-secondary">没有找到匹配的文章</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="mt-3 text-xs text-emerald-600 hover:underline"
          >
            重置筛选条件
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-xl border border-adm-border bg-adm-card p-4 transition-colors hover:bg-adm-card-hover"
              >
                {/* Cover: 移动端自适应高度，桌面端固定宽度 */}
                <div className="h-32 sm:h-20 w-full sm:w-32 shrink-0 overflow-hidden rounded-lg bg-adm-input">
                  {(() => {
                    const coverSrc = resolveCoverImage(article.cover, article.content, defaultCover);
                    return coverSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverSrc}
                        alt={article.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FileText className="h-6 w-6 text-adm-text-tertiary" />
                      </div>
                    );
                  })()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-sm sm:text-base text-adm-text">
                          {article.title || "无标题"}
                        </h3>
                        {ARTICLE_TYPE_BADGE[article.articleType] && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${ARTICLE_TYPE_BADGE[article.articleType].cls}`}>
                            {ARTICLE_TYPE_BADGE[article.articleType].label}
                          </span>
                        )}
                        {article.status === "draft" && (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                            草稿
                          </span>
                        )}
                        {article.pinned && (
                          <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-500/15 dark:text-green-400">
                            置顶
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-adm-text-secondary break-words">
                        {stripMarkdownAndHtml(article.excerpt || article.content || "") || "无摘要"}
                      </p>
                    </div>

                    {/* Actions on desktop */}
                    <div className="hidden sm:flex shrink-0 items-center gap-1">
                      {article.status === "published" && (
                        <Link
                          href={`/articles/${article.shortId || article.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-adm-text-secondary transition-colors hover:bg-adm-input hover:text-adm-text cursor-pointer"
                          title="查看文章"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                      {article.status === "published" && (
                        <button
                          type="button"
                          onClick={() => handlePin(article.id, !!article.pinned)}
                          disabled={pinning === article.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-adm-text-secondary transition-colors hover:bg-adm-input hover:text-adm-text disabled:opacity-50 cursor-pointer"
                          title={article.pinned ? "取消置顶" : "置顶"}
                        >
                          {pinning === article.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : article.pinned ? (
                            <PinOff className="h-4 w-4" />
                          ) : (
                            <Pin className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {/* 一键切换发布/草稿状态 */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(article.id, article.status)}
                        disabled={updatingStatusId === article.id}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer flex items-center gap-1 shrink-0 ${
                          article.status === "draft"
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/40"
                        }`}
                        title={article.status === "draft" ? "一键发布此草稿" : "下架并转为草稿"}
                      >
                        {updatingStatusId === article.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : null}
                        <span>{article.status === "draft" ? "发布" : "下架"}</span>
                      </button>
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-adm-text-secondary transition-colors hover:bg-adm-input hover:text-adm-text cursor-pointer"
                        title="编辑"
                      >
                        <PenLine className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(article.id)}
                        disabled={deleting === article.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-adm-text-secondary transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10 cursor-pointer"
                        title="删除"
                      >
                        {deleting === article.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Bottom bar with tags + date + mobile actions */}
                  <div className="mt-3 flex items-center justify-between border-t border-adm-border/50 pt-2.5 text-xs text-adm-text-tertiary">
                    <div className="flex items-center gap-2">
                      {article.category && (
                        <span className="rounded bg-adm-input px-1.5 py-0.5">
                          {article.category}
                        </span>
                      )}
                      <span>
                        {formatArticleTime(article.createdAt)}
                      </span>
                    </div>

                    {/* Actions on mobile */}
                    <div className="flex sm:hidden items-center gap-1">
                      {article.status === "published" && (
                        <Link
                          href={`/articles/${article.shortId || article.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 w-7 items-center justify-center rounded text-adm-text-secondary hover:bg-adm-input"
                          title="查看"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      {article.status === "published" && (
                        <button
                          type="button"
                          onClick={() => handlePin(article.id, !!article.pinned)}
                          disabled={pinning === article.id}
                          className="flex h-7 w-7 items-center justify-center rounded text-adm-text-secondary hover:bg-adm-input"
                          title={article.pinned ? "取消置顶" : "置顶"}
                        >
                          {article.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(article.id, article.status)}
                        disabled={updatingStatusId === article.id}
                        className={`px-2 py-0.5 text-[11px] rounded font-medium transition cursor-pointer shrink-0 ${
                          article.status === "draft"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/40"
                        }`}
                        title={article.status === "draft" ? "发布" : "下架"}
                      >
                        <span>{article.status === "draft" ? "发布" : "下架"}</span>
                      </button>
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="flex h-7 w-7 items-center justify-center rounded text-adm-text-secondary hover:bg-adm-input"
                        title="编辑"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(article.id)}
                        disabled={deleting === article.id}
                        className="flex h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const p = Math.max(1, page - 1);
                  setPage(p);
                  fetchArticles(p);
                }}
                disabled={page <= 1}
                className="rounded-lg border border-adm-border px-3 py-1.5 text-sm text-adm-text-secondary transition-colors hover:bg-adm-card-hover disabled:opacity-50 cursor-pointer"
              >
                上一页
              </button>
              <span className="px-3 text-sm text-adm-text-secondary">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => {
                  const p = Math.min(totalPages, page + 1);
                  setPage(p);
                  fetchArticles(p);
                }}
                disabled={page >= totalPages}
                className="rounded-lg border border-adm-border px-3 py-1.5 text-sm text-adm-text-secondary transition-colors hover:bg-adm-card-hover disabled:opacity-50 cursor-pointer"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
