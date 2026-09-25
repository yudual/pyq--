"use client";
/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  PenLine,
  Trash2,
  Loader2,
  FileText,
  ExternalLink,
  Pin,
  PinOff,
  Search,
  X,
  Layers,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Unlink,
  Check,
  AlertCircle,
  CheckCircle2,
  Copy,
  ImageIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { formatArticleTime } from "@/lib/time-format";
import { stripMarkdownAndHtml } from "@/lib/frontmatter";
import { resolveCoverImage } from "@/lib/post-image";
import { notifyContentUpdated } from "@/lib/content-sync";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import QuickCoverModal from "@/components/admin/QuickCoverModal";

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
  collectionId?: string | null;
  collectionTitle?: string | null;
  hideInHome?: boolean;
  collectionPostIds?: string[] | null;
  createdAt: string;
  updatedAt?: string;
  author: string;
}

interface CollectionListItem {
  id: string;
  shortId: string;
  title: string;
  excerpt: string;
  cover: string;
  pinned: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  postIds: string[];
  articleCount: number;
  articles: Array<{
    id: string;
    shortId: string;
    title: string;
    cover: string;
  }>;
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
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [statusCounts, setStatusCounts] = useState<{ all: number; published: number; draft: number }>({
    all: 0,
    published: 0,
    draft: 0,
  });

  // 快捷封面修改弹窗目标
  const [quickCoverTarget, setQuickCoverTarget] = useState<ArticleListItem | null>(null);

