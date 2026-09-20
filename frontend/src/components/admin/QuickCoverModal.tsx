"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Upload,
  Link as LinkIcon,
  FolderOpen,
  FileImage,
  Trash2,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { apiFetch, getToken } from "@/lib/api-fetch";
import { uploadImage, toAbsoluteUrl } from "@/lib/upload";
import { extractFirstMarkdownImage } from "@/lib/post-image";
import { notifyContentUpdated } from "@/lib/content-sync";
import MediaPicker, { type PickerMediaItem } from "@/components/MediaPicker";

interface QuickCoverModalProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  initialCover?: string;
  content?: string;
  onSuccess: (newCover: string) => void;
}

export default function QuickCoverModal({
  open,
  onClose,
  postId,
  postTitle,
  initialCover = "",
  content = "",
  onSuccess,
}: QuickCoverModalProps) {
  const [cover, setCover] = useState(initialCover);
  const [inputUrl, setInputUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCover(initialCover || "");
      setInputUrl(initialCover || "");
      setErrorMsg("");
      setUploading(false);
      setSaving(false);
      setIsDragOver(false);
    }
  }, [open, initialCover]);

  // 处理本地图片文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("请选择图片格式文件（JPG, PNG, WebP, GIF 等）");
      return;
    }
    const token = getToken();
    if (!token) {
      setErrorMsg("请先登录管理员账号");
      return;
    }

    setUploading(true);
    setErrorMsg("");
    try {
      const uploadedUrl = await uploadImage(file, token);
      setCover(uploadedUrl);
      setInputUrl(uploadedUrl);
    } catch (err: any) {
      setErrorMsg(err.message || "上传图片失败，请重试");
    } finally {
      setUploading(false);
    }
  }, []);

  // 拖拽上传支持
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  // 从媒体库选取图片
  const handleSelectMedia = (item: PickerMediaItem) => {
    const url = item.url;
    setCover(url);
    setInputUrl(url);
    setErrorMsg("");
  };

  // 从文章正文中提取第一张图片
  const handleExtractFromContent = () => {
    const firstImg = extractFirstMarkdownImage(content);
    if (!firstImg) {
      setErrorMsg("正文中未找到任何图片 Markdown 链接");
      return;
    }
    setCover(firstImg);
    setInputUrl(firstImg);
    setErrorMsg("");
  };

  // 提交保存新封面 (通过专属轻量 PATCH 接口，不发送全量 Markdown)
  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    try {
      const finalCover = cover.trim();
      const res = await apiFetch(`/posts/${postId}/cover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover: finalCover }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "保存封面失败");
      }

      notifyContentUpdated();
      onSuccess(finalCover);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "保存封面发生错误");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-adm-border bg-adm-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-adm-border px-5 py-4 bg-adm-bg/60">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="text-base font-bold text-adm-text truncate flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-adm-primary" />
              <span>设置文章封面</span>
            </h2>
            <p className="text-xs text-adm-text-secondary truncate mt-0.5" title={postTitle}>
              {postTitle || "未命名文章"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-adm-text-tertiary hover:bg-adm-input hover:text-adm-text transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 text-xs text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          {/* 当前封面预览区 */}
          <div>
            <label className="block text-xs font-semibold text-adm-text mb-2">封面效果预览</label>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-adm-border bg-adm-input group">
              {cover ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={toAbsoluteUrl(cover)}
                    alt="封面预览"
                    className="h-full w-full object-cover transition-transform group-hover:scale-102"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCover("");
                        setInputUrl("");
                      }}
                      className="flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
                      title="清除封面"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>清除</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-adm-text-tertiary">
                  <FileImage className="h-10 w-10 stroke-1" />
                  <span className="text-xs">暂无封面（前台将回退至正文首图或默认壁纸）</span>
                </div>
              )}
            </div>
          </div>

          {/* 选项 1：本地文件上传（支持点击与拖拽） */}
          <div>
            <label className="block text-xs font-semibold text-adm-text mb-1.5">
              方法一：本地上传图片 (自动压缩直传 R2)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all cursor-pointer ${
                isDragOver
                  ? "border-adm-primary bg-adm-primary/10"
                  : "border-adm-border bg-adm-input/40 hover:border-adm-primary/60 hover:bg-adm-input/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = "";
                }}
              />
              {uploading ? (
                <div className="flex items-center gap-2 text-xs text-adm-primary font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>正在压缩并直传云存储...</span>
                </div>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-adm-text-secondary mb-1" />
                  <p className="text-xs font-medium text-adm-text">点击浏览或将图片拖拽至此处</p>
                  <p className="text-[11px] text-adm-text-tertiary mt-0.5">支持 WebP / JPG / PNG</p>
                </>
              )}
            </div>
          </div>

          {/* 选项 2：直接粘贴图片 URL */}
          <div>
            <label className="block text-xs font-semibold text-adm-text mb-1.5">
              方法二：直接粘贴图片链接 (AI 生成图 / 外链 / CDN)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-adm-text-tertiary" />
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setCover(e.target.value.trim());
                  }}
                  placeholder="https://... 图片在线直链地址"
                  className="w-full rounded-xl border border-adm-border bg-adm-input pl-9 pr-3 py-2 text-xs text-adm-text placeholder:text-adm-text-tertiary focus:outline-none focus:ring-2 focus:ring-adm-primary/30"
                />
              </div>
              <button
                type="button"
                onClick={() => setCover(inputUrl.trim())}
                className="rounded-xl border border-adm-border bg-adm-card px-3 py-2 text-xs font-medium text-adm-text hover:bg-adm-input transition cursor-pointer shrink-0"
              >
                应用链接
              </button>
            </div>
          </div>

          {/* 快捷辅助按钮 */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMediaPickerOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-adm-border bg-adm-bg py-2 text-xs font-medium text-adm-text hover:bg-adm-input transition cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
              <span>从已有素材库选取</span>
            </button>
            <button
              type="button"
              onClick={handleExtractFromContent}
              disabled={!content}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-adm-border bg-adm-bg py-2 text-xs font-medium text-adm-text hover:bg-adm-input disabled:opacity-40 transition cursor-pointer"
            >
              <FileImage className="h-3.5 w-3.5 text-emerald-500" />
              <span>从正文提取首图</span>
            </button>
          </div>

          {/* 素材库弹窗组件 */}
          {mediaPickerOpen && (
            <MediaPicker
              open={mediaPickerOpen}
              onClose={() => setMediaPickerOpen(false)}
              onSelect={handleSelectMedia}
              category="image"
              title="选择已有图片作为封面"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-adm-border px-5 py-3.5 bg-adm-bg/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-adm-border bg-adm-card px-4 py-2 text-xs font-medium text-adm-text hover:bg-adm-input transition cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex items-center gap-1.5 rounded-xl bg-adm-primary px-5 py-2 text-xs font-semibold text-adm-primary-text hover:opacity-90 disabled:opacity-50 transition shadow-sm cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>确认保存封面</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
