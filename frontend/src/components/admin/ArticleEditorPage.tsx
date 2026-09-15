"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  X,
  Image as ImageIcon,
  MapPin,
  Heart,
  MessageSquare,
  Pin,
  Link2,
  FolderOpen,
  SlidersHorizontal,
  CheckCircle2,
  Save,
  Upload,
  Sparkles,
  Eye,
} from "lucide-react";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import MediaPicker from "@/components/MediaPicker";
import { apiFetch, getToken } from "@/lib/api-fetch";
import { uploadImage, toAbsoluteUrl } from "@/lib/upload";
import { wgs84ToGcj02 } from "@/lib/coord-transform";
import { htmlToMarkdown } from "@/lib/markdown";
import { syncFrontmatterToMarkdown, type ArticleFrontmatter } from "@/lib/frontmatter";
import { extractFirstMarkdownImage } from "@/lib/post-image";
import { buildMusicEmbedHtml, buildLinkCardHtml, buildVideoEmbedHtml } from "@/components/editor/embed-utils";
import type { PostMusic, PostVideo, LinkCard } from "@/lib/mock-data";

interface ArticleEditorPageProps {
  articleId?: string;
}

const DEFAULT_ARTICLE_TEMPLATE = `---
title: "在碎片化时代重构个人的数字花园"
category: "随笔"
tags: ["思考", "写作", "博客"]
articleType: "original"
---

# 在碎片化时代重构个人的数字花园

在这个信息飞速流转的时代，记录与表达是我们与数字浪潮对抗的最好方式。

> [!TIP]
> 这里的 Markdown 支持实时预览、截屏粘贴插图、语法高亮与 callout 提示框！

## 一、为什么需要重构写作体验？
传统的后台富文本编辑器往往充满了格式冗余与排版紊乱，而现代纯粹的 Markdown 写作能够带来极致的专注度：

- ✨ **极简语法**：无需在复杂的操作按钮间反复查找
- 🚀 **代码高亮**：原生支持数十种编程语言高亮
- 📱 **多端自适应**：手机与电脑排版同样优雅

\`\`\`ts
interface GardenPost {
  title: string;
  tags: string[];
  publishedAt: Date;
}
\`\`\`

## 二、思考与沉淀
开始写下你的第一段文字吧...
`;