  // 操作轻量反馈提示
  const [bannerFeedback, setBannerFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (type: "success" | "error", message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setBannerFeedback({ type, message });
    feedbackTimerRef.current = setTimeout(() => {
      setBannerFeedback(null);
      feedbackTimerRef.current = null;
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // 全局确认弹窗状态
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    confirmText: "确定",
    cancelText: "取消",
    danger: false,
    onConfirm: () => {},
  });

  // 多选状态与批量合辑
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [collections, setCollections] = useState<CollectionListItem[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [removingFromCol, setRemovingFromCol] = useState<string | null>(null);
  const [submittingCollection, setSubmittingCollection] = useState(false);

  // 合辑表单状态
  const [colTitle, setColTitle] = useState("");
  const [colExcerpt, setColExcerpt] = useState("");
  const [colCover, setColCover] = useState("");
  const [colPinned, setColPinned] = useState(false);
  const [orderedSelectedIds, setOrderedSelectedIds] = useState<string[]>([]);

  // 刷新状态计数
  const refreshStatusCounts = useCallback(async () => {
    try {
      const [allRes, pubRes, draftRes] = await Promise.all([
        apiFetch("/admin/posts?type=article&limit=1"),
        apiFetch("/admin/posts?type=article&status=published&limit=1"),
        apiFetch("/admin/posts?type=article&status=draft&limit=1"),
      ]);
      const [allData, pubData, draftData] = await Promise.all([
        allRes.ok ? allRes.json() : null,
        pubRes.ok ? pubRes.json() : null,
        draftRes.ok ? draftRes.json() : null,
      ]);
      setStatusCounts({
        all: allData?.pagination?.total || 0,
        published: pubData?.pagination?.total || 0,
        draft: draftData?.pagination?.total || 0,
      });
    } catch {
      // ignore
    }
  }, []);

  const fetchArticles = useCallback(
    async (p: number, currentSearch: string, currentStatus: "all" | "published" | "draft") => {
      setLoading(true);
      setLoadError("");
      try {
        const sFilter = currentStatus;
        const sQuery = currentSearch;
        const params = new URLSearchParams({
          type: "article",
          page: String(p),
          limit: "20",
        });
        if (sFilter !== "all") {
          params.set("status", sFilter);
        }
        if (sQuery.trim()) {
          params.set("keyword", sQuery.trim());
        }

        const res = await apiFetch(`/admin/posts?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "文章加载失败");
        }
        const data = await res.json();
        const rawList: ArticleListItem[] = data.data || [];
        const cleanList = rawList.filter((item) => item.category !== "项目" && item.type !== "project");
        setArticles(cleanList);
        // 翻页或筛选后，旧页面的选择不应继续参与合辑操作。
        setSelectedIds(new Set());
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || cleanList.length);
      } catch (err) {
        console.error("加载文章列表异常:", err);
        setArticles([]);
        setTotalPages(1);
        setTotalCount(0);
        setLoadError(err instanceof Error ? err.message : "文章加载失败，请重试");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const res = await apiFetch("/admin/collections");
      if (res.ok) {
        const json = await res.json();
        setCollections(json.data || []);
      }
    } catch (err) {
      console.error("加载合辑列表异常:", err);
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles(1, "", "all");
    fetchCollections();
    refreshStatusCounts();
  }, [fetchArticles, fetchCollections, refreshStatusCounts]);

  // 多选相关
  const handleToggleSelect = (id: string) => {
    const article = articles.find((item) => item.id === id);
    if (article?.collectionId || article?.status !== "published") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const selectableIds = articles
      .filter((article) => !article.collectionId && article.status === "published")
      .map((article) => article.id);
    if (selectableIds.length === 0) return;
    if (selectedIds.size === selectableIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  // 状态筛选切换
  const handleStatusFilterChange = (status: "all" | "published" | "draft") => {
    setStatusFilter(status);
    setPage(1);
    fetchArticles(1, searchQuery, status);
  };

  // 搜索回车或清空
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchArticles(1, searchQuery, statusFilter);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setPage(1);
    fetchArticles(1, "", statusFilter);
  };

  // 打开打包合辑弹窗
  const handleOpenCreateCollection = () => {
    const list = Array.from(selectedIds);
    if (list.length === 0) return;
    setOrderedSelectedIds(list);

    // 预填首篇文章信息
    const firstPost = articles.find((a) => a.id === list[0]);
    if (firstPost) {
      setColTitle(firstPost.title ? `${firstPost.title} 系列` : "精选系列合辑");
      setColExcerpt(stripMarkdownAndHtml(firstPost.excerpt || firstPost.content || "").slice(0, 100));
      const firstCover = articles.find((a) => list.includes(a.id) && a.cover)?.cover || "";
      setColCover(firstCover);
    }
    setColPinned(false);
    setShowCreateModal(true);
  };

  // 调整合辑内文章顺序
  const handleMoveOrder = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedSelectedIds.length) return;
    const next = [...orderedSelectedIds];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setOrderedSelectedIds(next);
  };

  // 提交创建合辑
  const handleSaveCollection = async () => {
    if (!colTitle.trim()) {
      showFeedback("error", "请输入合辑名称");
      return;
    }
    if (orderedSelectedIds.length === 0) {
      showFeedback("error", "请至少选择一篇文章");
      return;
    }

    setSubmittingCollection(true);
    try {
      const res = await apiFetch("/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: colTitle.trim(),
          excerpt: colExcerpt.trim(),
          cover: colCover.trim(),
          pinned: colPinned,
          postIds: orderedSelectedIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "创建合辑失败");
      }

      setShowCreateModal(false);
      setSelectedIds(new Set());
      await fetchArticles(page, searchQuery, statusFilter);
      await fetchCollections();
      refreshStatusCounts();
      notifyContentUpdated();
      showFeedback("success", `系列合辑《${colTitle.trim()}》创建成功，已在首页聚合展示`);
    } catch (err: any) {
      showFeedback("error", err.message || "创建合辑失败，请重试");
    } finally {
      setSubmittingCollection(false);
    }
  };

  // 单篇移出合辑
  const handleRemoveFromCollection = (article: ArticleListItem) => {
    if (!article.collectionId) return;

    setConfirmDialog({
      open: true,
      title: "移出合辑确认",
      message: `确定将《${article.title}》移出合辑吗？移出后该文章将恢复在首页独立展示。`,
      confirmText: "确认移出",
      danger: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        setRemovingFromCol(article.id);
        try {
          const res = await apiFetch(`/admin/collections/${article.collectionId}/remove-post`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId: article.id }),
          });
          if (!res.ok) throw new Error("移出合辑失败");
          showFeedback("success", `文章《${article.title}》已移出合辑`);
          await fetchArticles(page, searchQuery, statusFilter);
          await fetchCollections();
          notifyContentUpdated();
        } catch (err: any) {
          showFeedback("error", err.message || "移出合辑失败");
        } finally {
          setRemovingFromCol(null);
        }
      },
    });
  };

  // 解散合辑
  const handleDissolveCollection = (col: CollectionListItem) => {
    setConfirmDialog({
      open: true,
      title: "解散合辑确认",
      message: `确定解散合辑《${col.title}》吗？解散后合辑卡片将被移除，其中的 ${col.articleCount} 篇文章全部恢复在首页独立展示，文章内容绝不会被删除。`,
      confirmText: "确认解散",
      danger: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          const res = await apiFetch(`/admin/collections/${col.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("解散合辑失败");
          showFeedback("success", `合辑《${col.title}》已解散，所含文章已恢复在首页独立展示`);
          await fetchCollections();
          await fetchArticles(page, searchQuery, statusFilter);
          notifyContentUpdated();
        } catch (err: any) {
          showFeedback("error", err.message || "解散合辑失败");
        }
      },
    });
  };

  const handleDelete = useCallback(
    (article: ArticleListItem) => {
      setConfirmDialog({
        open: true,
        title: "删除文章确认",
        message: `确定彻底删除文章《${article.title || "无标题"}》吗？删除后内容将无法恢复。`,
        confirmText: "彻底删除",
        danger: true,
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          setDeleting(article.id);
          try {
            const res = await apiFetch(`/posts/${article.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("删除失败");
            showFeedback("success", `文章《${article.title || "无标题"}》已成功删除`);
            setArticles((prev) => prev.filter((a) => a.id !== article.id));
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(article.id);
              return next;
            });
            refreshStatusCounts();
            notifyContentUpdated();
          } catch (err) {
            showFeedback("error", err instanceof Error ? err.message : "删除失败");
          } finally {
            setDeleting(null);
          }
        },
      });
    },
    [refreshStatusCounts]
  );

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
        showFeedback("success", !currentPinned ? "文章已置顶" : "已取消置顶");
        notifyContentUpdated();
      } catch (err) {
        showFeedback("error", err instanceof Error ? err.message : "操作失败");
      } finally {
        setPinning(null);
      }
    },
    []
  );

  const handleCopyLink = useCallback((article: ArticleListItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/articles/${article.shortId || article.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        showFeedback("success", `已复制文章链接：${article.title}`);
      })
      .catch(() => {
        showFeedback("error", "复制链接失败，请手动复制");
      });
  }, []);

  const handleToggleStatus = useCallback(
    (article: ArticleListItem) => {
      const isPublished = article.status === "published";
      const nextStatus = isPublished ? "draft" : "published";

      const executeToggle = async () => {
        setUpdatingStatusId(article.id);
        try {
          const res = await apiFetch(`/posts/${article.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
          });
          if (!res.ok) throw new Error("切换发布状态失败");
          await fetchArticles(page, searchQuery, statusFilter);
          refreshStatusCounts();
          notifyContentUpdated();
          showFeedback(
            "success",
            nextStatus === "published"
              ? `文章《${article.title}》已正式发布`
              : `文章《${article.title}》已下架转为草稿`
          );
        } catch (err) {
          showFeedback("error", err instanceof Error ? err.message : "状态切换失败");
        } finally {
          setUpdatingStatusId(null);
        }
      };

      if (isPublished) {
        // 下架必须弹出确认弹窗
        setConfirmDialog({
          open: true,
          title: "下架文章为草稿",
          message: `确定将《${article.title}》下架为草稿吗？下架后前台将不再对访客展示该文章，随时可在草稿箱中重新发布。`,
          confirmText: "确认下架",
          danger: false,
          onConfirm: () => {
            setConfirmDialog((prev) => ({ ...prev, open: false }));
            executeToggle();
          },
        });
      } else {
        // 草稿直接正式发布
        executeToggle();
      }
    },
    [fetchArticles, page, searchQuery, statusFilter, refreshStatusCounts]
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-adm-text">文章与系列管理</h1>
          <p className="mt-0.5 text-sm text-adm-text-secondary">
            撰写长文、管理草稿，或勾选多篇建立首页文章合辑
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchCollections();
              setShowManageModal(true);
            }}
            className="adm-btn adm-btn--secondary"
          >
            <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>合辑管理 ({collections.length})</span>
          </button>
          <Link
            href="/admin/articles/new"
            className="adm-btn adm-btn--primary"
          >
            <PenLine className="h-4 w-4" />
            <span>写新文章</span>
          </Link>
        </div>
      </div>

      {/* 操作反馈横条 */}
      {bannerFeedback && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
            bannerFeedback.type === "success"
              ? "border border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "border border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
          }`}
        >
          {bannerFeedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{bannerFeedback.message}</span>
        </div>
      )}

      {/* 搜索与筛选工具栏 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* 状态筛选 Tabs & 全选按钮 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={articles.every((article) => article.collectionId || article.status !== "published")}
            className="flex items-center gap-1.5 rounded-xl border border-adm-border bg-adm-card px-3 py-1.5 text-xs font-medium text-adm-text hover:bg-adm-card-hover disabled:opacity-50 transition-colors"
          >
            {selectedIds.size > 0 && selectedIds.size === articles.filter((article) => !article.collectionId).length ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4 text-adm-text-tertiary" />
            )}
            <span>全选可加入合辑的文章 ({selectedIds.size})</span>
          </button>

          <div className="flex items-center gap-1 rounded-xl border border-adm-border bg-adm-card p-1">
            {[
              { key: "all", label: "全部", count: statusCounts.all },
              { key: "published", label: "已发布", count: statusCounts.published },
              { key: "draft", label: "草稿箱", count: statusCounts.draft },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusFilterChange(tab.key as "all" | "published" | "draft")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-adm-primary text-adm-primary-text shadow-xs"
                    : "text-adm-text-secondary hover:text-adm-text"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* 搜索表单（全库搜索） */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-adm-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="回车搜索文章标题或分类..."
            className="w-full rounded-xl border border-adm-border bg-adm-card pl-8 pr-8 py-1.5 text-xs text-adm-text placeholder:text-adm-text-tertiary focus:outline-none focus:ring-2 focus:ring-gray-400/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-adm-text-tertiary hover:text-adm-text cursor-pointer"
              title="清除搜索"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* 批量操作工具条浮层 (有勾选项时显示) */}
      {selectedIds.size > 0 && (
        <div className="sticky top-16 z-30 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/95 dark:bg-blue-950/80 p-3 sm:px-4 backdrop-blur-md shadow-md animate-fade-in-up">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {selectedIds.size}
            </span>
            <span>已选中 {selectedIds.size} 篇文章</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateCollection}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Layers className="h-4 w-4" />
              <span>建立文章合辑</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-xl border border-blue-200 dark:border-blue-800 bg-white/80 dark:bg-neutral-800/80 px-2.5 py-1.5 text-xs text-blue-700 dark:text-blue-300 hover:bg-white transition-colors"
            >
              取消勾选
            </button>
          </div>
        </div>
      )}

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
            onClick={() => fetchArticles(page, searchQuery, statusFilter)}
            className="mt-4 rounded-lg bg-adm-primary px-3 py-2 text-xs font-medium text-adm-primary-text transition-opacity hover:opacity-90"
          >
            重试
          </button>
        </div>
      ) : articles.length === 0 && (searchQuery.trim() || statusFilter !== "all") ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-adm-border bg-adm-card py-16 text-center">
          <p className="text-sm text-adm-text-secondary">没有找到匹配的文章</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setPage(1);
              fetchArticles(1, "", "all");
            }}
            className="mt-3 text-xs text-emerald-600 hover:underline cursor-pointer"
          >
            清除筛选条件并显示全部
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
            className="mt-4 adm-btn adm-btn--primary"
          >
            <PenLine className="h-4 w-4" />
            <span>写第一篇文章</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {articles.map((article) => {
              const isSelected = selectedIds.has(article.id);
              const isInCollection = !!article.collectionId;

              return (
                <div
                  key={article.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-blue-500/80 bg-blue-50/40 dark:border-blue-600/80 dark:bg-blue-950/20"
                      : "border-adm-border bg-adm-card hover:bg-adm-card-hover"
                  }`}
                >
                  {/* 复选框 Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleSelect(article.id)}
                    disabled={isInCollection || article.status !== "published"}
                    className="shrink-0 p-1 text-adm-text hover:text-blue-600 disabled:cursor-not-allowed transition-colors"
                    title={isInCollection ? "已在合辑中，不能重复加入" : article.status !== "published" ? "草稿发布后才能加入首页合辑" : isSelected ? "取消选择" : "勾选以批量建立合辑"}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className={`h-5 w-5 ${isInCollection || article.status !== "published" ? "text-adm-text-tertiary/40" : "text-adm-text-tertiary"}`} />
                    )}
                  </button>

                  {/* Cover (点击快捷修改封面) */}
                  <div
                    onClick={() => setQuickCoverTarget(article)}
                    className="group/cover relative h-32 sm:h-20 w-full sm:w-32 shrink-0 overflow-hidden rounded-lg bg-adm-input cursor-pointer border border-transparent hover:border-adm-primary transition-all"
                    title="点击快捷更换封面（无需进入文章编辑器）"
                  >
                    {(() => {
                      const coverSrc = resolveCoverImage(article.cover, article.content);
                      return coverSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverSrc}
                          alt={article.title}
                          className="h-full w-full object-cover transition-transform group-hover/cover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-adm-text-tertiary">
                          <FileText className="h-6 w-6" />
                          <span className="text-[10px] text-adm-primary font-medium">+ 设封面</span>
                        </div>
                      );
                    })()}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-medium backdrop-blur-xs">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>换封面</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch">
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

