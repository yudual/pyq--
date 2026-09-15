"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Trash2, Pin, PinOff, Heart, MessageSquare, ExternalLink, Plus } from "lucide-react";
import { apiFetch, getToken } from "@/lib/api-fetch";
import { Post } from "@/lib/mock-data";
import PostCard from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/Skeleton";
import { useSiteSettings } from "@/lib/site-settings-store";
import { PublishModal } from "@/components/TopBar";

const PAGE_SIZE = 20;

interface AdminPostsProps {
  defaultCategory?: string;
  title?: string;
  description?: string;
}

export default function AdminPosts({
  defaultCategory = "all",
  title = "动态管理",
  description,
}: AdminPostsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);
  const [showPublish, setShowPublish] = useState(false);
  const [page] = useState(1);
  const [, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [permId, setPermId] = useState<string | null>(null);

  const token = getToken();
  const fetchSettings = useSiteSettings((s) => s.fetchSettings);

  const fetchPosts = useCallback(() => {
    setLoading(true);
    setLoadError("");
    apiFetch(`/admin/posts?page=${page}&limit=${PAGE_SIZE}&type=moment`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "动态加载失败");
        }
        return res.json();
      })
      .then((data) => {
        const dataPosts = Array.isArray(data?.data) ? data.data : [];
        setPosts(dataPosts);
        setHasMore(data?.pagination?.hasMore ?? false);
      })
      .catch((err) => {
        console.error("加载动态列表异常:", err);
        setPosts([]);
        setHasMore(false);
        setLoadError(err instanceof Error ? err.message : "动态加载失败，请重试");
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条内容吗？")) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("删除失败");
      }
    } catch {
      alert("删除失败，网络错误");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePin = async (id: string, currentPinned: boolean) => {
    setPinningId(id);
    try {
      const res = await apiFetch(`/posts/${id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !currentPinned }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, pinned: !currentPinned } : p))
        );
        fetchSettings();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "操作失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPinningId(null);
    }
  };

  const handleTogglePermission = async (
    id: string,
    field: "likesDisabled" | "commentsDisabled",
    currentVal: boolean
  ) => {
    setPermId(id);
    try {
      const res = await apiFetch(`/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !currentVal }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, [field]: !currentVal } : p))
        );
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "操作失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPermId(null);
    }
  };

  if (loading) {
    return (
      <div className="divide-hairline rounded-xl bg-white dark:bg-adm-card">
        {Array.from({ length: 4 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-dashed border-adm-border bg-adm-card px-4 py-16 text-center">
        <p className="text-sm text-adm-danger">{loadError}</p>
        <button
          type="button"
          onClick={fetchPosts}
          className="mt-4 rounded-lg bg-adm-primary px-3 py-2 text-xs font-medium text-adm-primary-text transition-opacity hover:opacity-90"
        >
          重试
        </button>
      </div>
    );
  }

  // 严格过滤掉长文文章与项目作品，仅保留动态/岁岁念
  const momentPosts = posts.filter(
    (p) => p.type !== "article" && p.type !== "project" && p.category !== "项目"
  );
  const filteredPosts = momentPosts.filter((p) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "岁岁念") return p.category === "岁岁念" || !p.category;
    return p.category === selectedCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-adm-text">{title}</h2>
          <p className="mt-1 text-sm text-adm-text-secondary">
            {description || `共 ${filteredPosts.length} 条动态内容`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* 分类快捷筛选 */}
          <div className="flex items-center gap-1.5 rounded-xl border border-adm-border bg-adm-card p-1">
            {[
              { key: "all", label: "全部" },
              { key: "岁岁念", label: "岁岁念" },
              { key: "日常", label: "日常" },
              { key: "随想", label: "随想" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedCategory(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedCategory === tab.key
                    ? "bg-adm-primary text-adm-primary-text shadow-xs"
                    : "text-adm-text-secondary hover:text-adm-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {token && (
            <button
              type="button"
              onClick={() => setShowPublish(true)}
              className="flex items-center gap-1.5 rounded-xl bg-adm-primary px-3.5 py-2 text-xs font-medium text-adm-primary-text shadow-sm transition-all hover:opacity-90 active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              发布动态
            </button>
          )}
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-adm-border bg-adm-card py-12 text-center">
          <p className="text-sm text-adm-text-tertiary">暂无该分类内容</p>
        </div>
      ) : (
        <div className="gap-3 sm:columns-2">
          {filteredPosts.map((post, index) => (
            <div key={post.id} className="mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-adm-border bg-adm-card">
              <PostCard post={post} index={index} onDelete={() => handleDelete(post.id)} />
              <ActionBar
                post={post}
                permId={permId}
                pinningId={pinningId}
                deletingId={deletingId}
                onDelete={handleDelete}
                onPin={handlePin}
                onTogglePerm={handleTogglePermission}
              />
            </div>
          ))}
        </div>
      )}

      {showPublish && token && (
        <PublishModal
          token={token}
          defaultCategory="岁岁念"
          onClose={() => setShowPublish(false)}
          onPublished={() => {
            setShowPublish(false);
            fetchPosts();
          }}
        />
      )}
    </div>
  );
}

/** Admin action bar */
function ActionBar({
  post,
  permId,
  pinningId,
  deletingId,
  onDelete,
  onPin,
  onTogglePerm,
}: {
  post: Post;
  permId: string | null;
  pinningId: string | null;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onTogglePerm: (id: string, field: "likesDisabled" | "commentsDisabled", current: boolean) => void;
}) {
  const isProject = post.category === "项目" || post.type === "project";
  const isArticle = post.type === "article";
  const canonicalUrl = isProject
    ? `/projects/${post.shortId || post.id}`
    : isArticle
    ? `/articles/${post.shortId || post.id}`
    : `/moments/${post.shortId || post.id}`;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-adm-border bg-adm-card-hover/40 px-4 py-2.5">
      <Link
        href={canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-adm-text-secondary transition-colors hover:bg-adm-card-hover hover:text-adm-text cursor-pointer"
        title={`在前端预览${isProject ? "项目" : isArticle ? "文章" : "动态"}`}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        预览
      </Link>
      {!isProject && (
        <>
          <button
            onClick={() => onTogglePerm(post.id, "likesDisabled", !!post.likesDisabled)}
            disabled={permId === post.id}
            title={post.likesDisabled ? "已关闭点赞，点击开启" : "允许点赞，点击关闭"}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              post.likesDisabled
                ? "text-adm-danger bg-adm-danger-bg"
                : "text-adm-text-secondary hover:bg-adm-card-hover"
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            {post.likesDisabled ? "点赞已关" : "允许点赞"}
          </button>
          <button
            onClick={() => onTogglePerm(post.id, "commentsDisabled", !!post.commentsDisabled)}
            disabled={permId === post.id}
            title={post.commentsDisabled ? "已关闭评论，点击开启" : "允许评论，点击关闭"}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              post.commentsDisabled
                ? "text-adm-danger bg-adm-danger-bg"
                : "text-adm-text-secondary hover:bg-adm-card-hover"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {post.commentsDisabled ? "评论已关" : "允许评论"}
          </button>
        </>
      )}
      <div className="mx-1 h-4 w-px bg-adm-border" />
      <button
        onClick={() => onPin(post.id, !!post.pinned)}
        disabled={pinningId === post.id}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-adm-text-secondary transition-colors hover:bg-adm-card-hover disabled:opacity-50"
      >
        {post.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        {pinningId === post.id ? "处理中..." : post.pinned ? "取消置顶" : "置顶动态"}
      </button>
      <button
        onClick={() => onDelete(post.id)}
        disabled={deletingId === post.id}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-adm-danger transition-colors hover:bg-adm-danger-bg disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deletingId === post.id ? "删除中..." : "删除动态"}
      </button>
    </div>
  );
}