export default function ArticleEditorPage({ articleId }: ArticleEditorPageProps) {
  const router = useRouter();
  const isEdit = !!articleId;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState(isEdit ? "" : DEFAULT_ARTICLE_TEMPLATE);
  /** 朋友圈配文：展示在文章卡片上方的动态文字 */
  const [caption, setCaption] = useState("");
  const [cover, setCover] = useState("");
  const [category, setCategory] = useState("随笔");
  const [articleType, setArticleType] = useState<"original" | "repost" | "ai">("original");
  const [repostUrl, setRepostUrl] = useState("");
  const [currentStatus, setCurrentStatus] = useState<"published" | "draft">("published");
  const [saveFeedback, setSaveFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState<null | "published" | "draft">(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [region, setRegion] = useState("");
  const [locating, setLocating] = useState(false);
  const [likesDisabled, setLikesDisabled] = useState(false);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [showCoverInput, setShowCoverInput] = useState(false);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const initialSnapshotRef = useRef<{ title: string; content: string; caption: string } | null>(null);
  const savedDraftRef = useRef(false);

  // 加载已存在的文章
  useEffect(() => {
    if (!articleId) return;
    (async () => {
      try {
        const res = await apiFetch(`/posts/${articleId}`);
        if (!res.ok) throw new Error("加载失败");
        const data = await res.json();
        const rawCaption = data.excerpt || "";
        const isJunkCaption = /^---\s*(?:title|category|tags|articleType):/i.test(rawCaption);
        const cleanCaption = isJunkCaption ? "" : rawCaption;

        setTitle(data.title || "");
        setCaption(cleanCaption);
        setCategory(data.category || "随笔");
        setCurrentStatus(data.status || "published");

        let mergedContent = data.content || "";

        // 旧数据兼容：将独立的 music/linkCard/video 字段注入到 content 中作为内联嵌入块
        if (data.music && !/data-embed="music"/.test(mergedContent)) {
          mergedContent += buildMusicEmbedHtml(data.music as PostMusic);
        }
        if (data.linkCard && !/class="[^"]*link-card[^"]*"/.test(mergedContent)) {
          mergedContent += buildLinkCardHtml(data.linkCard as LinkCard);
        }
        if (data.video && !/data-embed="video"/.test(mergedContent)) {
          mergedContent += buildVideoEmbedHtml(data.video as PostVideo);
        }

        // 将可能存在的旧 HTML 转为高质量 Markdown
        const convertedMd = htmlToMarkdown(mergedContent);
        setContent(convertedMd);

        setCover(data.cover || "");
        setArticleType(data.articleType || "original");
        setRepostUrl(data.repostUrl || "");
        setRegion(data.region || "");
        setLikesDisabled(!!data.likesDisabled);
        setCommentsDisabled(!!data.commentsDisabled);
        setPinned(!!data.pinned);

        initialSnapshotRef.current = {
          title: data.title || "",
          content: convertedMd,
          caption: cleanCaption,
        };
      } catch (err) {
        alert(err instanceof Error ? err.message : "加载文章失败");
        router.push("/admin/articles");
      } finally {
        setLoading(false);
      }
    })();
  }, [articleId, router]);

  const lastFmRef = useRef<ArticleFrontmatter>({});

  // 当 Frontmatter 解析出属性时同步到 UI 状态
  const handleFrontmatterChange = useCallback((fm: ArticleFrontmatter) => {
    const prev = lastFmRef.current;
    if (fm.title !== undefined && fm.title !== prev.title && typeof fm.title === "string") {
      setTitle(fm.title);
    }
    if (fm.category !== undefined && fm.category !== prev.category && typeof fm.category === "string") {
      setCategory(fm.category);
    }
    if (fm.cover !== undefined && fm.cover !== prev.cover && typeof fm.cover === "string") {
      setCover(fm.cover);
    } else if (prev.cover && (fm.cover === undefined || fm.cover === "")) {
      setCover("");
    }
    if (fm.excerpt !== undefined && fm.excerpt !== prev.excerpt && typeof fm.excerpt === "string") {
      setCaption(fm.excerpt);
    }
    if (fm.articleType && fm.articleType !== prev.articleType && ["original", "repost", "ai"].includes(fm.articleType)) {
      setArticleType(fm.articleType as "original" | "repost" | "ai");
    }
    if (typeof fm.pinned === "boolean" && fm.pinned !== prev.pinned) {
      setPinned(fm.pinned);
    }
    lastFmRef.current = fm;
  }, []);

  const handleAutoLocate = useCallback(async () => {
    setLocating(true);
    try {
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0,
            });
          });
          const { longitude, latitude } = pos.coords;
          const [gcjLng, gcjLat] = wgs84ToGcj02(longitude, latitude);
          const regeoRes = await apiFetch(`/location/regeo?lng=${gcjLng}&lat=${gcjLat}`);
          if (regeoRes.ok) {
            const regeoData = await regeoRes.json();
            if (regeoData.province) {
              setRegion(regeoData.province);
              return;
            }
          }
        } catch {
          // GPS 降级到 IP
        }
      }

      const res = await apiFetch("/location/ip");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "定位失败");
      }
      const data = await res.json();
      if (data.province) {
        setRegion(data.province);
      } else {
        throw new Error("无法获取定位信息");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "定位失败");
    } finally {
      setLocating(false);
    }
  }, []);

  const handleCoverUpload = useCallback(async (file: File) => {
    const token = getToken();
    if (!token) {
      alert("请先登录");
      return;
    }
    setUploadingCover(true);
    try {
      const url = await uploadImage(file, token);
      setCover(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "封面上传失败");
    } finally {
      setUploadingCover(false);
    }
  }, []);

  const onCoverChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleCoverUpload(file);
      e.target.value = "";
    },
    [handleCoverUpload]
  );

  const handleSave = useCallback(
    async (
      targetStatus: "published" | "draft" = "published",
      options: { stay?: boolean } = {}
    ) => {
      let finalTitle = title.trim();
      // 如果标题框没填，尝试从 Markdown 的第一个 # 标题中提取
      if (!finalTitle) {
        const h1Match = content.match(/^#\s+(.+)$/m);
        if (h1Match) finalTitle = h1Match[1].trim();
      }

      if (targetStatus === "published") {
        if (!finalTitle) {
          alert("请输入文章标题（或在正文第一行写 # 标题）");
          return;
        }
        if (!content.trim()) {
          alert("请输入文章正文内容");
          return;
        }
        if (articleType === "repost" && !repostUrl.trim()) {
          alert("转载文章请填写转载来源链接");
          return;
        }
      }

      setSaving(targetStatus);
      try {
        const token = getToken();
        if (!token) {
          alert("请先登录管理后台");
          router.push("/admin");
          return;
        }

        const finalCover = cover.trim();

        // 同步最新的标题与属性到正文开头的 Frontmatter（保持 Markdown 源码自洽一致）
        const synchronizedContent = syncFrontmatterToMarkdown(content, {
          title: finalTitle,
          category: category.trim() || "随笔",
          cover: finalCover || undefined,
          excerpt: caption.trim() || undefined,
          articleType,
          repostUrl: articleType === "repost" ? repostUrl.trim() : undefined,
          pinned,
          status: targetStatus,
        });

        const body: Record<string, unknown> = {
          type: "article" as const,
          title: finalTitle,
          content: synchronizedContent,
          excerpt: caption.trim(),
          cover: finalCover,
          category: category.trim() || "随笔",
          articleType,
          repostUrl: articleType === "repost" ? repostUrl.trim() : "",
          region: region || undefined,
          likesDisabled,
          commentsDisabled,
          pinned,
          status: targetStatus,
        };

        let targetId = articleId;
        if (isEdit) {
          body.music = null;
          body.linkCard = null;
          body.video = null;
          const res = await apiFetch(`/posts/${articleId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "保存失败");
          }
        } else {
          const res = await apiFetch(`/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "发布失败");
          }
          const created = await res.json();
          targetId = created.id;
        }

        setCurrentStatus(targetStatus);
        savedDraftRef.current = true;
        initialSnapshotRef.current = {
          title: finalTitle,
          content: synchronizedContent,
          caption: caption.trim(),
        };

        if (options.stay) {
          setSaveFeedback({
            type: "success",
            message: targetStatus === "draft" ? "草稿已安全保存" : "文章已成功发布并同步至前台",
          });
          if (!isEdit && targetId) {
            window.history.replaceState(null, "", `/admin/articles/${targetId}`);
          }
          setTimeout(() => setSaveFeedback(null), 3500);
        } else {
          router.push("/admin/articles");
          router.refresh();
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "操作失败");
      } finally {
        setSaving(null);
      }
    },
    [
      title,
      content,
      caption,
      cover,
      category,
      articleType,
      repostUrl,
      region,
      likesDisabled,
      commentsDisabled,
      pinned,
      isEdit,
      articleId,
      router,
    ]
  );

  const hasUnsavedContent = useCallback(() => {
    if (!isEdit) {
      return title.trim().length > 0 || (content.trim().length > 0 && content !== DEFAULT_ARTICLE_TEMPLATE);
    }
    const snap = initialSnapshotRef.current;
    if (!snap) return false;
    return snap.title !== title || snap.content !== content || snap.caption !== caption;
  }, [title, content, caption, isEdit]);

  const handleBack = useCallback(() => {
    if (savedDraftRef.current) {
      router.push("/admin/articles");
      return;
    }
    if (hasUnsavedContent()) {
      const ok = window.confirm(
        "你有未保存的内容，是否保存为草稿？\n\n点击「确定」保存为草稿；\n点击「取消」放弃当前内容返回列表。"
      );
      if (ok) {
        handleSave("draft");
        return;
      }
    }
    router.push("/admin/articles");
  }, [hasUnsavedContent, handleSave, router]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (savedDraftRef.current) return;
      if (hasUnsavedContent()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedContent]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-adm-text-tertiary" />
      </div>
    );
  }

  const token = getToken() || "";

  return (
    <div className="mx-auto max-w-[1440px] px-3 sm:px-6 py-4 flex flex-col space-y-3 pb-8">
      {/* 顶部主操作栏：返回 + 状态标签 + 标题输入 + 设置展开 + 存草稿 + 发布 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-adm-border pb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-adm-border text-adm-text-secondary hover:bg-adm-input hover:text-adm-text transition-colors cursor-pointer shrink-0"
            title="返回文章列表"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* 实时文章状态标识 */}
          <span
            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold border select-none ${
              currentStatus === "draft"
                ? "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {currentStatus === "draft" ? "草稿箱" : "已发布"}
          </span>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题..."
            maxLength={200}
            className="flex-1 rounded-xl border border-adm-border bg-adm-card px-4 py-2 text-base sm:text-lg font-bold text-adm-text placeholder:text-adm-text-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* 属性设置抽屉开关 */}
          <button
            type="button"
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              showSettingsDrawer
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-adm-border bg-adm-card text-adm-text-secondary hover:bg-adm-input"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{showSettingsDrawer ? "收起属性设置" : "文章属性设置"}</span>
            {cover && (
              <span className="ml-0.5 flex h-2 w-2 rounded-full bg-emerald-500" title="已设置专属封面" />
            )}
          </button>

          {/* 存草稿（就地安全保存，不强制跳出编辑流程） */}
          <button
            type="button"
            onClick={() => handleSave("draft", { stay: true })}
            disabled={saving !== null}
            className="inline-flex items-center gap-1.5 rounded-xl border border-adm-border bg-adm-card px-3.5 py-2 text-xs font-medium text-adm-text hover:bg-adm-input disabled:opacity-50 transition-colors cursor-pointer"
            title="保存草稿 (Ctrl+S)"
          >
            {saving === "draft" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>存草稿</span>
          </button>

          {/* 若已是发布状态，允许一键下架为草稿 */}
          {isEdit && currentStatus === "published" && (
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={saving !== null}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-amber-300/60 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 disabled:opacity-50 transition-colors cursor-pointer"
              title="下架此文章并转入草稿箱"
            >
              <span>下架为草稿</span>
            </button>
          )}

          {/* 正式发布 / 更新发布 */}
          <button
            type="button"
            onClick={() => handleSave("published")}
            disabled={saving !== null}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 dark:bg-white dark:text-gray-900 dark:hover:bg-emerald-200 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {saving === "published" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>{currentStatus === "published" && isEdit ? "更新发布" : "正式发布"}</span>
          </button>
        </div>
      </div>

      {/* 操作即时反馈状态条 */}
      {saveFeedback && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
            saveFeedback.type === "success"
              ? "border border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "border border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{saveFeedback.message}</span>
        </div>
      )}

      {/* 可展开的文章高级属性面板（分类、封面、创作类型、权限） */}
      {showSettingsDrawer && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-2xl border border-adm-border bg-adm-card p-4 sm:p-5 shadow-xs animate-fade-in text-xs">
          {/* 1. 分类与标签 */}
          <div className="space-y-2">
            <label className="block font-semibold text-adm-text">文章分类</label>
            <div className="flex flex-wrap gap-1.5">
              {["随笔", "技术", "生活", "思考", "折腾"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                    category === cat
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-adm-input text-adm-text-secondary hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
                  }`}
                >
                  #{cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="自定义分类..."
              className="w-full rounded-lg border border-adm-border bg-adm-bg px-3 py-1.5 text-xs text-adm-text placeholder:text-adm-text-tertiary focus:outline-none"
            />
          </div>

          {/* 2. 文章封面（优雅的无干扰卡片，参考 Ghost / Halo CMS） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-adm-text flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>文章封面</span>
              </label>
              {cover ? (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  已设封面
                </span>
              ) : extractFirstMarkdownImage(content) ? (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  自动首图
                </span>
              ) : (
                <span className="text-[10px] text-adm-text-tertiary">未设封面</span>
              )}
            </div>

            {cover ? (
              <div className="space-y-1.5">
                <div className="relative group overflow-hidden rounded-xl border border-adm-border bg-neutral-100 dark:bg-neutral-800 aspect-[16/9] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={toAbsoluteUrl(cover)}
                    alt="文章封面预览"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="rounded-md bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-white px-2 py-1 text-[11px] font-medium hover:bg-white transition cursor-pointer"
                    >
                      {uploadingCover ? <Loader2 className="h-3 w-3 animate-spin" /> : "更换"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaPickerOpen(true)}
                      className="rounded-md bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-white px-2 py-1 text-[11px] font-medium hover:bg-white transition cursor-pointer"
                    >
                      图库
                    </button>
                    <button
                      type="button"
                      onClick={() => setCover("")}
                      className="rounded-md bg-rose-600/95 text-white px-2 py-1 text-[11px] font-medium hover:bg-rose-700 transition cursor-pointer"
                    >
                      移除
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={cover}
                  onChange={(e) => setCover(e.target.value)}
                  placeholder="封面图片 URL..."
                  className="w-full rounded-lg border border-adm-border bg-adm-bg px-2.5 py-1 text-[11px] text-adm-text placeholder:text-adm-text-tertiary focus:outline-none"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="group rounded-xl border border-dashed border-adm-border bg-adm-bg/50 hover:bg-adm-bg transition p-2.5 flex flex-col items-center justify-center gap-1 text-center cursor-pointer min-h-[82px]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  </div>
                  <p className="text-[11px] font-medium text-adm-text group-hover:text-emerald-600 transition-colors">
                    {uploadingCover ? "上传中..." : "上传封面图"}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-adm-text-secondary px-0.5">
                  <button
                    type="button"
                    onClick={() => setMediaPickerOpen(true)}
                    className="hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    素材库
                  </button>
                  <span className="text-adm-text-tertiary">·</span>
                  <button
                    type="button"
                    onClick={() => setShowCoverInput(!showCoverInput)}
                    className="hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    {showCoverInput ? "收起" : "输入链接"}
                  </button>
                  {extractFirstMarkdownImage(content) && (
                    <>
                      <span className="text-adm-text-tertiary">·</span>
                      <button
                        type="button"
                        onClick={() => setCover(extractFirstMarkdownImage(content))}
                        className="text-emerald-600 hover:underline cursor-pointer inline-flex items-center gap-0.5"
                        title="将正文首图提取为封面"
                      >
                        <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                        <span>首图</span>
                      </button>
                    </>
                  )}
                </div>

                {showCoverInput && (
                  <input
                    type="text"
                    value={cover}
                    onChange={(e) => setCover(e.target.value)}
                    placeholder="粘贴 https:// 图片链接..."
                    className="w-full rounded-lg border border-adm-border bg-adm-bg px-2.5 py-1 text-[11px] text-adm-text placeholder:text-adm-text-tertiary focus:outline-none animate-fade-in"
                  />
                )}
              </div>
            )}

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={onCoverChange}
              className="hidden"
            />
          </div>

          {/* 3. 文章类型与配文摘要 */}
          <div className="space-y-2">
            <label className="block font-semibold text-adm-text">创作类型与摘要</label>
            <div className="flex gap-1.5">
              {[
                { value: "original", label: "原创" },
                { value: "repost", label: "转载" },
                { value: "ai", label: "AI" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setArticleType(opt.value as "original" | "repost" | "ai")}
                  className={`flex-1 rounded-lg py-1 text-xs font-medium transition text-center cursor-pointer ${
                    articleType === opt.value
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold"
                      : "bg-adm-input text-adm-text-secondary hover:bg-neutral-200/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {articleType === "repost" && (
              <input
                type="url"
                value={repostUrl}
                onChange={(e) => setRepostUrl(e.target.value)}
                placeholder="https://原文来源链接..."
                className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 px-3 py-1.5 text-xs text-adm-text placeholder:text-adm-text-tertiary focus:outline-none"
              />
            )}
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="朋友圈短摘要（卡片配文）..."
              className="w-full rounded-lg border border-adm-border bg-adm-bg px-3 py-1.5 text-xs text-adm-text placeholder:text-adm-text-tertiary focus:outline-none"
            />
          </div>

          {/* 4. 互动权限与置顶 */}
          <div className="space-y-2">
            <label className="block font-semibold text-adm-text">权限与置顶</label>
            <div className="space-y-1.5 text-xs text-adm-text-secondary">
              <label className="flex items-center justify-between rounded-lg border border-adm-border/60 bg-adm-input/50 px-3 py-1.5 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Pin className="h-3.5 w-3.5 rotate-45" />
                  <span>首页置顶</span>
                </span>
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="rounded text-emerald-600"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-adm-border/60 bg-adm-input/50 px-3 py-1.5 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  <span>允许点赞</span>
                </span>
                <input
                  type="checkbox"
                  checked={!likesDisabled}
                  onChange={(e) => setLikesDisabled(!e.target.checked)}
                  className="rounded text-emerald-600"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-adm-border/60 bg-adm-input/50 px-3 py-1.5 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>允许评论</span>
                </span>
                <input
                  type="checkbox"
                  checked={!commentsDisabled}
                  onChange={(e) => setCommentsDisabled(!e.target.checked)}
                  className="rounded text-emerald-600"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 核心 Markdown 写作组件：分栏预览、实时高亮、图片截屏拖拽直传 */}
      <MarkdownEditor
        value={content}
        onChange={setContent}
        token={token}
        onFrontmatterChange={handleFrontmatterChange}
        onSave={() => handleSave(currentStatus === "draft" ? "draft" : "published", { stay: true })}
        minHeight="680px"
      />

      {/* 媒体库选择弹窗 */}
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(item) => {
          setCover(item.url);
          setMediaPickerOpen(false);
        }}
        category="image"
      />
    </div>
  );
}
