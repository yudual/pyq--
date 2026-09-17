"use client";

import Link from "next/link";
import { Calendar, Eye, Clock, ArrowRight, Folder, Pin, BookOpen, Heart, MessageSquare } from "lucide-react";
import { Post, formatExactDateTime } from "@/lib/mock-data";
import { toAbsoluteUrl } from "@/lib/upload";
import { useSiteSettings } from "@/lib/site-settings-store";
import { resolveAvatar } from "@/lib/avatar";
import { stripMarkdownAndHtml } from "@/lib/frontmatter";
import { resolveCoverImage } from "@/lib/post-image";

interface ArticleFeedCardProps {
  post: Post;
  index?: number;
  variant?: "standalone" | "feed";
}

const ARTICLE_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  original: {
    label: "原创",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
  },
  repost: {
    label: "转载",
    className: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
  },
  ai: {
    label: "AI创作",
    className: "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
  },
};

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

export default function ArticleFeedCard({ post, index, variant = "standalone" }: ArticleFeedCardProps) {
  const detailUrl = `/articles/${post.shortId || post.id}`;
  const defaultCover = useSiteSettings((s) => s.defaultCover);
  const coverUrl = resolveCoverImage(post.cover, post.content, defaultCover);

  // 提取纯净正文摘要（自动消除 Frontmatter、HTML 标签与 Markdown 标记）
  let plainText = post.content ? stripMarkdownAndHtml(post.content) : "";
  if (post.title && plainText.startsWith(post.title.trim())) {
    plainText = plainText.slice(post.title.trim().length).trim();
  }

  const rawExcerpt = post.excerpt?.trim();
  const cleanExcerpt = rawExcerpt ? stripMarkdownAndHtml(rawExcerpt) : "";
  const isJunkExcerpt = !cleanExcerpt || /^---\s*(?:title|category|tags|articleType):/i.test(rawExcerpt || "");
  const excerpt = (!isJunkExcerpt && cleanExcerpt !== post.title?.trim() ? cleanExcerpt : "") || (plainText ? plainText.slice(0, 160) + (plainText.length > 160 ? "…" : "") : "");

  // 估算阅读时间与字数
  const charCount = plainText.length;
  const readMinutes = Math.max(1, Math.ceil(charCount / 350));

  const typeBadge = ARTICLE_TYPE_BADGES[post.articleType || "original"] || ARTICLE_TYPE_BADGES.original;
  const exactDateTime = formatExactDateTime(post.createdAt);
  const authorName = post.author?.nickname || "博主";

  if (variant === "feed") {
    const authorAvatar = resolveAvatar(post.author?.avatar, post.author?.email || "", 96);
    return (
      <article
        id={`post-${post.id}`}
        className="flex gap-3 px-4 py-4 sm:px-5 md:px-6 animate-fade-in-up scroll-mt-16"
        style={typeof index === "number" ? { animationDelay: `${index * 60}ms` } : undefined}
      >
        {/* Avatar */}
        <Link
          href="/archives"
          className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-[5px] bg-wechat-bubble md:h-11 md:w-11"
          aria-label={`查看${authorName}的归档`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-full w-full object-cover"
          />
        </Link>

        {/* Content column */}
        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <h3 className="flex items-center justify-between gap-2 text-[15px] font-medium leading-5 text-wechat-nickname md:text-[16px]">
            <span className="truncate">{authorName}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800/80 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                #{post.category || "文章"}
              </span>
              {post.pinned && (
                <span className="shrink-0 rounded-[4px] bg-[#ececec] px-2 py-0.5 text-[11px] font-medium leading-tight text-[#9a9a9a] dark:bg-white/[0.1] dark:text-[#9a9a9a]">
                  置顶
                </span>
              )}
            </div>
          </h3>

          {/* 文章配文 / 摘录 */}
          {excerpt && (
            <p className="mt-1 text-[15px] leading-[23px] text-wechat-text md:text-[16px] md:leading-[24px] line-clamp-3">
              {excerpt}
            </p>
          )}

          {/* 微信公众号长文卡片样式 */}
          <Link
            href={detailUrl}
            className="group/card mt-2.5 flex w-full max-w-[360px] sm:max-w-[420px] items-stretch overflow-hidden rounded-xl border border-black/[0.06] bg-[#f7f7f7] transition-all duration-200 hover:bg-[#eaeaea] hover:border-black/10 dark:border-white/[0.08] dark:bg-[#25252b] dark:hover:bg-[#2e2e36] dark:hover:border-white/15"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-black/5 dark:bg-white/5 sm:h-22 sm:w-22">
              {coverUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={coverUrl}
                  alt={post.title || ""}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-400">
                  <BookOpen className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between p-2.5 sm:p-3">
              <div>
                <p className="line-clamp-1 text-sm font-semibold text-neutral-900 group-hover/card:text-emerald-700 dark:text-neutral-100 dark:group-hover/card:text-emerald-400">
                  {post.title || "无标题文章"}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {plainText || "深度博文阅读"}
                </p>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {readMinutes} 分钟阅读
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 group-hover/card:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                  阅读全文 <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Time & canonical detail action */}
          <div className="mt-2.5 flex items-center justify-between text-[13px] text-wechat-time md:text-[14px]">
            <time dateTime={post.createdAt} title={post.createdAt}>{exactDateTime}</time>
            <Link
              href={detailUrl}
              className="text-xs text-neutral-400 hover:text-emerald-600 dark:text-neutral-500 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
            >
              <span>查看文章</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-neutral-900/70 p-5 sm:p-7 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-black/15 dark:hover:border-white/20 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] hover:-translate-y-0.5"
      style={typeof index === "number" ? { animationDelay: `${index * 60}ms` } : undefined}
    >
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start justify-between">
        {/* 主要文字内容区：桌面左侧 / 移动端在封面后 */}
        <div className="order-2 sm:order-1 min-w-0 flex-1 flex flex-col justify-between self-stretch">
          <div>
            {/* 元信息：置顶、分类、原创徽章、发布日期、阅读时间 */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              {post.pinned && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 px-2 py-0.5 text-[11px] font-medium">
                  <Pin className="h-3 w-3" />
                  置顶
                </span>
              )}

              {post.category && (
                <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                  <Folder className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
                  {post.category}
                </span>
              )}

              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${typeBadge.className}`}>
                {typeBadge.label}
              </span>

              {exactDateTime && (
                <span
                  className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400"
                  title={post.createdAt}
                >
                  <Calendar className="h-3 w-3" />
                  <time dateTime={post.createdAt}>{exactDateTime}</time>
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-neutral-400 dark:text-neutral-500">
                <Clock className="h-3 w-3" />
                <span>约 {readMinutes} 分钟</span>
              </span>
            </div>

            {/* 文章标题 */}
            <h2 className="mb-2.5 text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-snug break-words">
              <Link
                href={detailUrl}
                className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 line-clamp-2"
              >
                {post.title || "无标题文章"}
              </Link>
            </h2>

            {/* 摘要正文 */}
            <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 break-words">
              {excerpt || "暂无摘要"}
            </p>
          </div>

          {/* 底部元信息条：作者、阅读量、点赞数、评论数与阅读全文链接 */}
          <div className="mt-5 pt-3.5 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 gap-2 flex-wrap">
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {authorName}
              </span>

              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5 text-neutral-400" />
                <span>{post.viewCount || 0}</span>
              </span>

              {typeof post.likes?.length === "number" && post.likes.length > 0 && (
                <span className="inline-flex items-center gap-1 text-neutral-400 dark:text-neutral-500">
                  <Heart className="h-3 w-3" />
                  <span>{post.likes.length}</span>
                </span>
              )}

              {typeof post.comments?.length === "number" && post.comments.length > 0 && (
                <span className="inline-flex items-center gap-1 text-neutral-400 dark:text-neutral-500">
                  <MessageSquare className="h-3 w-3" />
                  <span>{post.comments.length}</span>
                </span>
              )}
            </div>

            <Link
              href={detailUrl}
              className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors group-hover:translate-x-0.5 transition-transform shrink-0"
            >
              <span>阅读全文</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* 封面图：移动端在上方 (order-1)，桌面在右侧 (order-2) */}
        {coverUrl && (
          <Link
            href={detailUrl}
            tabIndex={-1}
            aria-hidden="true"
            className="order-1 sm:order-2 w-full sm:w-44 md:w-52 aspect-[16/9] sm:aspect-[4/3] shrink-0 overflow-hidden rounded-xl border border-black/5 dark:border-white/10 bg-neutral-100 dark:bg-neutral-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={post.title || "文章封面"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
        )}
      </div>
    </article>
  );
}
