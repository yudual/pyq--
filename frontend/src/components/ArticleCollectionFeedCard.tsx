"use client";

import { useState } from "react";
import Link from "next/link";
import { BookMarked, ChevronDown, ChevronUp, ArrowRight, Layers } from "lucide-react";
import type { Post } from "@/lib/mock-data";
import { formatExactDateTime } from "@/lib/mock-data";
import { resolveAvatar } from "@/lib/avatar";
import { resolveCoverImage } from "@/lib/post-image";
import { useSiteSettings } from "@/lib/site-settings-store";

interface ArticleCollectionFeedCardProps {
  post: Post;
  index?: number;
}

export default function ArticleCollectionFeedCard({ post, index }: ArticleCollectionFeedCardProps) {
  const [expanded, setExpanded] = useState(false);
  const authorName = post.author?.nickname || "博主";
  const authorAvatar = resolveAvatar(post.author?.avatar, post.author?.email || "", 96);
  const exactDateTime = formatExactDateTime(post.createdAt);

  const articles = post.collectionArticles || [];
  const totalArticles = articles.length;

  // 封面图处理（无封面即为空）
  const coverUrl = resolveCoverImage(post.cover, "");

  // 默认最多展示 3 篇，超出部分折叠
  const initialShowCount = 3;
  const showArticles = expanded || totalArticles <= initialShowCount
    ? articles
    : articles.slice(0, initialShowCount);

  // 第一篇文章链接
  const firstArticleUrl = articles.length > 0
    ? `/articles/${articles[0].shortId || articles[0].id}`
    : "#";

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
        {/* 顶部发布者与标签 */}
        <h3 className="flex items-center justify-between gap-2 text-[15px] font-medium leading-5 text-wechat-nickname md:text-[16px]">
          <span className="truncate">{authorName}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200/80 dark:border-blue-800/60 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 shadow-sm">
              <Layers className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              系列合辑 · {totalArticles} 篇
            </span>
            {post.pinned && (
              <span className="shrink-0 rounded-[4px] bg-[#ececec] px-2 py-0.5 text-[11px] font-medium leading-tight text-[#9a9a9a] dark:bg-white/[0.1] dark:text-[#9a9a9a]">
                置顶
              </span>
            )}
          </div>
        </h3>

        {/* 合辑导语/摘要 */}
        {post.excerpt && (
          <p className="mt-1 text-[15px] leading-[23px] text-wechat-text md:text-[16px] md:leading-[24px]">
            {post.excerpt}
          </p>
        )}

        {/* 系列合辑聚合卡片 */}
        <div className="mt-2.5 w-full overflow-hidden rounded-2xl border border-blue-100/90 dark:border-blue-900/40 bg-gradient-to-br from-[#f8faff] via-[#f5f8ff] to-[#edf3ff] dark:from-[#1b1e26] dark:via-[#191d27] dark:to-[#161a24] p-3.5 sm:p-4 shadow-sm transition-all duration-200 hover:shadow-md">
          {/* 合辑头部 Banner */}
          <div className="flex items-start gap-3 pb-3 border-b border-blue-100/70 dark:border-blue-900/30">
            {coverUrl ? (
              <div className="relative h-16 w-16 sm:h-18 sm:w-18 shrink-0 overflow-hidden rounded-xl border border-black/5 dark:border-white/10 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt={post.title || ""}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 sm:h-18 sm:w-18 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                <BookMarked className="h-8 w-8" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                <span>专题精选专栏</span>
                <span>·</span>
                <span>共 {totalArticles} 篇连续更新</span>
              </div>
              <h4 className="mt-0.5 text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2">
                {post.title || "精选系列文章合辑"}
              </h4>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                点击下列各章节即可快速跳转阅读
              </p>
            </div>
          </div>

          {/* 子文章章节列表 */}
          <div className="mt-3 space-y-1.5">
            {showArticles.map((article, idx) => {
              const articleUrl = `/articles/${article.shortId || article.id}`;
              const order = String(idx + 1).padStart(2, "0");
              return (
                <Link
                  key={article.id}
                  href={articleUrl}
                  className="group/item flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 bg-white/70 hover:bg-white dark:bg-neutral-800/40 dark:hover:bg-neutral-800/80 border border-blue-50/80 dark:border-neutral-700/30 transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-800/50 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-100/80 text-[11px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {order}
                    </span>
                    <span className="truncate text-sm font-medium text-neutral-800 group-hover/item:text-blue-600 dark:text-neutral-200 dark:group-hover/item:text-blue-400 transition-colors">
                      {article.title || "无标题文章"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs text-neutral-400 dark:text-neutral-500">
                    {article.category && (
                      <span className="hidden sm:inline-block rounded bg-neutral-100 dark:bg-neutral-700/50 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-400">
                        {article.category}
                      </span>
                    )}
                    <span className="group-hover/item:translate-x-0.5 transition-transform text-blue-600 dark:text-blue-400 flex items-center gap-0.5 text-xs font-medium">
                      阅读 <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* 展开/收起按钮（当文章多于 3 篇时） */}
          {totalArticles > initialShowCount && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
            >
              {expanded ? (
                <>
                  <span>收起部分章节</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>展开剩余 {totalArticles - initialShowCount} 篇章节</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}

          {/* 快捷跳转首篇阅读 */}
          <div className="mt-3 pt-2.5 border-t border-blue-100/60 dark:border-blue-900/30 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>支持按序连贯阅读</span>
            <Link
              href={firstArticleUrl}
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              从第一篇开始阅读 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 底部发布时间 */}
        <div className="mt-2.5 flex items-center justify-between text-[13px] text-wechat-time md:text-[14px]">
          <time dateTime={post.createdAt} title={post.createdAt}>{exactDateTime}</time>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            系列收纳
          </span>
        </div>
      </div>
    </article>
  );
}