                          {/* 已加入合辑徽标 */}
                          {isInCollection && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                              <Layers className="h-3 w-3" />
                              已归入: {article.collectionTitle || "合辑"}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-adm-text-secondary break-words">
                          {stripMarkdownAndHtml(article.excerpt || article.content || "") || "无摘要"}
                        </p>
                      </div>

                      {/* Actions on desktop */}
                      <div className="hidden sm:flex shrink-0 items-center gap-1">
                        {/* 移出合辑快捷操作 */}
                        {isInCollection && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCollection(article)}
                            disabled={removingFromCol === article.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40 transition-colors"
                            title="从合辑中移出（恢复在首页独立展示）"
                          >
                            {removingFromCol === article.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Unlink className="h-3.5 w-3.5" />
                            )}
                            <span>移出合辑</span>
                          </button>
                        )}

                        {article.status === "published" && (
                          <Link
                            href={`/articles/${article.shortId || article.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="adm-icon-btn h-8 w-8 min-h-8 min-w-8"
                            title="前台新窗口浏览"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}

                        {article.status === "published" && (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(article)}
                            className="adm-icon-btn h-8 w-8 min-h-8 min-w-8"
                            title="复制文章公开链接"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}

                        {article.status === "published" && (
                          <button
                            type="button"
                            onClick={() => handlePin(article.id, !!article.pinned)}
                            disabled={pinning === article.id}
                            className="adm-icon-btn h-8 w-8 min-h-8 min-w-8"
                            title={article.pinned ? "取消置顶" : "首页置顶"}
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

                        {/* 状态动作按钮（发布 / 下架） */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(article)}
                          disabled={updatingStatusId === article.id}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer flex items-center gap-1 shrink-0 ${
                            article.status === "draft"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40"
                              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-300/40"
                          }`}
                          title={article.status === "draft" ? "正式发布此文章" : "下架此文章并转入草稿箱"}
                        >
                          {updatingStatusId === article.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : null}
                          <span>{article.status === "draft" ? "发布" : "下架"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQuickCoverTarget(article)}
                          className="flex items-center gap-1 rounded-lg border border-adm-border bg-adm-card px-2.5 py-1 text-xs font-medium text-adm-text hover:bg-adm-card-hover transition cursor-pointer"
                          title="快捷更换/设置封面"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                          <span>封面</span>
                        </button>

                        <Link
                          href={`/admin/articles/${article.id}`}
                          className="flex items-center gap-1 rounded-lg bg-adm-primary px-3 py-1 text-xs font-medium text-adm-primary-text hover:opacity-90 transition cursor-pointer"
                          title="进入编辑器"
                        >
                          <PenLine className="h-3.5 w-3.5" />
                          <span>编辑</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDelete(article)}
                          disabled={deleting === article.id}
                          className="adm-icon-btn adm-icon-btn--danger h-8 w-8 min-h-8 min-w-8"
                          title="彻底删除文章"
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
                        <span>{formatArticleTime(article.createdAt)}</span>
                        {isInCollection && (
                          <span className="text-blue-600 dark:text-blue-400">
                            (首页已由合辑代表显示)
                          </span>
                        )}
                      </div>

                      {/* Actions on mobile */}
                      <div className="flex sm:hidden items-center gap-1.5">
                        {isInCollection && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCollection(article)}
                            className="text-xs text-blue-600 hover:underline mr-1"
                          >
                            移出合辑
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setQuickCoverTarget(article)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-border bg-adm-card text-adm-text-secondary hover:bg-adm-card-hover"
                          title="快捷设置封面"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(article)}
                          disabled={updatingStatusId === article.id}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-adm-border bg-adm-card text-adm-text disabled:opacity-50"
                        >
                          {updatingStatusId === article.id && <Loader2 className="h-3 w-3 animate-spin" />}
                          {article.status === "draft" ? "发布" : "下架"}
                        </button>
                        {article.status === "published" && (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(article)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-border bg-adm-card text-adm-text-secondary hover:bg-adm-card-hover"
                            title="复制链接"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <Link
                          href={`/admin/articles/${article.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-border bg-adm-card text-adm-text-secondary hover:bg-adm-card-hover"
                          title="编辑"
                        >
                          <PenLine className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(article)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 dark:border-red-900/40 bg-adm-danger-bg text-adm-danger hover:bg-red-100 dark:hover:bg-red-950/50"
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  const p = Math.max(1, page - 1);
                  setPage(p);
                  fetchArticles(p, searchQuery, statusFilter);
                }}
                disabled={page <= 1}
                className="rounded-lg border border-adm-border bg-adm-card px-3 py-1.5 text-xs font-medium text-adm-text disabled:opacity-50 cursor-pointer"
              >
                上一页
              </button>
              <span className="text-xs text-adm-text-secondary">
                第 {page} / {totalPages} 页 (共 {totalCount} 篇)
              </span>
              <button
                type="button"
                onClick={() => {
                  const p = Math.min(totalPages, page + 1);
                  setPage(p);
                  fetchArticles(p, searchQuery, statusFilter);
                }}
                disabled={page >= totalPages}
                className="rounded-lg border border-adm-border bg-adm-card px-3 py-1.5 text-xs font-medium text-adm-text disabled:opacity-50 cursor-pointer"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* 弹窗 1：建立文章合辑 Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-adm-border bg-adm-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-adm-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-adm-text">建立文章合辑</h3>
                  <p className="text-xs text-adm-text-secondary">
                    合并选中的 {orderedSelectedIds.length} 篇文章为 1 个首页系列卡片展示
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-adm-text-tertiary hover:text-adm-text cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 合辑名称 */}
            <div>
              <label className="block text-xs font-medium text-adm-text mb-1">
                合辑标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                placeholder="例如：深入理解 Docker 系列 / 2026年终随笔专题"
                className="w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 text-sm text-adm-text placeholder:text-adm-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* 合辑简介/导读 */}
            <div>
              <label className="block text-xs font-medium text-adm-text mb-1">
                合辑简介 / 导读摘要
              </label>
              <textarea
                value={colExcerpt}
                onChange={(e) => setColExcerpt(e.target.value)}
                rows={2}
                placeholder="简述该系列的主要内容与阅读指引..."
                className="w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 text-xs text-adm-text placeholder:text-adm-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>

            {/* 封面图快速选择 */}
            <div>
              <label className="block text-xs font-medium text-adm-text mb-1.5">
                合辑封面选择（点击可直接套用选中文章的封面，或手动输入）
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {orderedSelectedIds.map((id) => {
                  const post = articles.find((a) => a.id === id);
                  if (!post?.cover) return null;
                  const isCurCover = colCover === post.cover;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setColCover(post.cover)}
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
                        isCurCover ? "border-blue-600 scale-95 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      title={post.title}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.cover} alt="" className="h-full w-full object-cover" />
                      {isCurCover && (
                        <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={colCover}
                onChange={(e) => setColCover(e.target.value)}
                placeholder="封面图 URL (留空将自动采用默认封面)"
                className="mt-1.5 w-full rounded-xl border border-adm-border bg-adm-input px-3 py-1.5 text-xs text-adm-text placeholder:text-adm-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* 是否在首页置顶 */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="colPinned"
                checked={colPinned}
                onChange={(e) => setColPinned(e.target.checked)}
                className="h-4 w-4 rounded border-adm-border text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="colPinned" className="text-xs font-medium text-adm-text cursor-pointer">
                在首页动态流中置顶此系列合辑卡片
              </label>
            </div>

            {/* 包含文章列表及排序调整 */}
            <div className="pt-2 border-t border-adm-border">
              <label className="block text-xs font-semibold text-adm-text mb-2">
                章节顺序调整（按此顺序在合辑卡片和文章导航中展示）：
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {orderedSelectedIds.map((id, index) => {
                  const post = articles.find((a) => a.id === id);
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-adm-input px-3 py-2 text-xs text-adm-text border border-adm-border/50"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-100 text-[11px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {index + 1}
                        </span>
                        <span className="truncate font-medium">{post?.title || "无标题文章"}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(index, "up")}
                          disabled={index === 0}
                          className="p-1 text-adm-text-secondary hover:text-adm-text disabled:opacity-20 cursor-pointer"
                          title="上移"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(index, "down")}
                          disabled={index === orderedSelectedIds.length - 1}
                          className="p-1 text-adm-text-secondary hover:text-adm-text disabled:opacity-20 cursor-pointer"
                          title="下移"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 确认提交按钮 */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-adm-border">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-adm-border px-4 py-2 text-xs font-medium text-adm-text hover:bg-adm-input transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveCollection}
                disabled={submittingCollection}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-medium transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submittingCollection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>确认建立合辑并在首页展示</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 2：合辑管理 Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-adm-border bg-adm-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-adm-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-adm-text">已创建的首页系列合辑</h3>
                  <p className="text-xs text-adm-text-secondary">
                    管理或解散首页合辑（解散后文章不被删除，仅恢复首页独立展示）
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="text-adm-text-tertiary hover:text-adm-text cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingCollections ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-adm-text-tertiary" />
              </div>
            ) : collections.length === 0 ? (
              <div className="py-12 text-center text-adm-text-secondary text-sm">
                目前还没有创建任何系列合辑。在文章列表勾选多篇文章即可打包创建。
              </div>
            ) : (
              <div className="space-y-3">
                {collections.map((col) => (
                  <div
                    key={col.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-adm-border bg-adm-input/60 p-3.5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-adm-text">
                          {col.title}
                        </span>
                        <span className="rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-medium">
                          共 {col.articleCount} 篇
                        </span>
                        {col.pinned && (
                          <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-500/15 dark:text-green-400">
                            首页置顶
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-adm-text-secondary line-clamp-1">
                        {col.excerpt || "暂无导语"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {col.articles.map((art, idx) => (
                          <span
                            key={art.id}
                            className="rounded bg-adm-card border border-adm-border/50 px-2 py-0.5 text-[11px] text-adm-text-secondary"
                          >
                            {idx + 1}. {art.title}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleDissolveCollection(col)}
                        className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        解散合辑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-adm-border">
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="rounded-xl border border-adm-border px-4 py-2 text-xs font-medium text-adm-text hover:bg-adm-input cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 快捷封面修改弹窗 */}
      {quickCoverTarget && (
        <QuickCoverModal
          open={!!quickCoverTarget}
          onClose={() => setQuickCoverTarget(null)}
          postId={quickCoverTarget.id}
          postTitle={quickCoverTarget.title}
          initialCover={quickCoverTarget.cover}
          content={quickCoverTarget.content}
          onSuccess={(newCover) => {
            setArticles((prev) =>
              prev.map((a) => (a.id === quickCoverTarget.id ? { ...a, cover: newCover } : a))
            );
            showFeedback("success", `文章《${quickCoverTarget.title || "无标题"}》封面已更新`);
          }}
        />
      )}

      {/* 统一二次确认弹窗 */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
