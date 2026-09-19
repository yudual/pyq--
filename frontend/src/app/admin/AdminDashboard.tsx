"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  BookText,
  MessageCircle,
  Heart,
  PenLine,
  Settings2,
  Images,
  Clock,
  Pin,
  ChevronRight,
  FolderOpen,
  ArrowUpRight,
} from "lucide-react";
import { apiFetch, getToken } from "@/lib/api-fetch";
import { renderTextWithEmoji } from "@/lib/emoji";

interface RecentArticle {
  id: string;
  shortId: string;
  title: string;
  excerpt: string;
  category: string;
  cover: string;
  status: "published" | "draft";
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RecentPost {
  id: string;
  content: string;
  createdAt: string;
  pinned: boolean;
  author: string;
}

interface RecentComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  postAuthor: string;
  postContent: string;
}

interface DashboardStats {
  users: number;
  posts: number;
  articles: number;
  draftArticles: number;
  comments: number;
  likes: number;
  recentArticles: RecentArticle[];
  recentPosts: RecentPost[];
  recentComments: RecentComment[];
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  if (typeof document === "undefined") return text;
  const txt = document.createElement("textarea");
  txt.innerHTML = text;
  return txt.value;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    apiFetch("/admin/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.articles === "number") {
          setStats({
            users: data.users || 0,
            posts: data.posts || 0,
            articles: data.articles || 0,
            draftArticles: data.draftArticles || 0,
            comments: data.comments || 0,
            likes: data.likes || 0,
            recentArticles: data.recentArticles || [],
            recentPosts: data.recentPosts || [],
            recentComments: data.recentComments || [],
          });
        }
      })
      .catch((err) => {
        console.error("加载仪表盘数据异常:", err);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-adm-border border-t-adm-text" />
          <span className="text-xs text-adm-text-secondary">加载工作台概览...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "已发布文章",
      value: stats?.articles || 0,
      subText: "篇长文与系列",
      href: "/admin/articles",
      icon: BookText,
    },
    {
      label: "草稿箱待发",
      value: stats?.draftArticles || 0,
      subText: stats?.draftArticles ? "有未发布的创作草稿" : "草稿箱全部已清空",
      href: "/admin/articles?status=draft",
      icon: FolderOpen,
      highlight: (stats?.draftArticles || 0) > 0,
    },
    {
      label: "岁岁念与动态",
      value: stats?.posts || 0,
      subText: "条日常随笔记录",
      href: "/admin/posts",
      icon: FileText,
    },
    {
      label: "访客评论",
      value: stats?.comments || 0,
      subText: "条读者留言互动",
      href: "/admin/comments",
      icon: MessageCircle,
    },
    {
      label: "全站获赞",
      value: stats?.likes || 0,
      subText: "次读者点赞认同",
      href: "#",
      icon: Heart,
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* 顶部标题与快速写文章 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-adm-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-adm-text">工作台概览</h1>
          <p className="mt-0.5 text-xs text-adm-text-secondary">
            博客内容管理、近期创作进度与互动动态
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/articles"
            className="rounded-xl border border-adm-border bg-adm-card px-3.5 py-2 text-xs font-medium text-adm-text hover:bg-adm-card-hover transition-colors"
          >
            文章列表
          </Link>
          <Link
            href="/admin/articles/new"
            className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <PenLine className="h-3.5 w-3.5" />
            <span>撰写新文章</span>
          </Link>
        </div>
      </div>

      {/* 核心指标统计卡片 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`group flex flex-col justify-between rounded-2xl border p-4 transition-all hover:border-adm-text-tertiary ${
                card.highlight
                  ? "border-amber-300/80 bg-amber-50/40 dark:border-amber-700/60 dark:bg-amber-950/20"
                  : "border-adm-border bg-adm-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-adm-text-secondary">
                  {card.label}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-adm-input text-adm-text-tertiary group-hover:text-adm-text transition-colors">
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-adm-text">
                  {card.value}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-adm-text-tertiary">
                  {card.subText}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 常用管理入口 */}
      <div className="rounded-2xl border border-adm-border bg-adm-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-adm-text-tertiary">
            内容与频道快捷入口
          </span>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-adm-text-secondary hover:text-adm-text"
          >
            <span>访问博客前台</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { label: "写新文章", href: "/admin/articles/new", icon: PenLine },
            { label: "文章合辑", href: "/admin/articles", icon: BookText },
            { label: "动态与微语", href: "/admin/posts", icon: FileText },
            { label: "素材媒体库", href: "/admin/media", icon: Images },
            { label: "留言审核", href: "/admin/comments", icon: MessageCircle },
            { label: "全局设置", href: "/admin/settings", icon: Settings2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2.5 rounded-xl border border-adm-border/60 bg-adm-bg/60 p-2.5 text-xs text-adm-text hover:bg-adm-input hover:border-adm-border transition-colors"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-adm-card border border-adm-border text-adm-text-secondary">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 主面板分栏：左侧最近编辑文章，右侧最新互动与动态 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左侧两列：最近编辑文章 */}
        <div className="lg:col-span-2 rounded-2xl border border-adm-border bg-adm-card p-5 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-adm-border pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-adm-text-secondary" />
                <h2 className="text-sm font-semibold text-adm-text">最近撰写与编辑文章</h2>
              </div>
              <Link
                href="/admin/articles"
                className="text-xs text-adm-text-secondary hover:text-adm-text flex items-center gap-0.5"
              >
                <span>查看全部</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {stats?.recentArticles && stats.recentArticles.length > 0 ? (
              <div className="divide-y divide-adm-border/60">
                {stats.recentArticles.map((article) => (
                  <div
                    key={article.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/articles/${article.id}`}
                          className="font-medium text-sm text-adm-text hover:underline truncate"
                        >
                          {article.title || "无标题文章"}
                        </Link>
                        {article.status === "draft" && (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            草稿
                          </span>
                        )}
                        {article.pinned && (
                          <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            置顶
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-adm-text-tertiary">
                        {article.category && (
                          <span className="rounded bg-adm-input px-1.5 py-0.5 text-[11px]">
                            {article.category}
                          </span>
                        )}
                        <span>更新于 {timeAgo(article.updatedAt || article.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {article.status === "published" && (
                        <Link
                          href={`/articles/${article.shortId || article.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-adm-border px-2.5 py-1 text-xs text-adm-text-secondary hover:bg-adm-input hover:text-adm-text transition-colors"
                          title="前台新窗口浏览"
                        >
                          前台查看
                        </Link>
                      )}
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="rounded-lg bg-adm-primary px-3 py-1 text-xs font-medium text-adm-primary-text hover:opacity-90 transition"
                      >
                        继续编辑
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-adm-text-tertiary">
                暂无文章记录，随时可点击上方「撰写新文章」开始记录。
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-adm-border flex items-center justify-between text-xs text-adm-text-secondary">
            <span>支持实时自动解析 Frontmatter 与 GFM 格式</span>
            <Link href="/admin/articles/new" className="text-adm-text hover:underline">
              新建文章 →
            </Link>
          </div>
        </div>

        {/* 右侧单列：最新动态与最新评论 */}
        <div className="space-y-5">
          {/* 最新读者评论 */}
          <div className="rounded-2xl border border-adm-border bg-adm-card p-4">
            <div className="mb-3 flex items-center justify-between border-b border-adm-border pb-2.5">
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-adm-text-secondary" />
                <h3 className="text-xs font-semibold text-adm-text">最新读者评论</h3>
              </div>
              <Link href="/admin/comments" className="text-xs text-adm-text-secondary hover:text-adm-text">
                管理留言
              </Link>
            </div>

            {stats?.recentComments && stats.recentComments.length > 0 ? (
              <div className="space-y-2.5">
                {stats.recentComments.slice(0, 4).map((c) => (
                  <div key={c.id} className="rounded-xl bg-adm-bg/60 p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-adm-text">{c.author || "匿名读者"}</span>
                      <span className="text-[11px] text-adm-text-tertiary">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p
                      className="mt-1 line-clamp-2 text-adm-text-secondary"
                      dangerouslySetInnerHTML={{ __html: renderTextWithEmoji(c.content) }}
                    />
                    {c.postContent && (
                      <div className="mt-1 truncate text-[10px] text-adm-text-tertiary">
                        来自: {decodeHtmlEntities(c.postContent)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-adm-text-tertiary">暂无新的评论留言</p>
            )}
          </div>

          {/* 最新动态记录 */}
          <div className="rounded-2xl border border-adm-border bg-adm-card p-4">
            <div className="mb-3 flex items-center justify-between border-b border-adm-border pb-2.5">
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-adm-text-secondary" />
                <h3 className="text-xs font-semibold text-adm-text">最新动态随笔</h3>
              </div>
              <Link href="/admin/posts" className="text-xs text-adm-text-secondary hover:text-adm-text">
                动态管理
              </Link>
            </div>

            {stats?.recentPosts && stats.recentPosts.length > 0 ? (
              <div className="space-y-2">
                {stats.recentPosts.slice(0, 3).map((p) => (
                  <div key={p.id} className="rounded-xl border border-adm-border/50 p-2.5 text-xs">
                    <div className="flex items-center justify-between text-adm-text-tertiary text-[11px]">
                      <div className="flex items-center gap-1">
                        <span>{p.author || "作者"}</span>
                        {p.pinned && <Pin className="h-3 w-3 text-adm-text rotate-45" />}
                      </div>
                      <span>{timeAgo(p.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-adm-text-secondary">
                      {decodeHtmlEntities(p.content) || "(无文字内容)"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-adm-text-tertiary">暂无动态记录</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
