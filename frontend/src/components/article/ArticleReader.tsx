"use client";

import { useEffect, useState, useMemo } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import {
  Heart,
  Share2,
  MessageCircle,
  ExternalLink,
  Calendar,
  Eye,
  Clock,
  ArrowLeft,
  Check,
  Folder,
  Globe,
  Award,
  List,
  ChevronDown,
} from "lucide-react";
import { Post, formatArticleTime } from "@/lib/mock-data";
import { resolveAvatar } from "@/lib/avatar";
import { getCurrentUser, authFetchHeaders } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings-store";
import { toAbsoluteUrl } from "@/lib/upload";
import { stripMarkdownAndHtml } from "@/lib/frontmatter";
import { extractHeadings } from "@/lib/markdown";
import ArticleCommentSection from "@/components/article/ArticleCommentSection";
import ArticleEmbedContent from "@/components/article/ArticleEmbedContent";
import MusicEmbedCard from "@/components/article/MusicEmbedCard";
import VideoPlayer from "@/components/VideoPlayer";

import { PUBLIC_API_URL } from "@/lib/api-fetch";

const API_URL = PUBLIC_API_URL;

interface ArticleReaderProps {
  post: Post;
}

const ARTICLE_TYPE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; desc: string }
> = {
  original: {
    label: "原创",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    desc: "本文为博主原创，遵循署名-非商业性使用协议，转载请注明出处。",
  },
  repost: {
    label: "转载",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    desc: "本文为转载文章，版权归原作者所有。",
  },
  ai: {
    label: "AI创作",
    badgeClass:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
    desc: "本文部分或全部内容由人工智能辅助创作。",
  },
};

