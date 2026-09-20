import { toast } from "./toast";

export interface ShareOptions {
  title: string;
  url: string;
  typeLabel?: string; // 例如 "系列合辑", "文章", "项目", "动态"
  summary?: string;
}

/**
 * 统一健壮的分享与链接复制处理器
 * 
 * 核心设计决策：
 * 绝对不要在 navigator.share 中同时传入 `text` 和 `url`！
 * Chromium (Android Chrome / Edge / 各类移动浏览器) 在调用原生系统 Share Sheet 时，
 * 会将 url 和 text 无空格紧密拼接（如 `https://.../gEw57qcA全库整合了...`），
 * 导致在微信、QQ、短信等聊天工具中被识别为一个包含中文字符的损坏 URL，触发 404。
 * 
 * 正确做法：
 * 仅向 navigator.share 传入 title 和 clean url。系统级分享会自动展示网页标题、图标与完整纯净链接。
 * 降级使用 clipboard 写入纯净 URL，并弹出明确的 Toast 提示。
 */
export async function sharePost({
  title,
  url,
  typeLabel = "内容",
}: ShareOptions): Promise<void> {
  // 保证 url 为规范的完整绝对路径
  let fullUrl = url;
  if (typeof window !== "undefined") {
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      const origin = window.location.origin;
      fullUrl = `${origin}${fullUrl.startsWith("/") ? "" : "/"}${fullUrl}`;
    }
  }

  // 1. 如果浏览器支持 Web Share API（移动端原生分享面板）
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title,
        url: fullUrl,
      });
      return;
    } catch (err: unknown) {
      // 用户主动取消分享（AbortError）时不报错
      if (err && typeof err === "object" && "name" in err && (err as { name?: string }).name === "AbortError") {
        return;
      }
      // 其他错误优雅降级到剪贴板复制
    }
  }

  // 2. 剪贴板写入纯净链接
  let copied = false;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(fullUrl);
      copied = true;
    } catch {
      copied = false;
    }
  }

  // 3. 传统 document.execCommand 兜底
  if (!copied && typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = fullUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      copied = document.execCommand("copy");
      document.body.removeChild(textarea);
    } catch {
      copied = false;
    }
  }

  if (copied) {
    toast.success(`${typeLabel}链接已复制到剪贴板`);
  } else if (typeof window !== "undefined") {
    window.prompt(`请复制${typeLabel}链接：`, fullUrl);
  }
}

/**
 * 健壮提取 postId 或 shortId
 * 解决微信/QQ/聊天软件中因复制粘贴将中文说明、标点符号粘连在 URL 末尾导致的 404
 * 例如：/moments/gEw57qcA全库整合了... -> gEw57qcA
 */
export function extractCleanPostId(rawId: string): string {
  if (!rawId) return rawId;
  let decoded = rawId;
  try {
    decoded = decodeURIComponent(rawId).trim();
  } catch {
    decoded = rawId.trim();
  }

  // 1. 标准 UUID 匹配 (36 位字符)
  const uuidMatch = decoded.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch) return uuidMatch[0];

  // 2. 8 位 ShortId（大小写字母与数字）
  const shortIdMatch = decoded.match(/^[0-9A-Za-z]{8}/);
  if (shortIdMatch) return shortIdMatch[0];

  return decoded;
}