/** 滚动到留言编辑器：桌面端用 #scroll-root，移动端用 window / scrollIntoView */
function scrollToCommentEditor(editor: HTMLElement) {
  const scrollRoot = document.getElementById("scroll-root");
  if (scrollRoot && window.innerWidth >= 768) {
    const scrollRect = scrollRoot.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const offset = 80;
    const top = scrollRoot.scrollTop + (editorRect.top - scrollRect.top) - offset;
    scrollRoot.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  } else {
    editor.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export default function ArticleReader({ post }: ArticleReaderProps) {
  const [likes, setLikes] = useState<Array<{ name: string; email?: string }>>(
    post.likes || []
  );
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [viewCount, setViewCount] = useState(post.viewCount || 0);
  const [focusSignal, setFocusSignal] = useState(0);
  const [copied, setCopied] = useState(false);

  const siteName = useSiteSettings((s) => s.siteName);

  useEffect(() => {
    setLiked(!!post.meLiked);
  }, [post.id, post.meLiked]);

  useEffect(() => {
    setComments(post.comments || []);
  }, [post.comments]);

  useEffect(() => {
    const email =
      (typeof window !== "undefined" &&
        localStorage.getItem("visitor_email")) ||
      "";
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    params.set("view", "1");
    const url = `${API_URL}/posts/${post.id}?${params.toString()}`;
    fetch(url, {
      cache: "no-store",
      credentials: "include",
      headers: authFetchHeaders(),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (typeof data.meLiked === "boolean") setLiked(data.meLiked);
        if (Array.isArray(data.likes)) setLikes(data.likes);
        if (Array.isArray(data.comments)) setComments(data.comments);
        if (typeof data.viewCount === "number") setViewCount(data.viewCount);
      })
      .catch(() => {});
  }, [post.id]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const scrollRoot = document.getElementById("scroll-root");
    if (scrollRoot) scrollRoot.scrollTop = 0;
  }, [post.id]);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const prevLiked = liked;
    setLiked(!prevLiked);
    const user = getCurrentUser();
    const name = user?.nickname || "访客";
    const email = user?.email || "";
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (user?.isLoggedIn && user.token) {
        headers.Authorization = `Bearer ${user.token}`;
      }
      const res = await fetch(`${API_URL}/posts/${post.id}/likes`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ name, email }),
      });
      if (res.status === 403) {
        setLiked(prevLiked);
        const data = await res.json().catch(() => ({}));
        if (data?.message) alert(data.message);
        return;
      }
      if (!res.ok) {
        setLiked(prevLiked);
        return;
      }
      const data = await res.json();
      setLiked(data.liked);
      if (Array.isArray(data.likes)) setLikes(data.likes);
    } catch {
      setLiked(prevLiked);
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: post.title || "文章", url });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {}
    }
  };

  const handleCommentClick = () => {
    const existingEditor =
      document.querySelector<HTMLDivElement>(".comment-editor");
    if (existingEditor) {
      existingEditor.focus();
      requestAnimationFrame(() => scrollToCommentEditor(existingEditor));
    } else {
      flushSync(() => setFocusSignal((n) => n + 1));
      const editor =
        document.querySelector<HTMLDivElement>(".comment-editor");
      if (editor) {
        editor.focus();
        requestAnimationFrame(() => scrollToCommentEditor(editor));
      }
    }
  };

  const handleCommentsChange = (next: typeof comments) => {
    setComments(next);
  };

  const authorName = post.author?.nickname || "博主";
  const authorAvatar = resolveAvatar(
    post.author?.avatar,
    post.author?.email || "",
    80
  );
  const coverUrl = post.cover && post.cover.trim() ? toAbsoluteUrl(post.cover.trim()) : "";

  const typeConfig =
    ARTICLE_TYPE_CONFIG[post.articleType || "original"] ||
    ARTICLE_TYPE_CONFIG.original;

  // 估算正文字数与预计阅读时间（纯正文，剔除 Frontmatter、注释与 Markdown 符号）
  const plainText = useMemo(() => {
    return stripMarkdownAndHtml(post.content || "");
  }, [post.content]);
  const charCount = plainText.length;
  const readMinutes = Math.max(1, Math.ceil(charCount / 350));

  const pageUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/articles/${post.shortId || post.id}`;

  // 提取正文标题供折叠大纲导航使用（全量支持 Markdown 与 HTML）
  const extractedHeadings = useMemo(() => {
    return extractHeadings(post.content || "");
  }, [post.content]);

  const handleHeadingClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const scrollRoot = document.getElementById("scroll-root");
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (scrollRoot && isDesktop && scrollRoot.scrollHeight > scrollRoot.clientHeight) {
      const scrollRect = scrollRoot.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const top = scrollRoot.scrollTop + (elRect.top - scrollRect.top) - 84;
      scrollRoot.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    } else {
      const elRect = el.getBoundingClientRect();
      const top = window.scrollY + elRect.top - 84;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  };

  return (
    <article className="w-full">
      {/* 博客文章头部区 */}
      <header className="mb-8 border-b border-black/[0.06] dark:border-white/[0.08] pb-6 sm:pb-8">
        {/* 顶部导航与分类 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link
            href="/articles"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-3 py-1 font-medium text-neutral-600 hover:text-emerald-600 dark:text-neutral-300 dark:hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>返回文章列表</span>
          </Link>

          <div className="flex items-center gap-2">
            {post.category && (
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                <Folder className="h-3 w-3 text-neutral-400" />
                {post.category}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${typeConfig.badgeClass}`}
            >
              {typeConfig.label}
            </span>
          </div>
        </div>

        {/* 博客大标题 */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight sm:leading-snug md:leading-[1.2]">
          {post.title || "无标题文章"}
        </h1>

        {/* 完备的文章元信息栏 */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          {/* 作者信息 */}
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={authorAvatar}
              alt={authorName}
              className="h-6 w-6 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
            />
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {authorName}
            </span>
          </div>

          <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />

          {/* 发布日期 */}
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <time dateTime={post.createdAt}>
              {formatArticleTime(post.createdAt)}
            </time>
          </span>

          <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />

          {/* 阅读量统计 */}
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            <span>{viewCount} 次阅读</span>
          </span>

          <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />

          {/* 预计阅读时间与字数 */}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>约 {readMinutes} 分钟 · {charCount} 字</span>
          </span>

          {post.region && (
            <>
              <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <span>IP属地: {post.region}</span>
            </>
          )}
        </div>

        {/* 转载来源提示卡 */}
        {post.articleType === "repost" && post.repostUrl && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs">
            <Globe className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <span className="text-neutral-600 dark:text-neutral-400">
                本文转载自网络，原文链接：
              </span>
              <a
                href={post.repostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 font-medium text-emerald-600 dark:text-emerald-400 hover:underline break-all"
              >
                {post.repostUrl}
              </a>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          </div>
        )}

        {/* 文章题图（Hero Image） */}
        {coverUrl && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={post.title || "文章题图"}
              className="max-h-[420px] w-full object-cover"
            />
          </div>
        )}

        {/* 响应式折叠式大纲导航（移动端、平板与普通屏幕） */}
        {extractedHeadings.length > 0 && (
          <details className="mt-6 group rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-900/40 p-4 transition-all">
            <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none">
              <span className="flex items-center gap-2">
                <List className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>文章大纲 · 章节导航 ({extractedHeadings.length})</span>
              </span>
              <ChevronDown className="h-4 w-4 text-neutral-400 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <nav className="mt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 pt-3 space-y-1">
              {extractedHeadings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  onClick={(e) => handleHeadingClick(e, h.id)}
                  className={`block rounded-lg px-2.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ${
                    h.level === 3 ? "ml-4" : "font-medium"
                  }`}
                >
                  {h.text}
                </a>
              ))}
            </nav>
          </details>
        )}
      </header>

      {/* 正文内容（含内联音乐/视频/富文本） */}
      <section className="min-h-[240px]">
        <ArticleEmbedContent
          content={post.content}
          postId={post.id}
          title={post.title}
          className="article-content rich-content text-[16px] sm:text-[17px] md:text-[18px] leading-[1.85] text-neutral-800 dark:text-neutral-200"
        />

        {/* 旧数据兼容：post.music / post.video 独立字段 */}
        {post.music && (
          <div className="my-6">
            <MusicEmbedCard music={post.music} postId={post.id} />
          </div>
        )}
        {post.video && (
          <div className="my-6">
            <VideoPlayer video={post.video} postId={post.id} />
          </div>
        )}
      </section>

      {/* 正文后普通操作区（非微信公众号式的 fixed 底部栏） */}
      <section className="mt-12 sm:mt-16 pt-8 border-t border-black/[0.06] dark:border-white/[0.08]">
        {/* 核心互动按钮组：点赞、分享、参与讨论 */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {/* 点赞大按钮 */}
          {!post.likesDisabled && (
            <button
              type="button"
              onClick={handleLike}
              disabled={liking}
              className={`group flex items-center gap-2.5 px-6 py-3 rounded-full border text-sm font-medium transition-all duration-200 shadow-xs cursor-pointer active:scale-95 ${
                liked
                  ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400"
                  : "border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:border-rose-300 dark:hover:border-rose-800 hover:text-rose-600 dark:hover:text-rose-400"
              }`}
            >
              <Heart
                className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                  liked ? "fill-current text-rose-500" : ""
                }`}
              />
              <span>{liked ? "已喜欢" : "赞一个"}</span>
              <span className="rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs">
                {likes.length}
              </span>
            </button>
          )}

          {/* 分享按钮 */}
          <button
            type="button"
            onClick={handleShare}
            className="group flex items-center gap-2 px-5 py-3 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:border-black/20 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm font-medium transition-all duration-200 shadow-xs cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">已复制链接</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 transition-transform group-hover:rotate-12" />
                <span>分享文章</span>
              </>
            )}
          </button>

          {/* 参与讨论按钮 */}
          {!post.commentsDisabled && (
            <button
              type="button"
              data-no-collapse
              onClick={handleCommentClick}
              className="flex items-center gap-2 px-5 py-3 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:border-black/20 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm font-medium transition-all duration-200 shadow-xs cursor-pointer active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              <span>参与讨论</span>
              <span className="rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs">
                {comments.length}
              </span>
            </button>
          )}
        </div>

        {/* 赞过本文的读者墙（若有人赞过） */}
        {likes.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="mr-1">❤️ 已有 {likes.length} 人点赞：</span>
            {likes.slice(0, 10).map((l, idx) => (
              <span
                key={idx}
                className="rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300"
              >
                {l.name}
              </span>
            ))}
            {likes.length > 10 && <span>等</span>}
          </div>
        )}

        {/* 博客专属：版权与许可声明卡片 */}
        <div className="mt-8 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-neutral-50/60 dark:bg-neutral-900/40 p-5 sm:p-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
          <div className="flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-200">
            <Award className="h-4 w-4 text-emerald-500" />
            <span>文章版权说明</span>
          </div>
          <p className="leading-relaxed">
            <strong className="text-neutral-700 dark:text-neutral-300">本文作者：</strong>
            {authorName}（发布于 {siteName}）
          </p>
          <p className="leading-relaxed break-all">
            <strong className="text-neutral-700 dark:text-neutral-300">本文链接：</strong>
            <span className="text-neutral-500 dark:text-neutral-400">{pageUrl}</span>
          </p>
          <p className="leading-relaxed">
            <strong className="text-neutral-700 dark:text-neutral-300">版权许可：</strong>
            {typeConfig.desc}
          </p>
        </div>
      </section>

      {/* 博客留言评论区 */}
      <section className="mt-12">
        <ArticleCommentSection
          post={post}
          comments={comments}
          onCommentsChange={handleCommentsChange}
          focusSignal={focusSignal}
        />
      </section>
    </article>
  );
}
