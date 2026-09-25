import type { PostImage } from "./types";
import { toAbsoluteUrl } from "./upload";

export function isLivePhoto(img: PostImage): boolean {
  return typeof img === "object" && !!img?.video;
}
export function getImageSrc(img: PostImage): string {
  return typeof img === "string" ? img : img.src;
}

export function getVideoSrc(img: PostImage): string | undefined {
  return typeof img === "string" ? undefined : img.video;
}

// 将 PostImage[] 中的相对路径转为绝对路径（用于显示）
export function normalizeImages(
  images: PostImage[] | undefined | null
): PostImage[] {
  if (!images || !Array.isArray(images)) return [];
  return images.map((img) => {
    if (typeof img === "string") return toAbsoluteUrl(img);
    if (!img) return { src: "", video: undefined };
    return {
      src: toAbsoluteUrl(img.src),
      video: img.video ? toAbsoluteUrl(img.video) : undefined,
    };
  });
}

// 提取纯 src 数组（用于旧组件兼容、预加载等）
export function extractImageSrcs(images: PostImage[]): string[] {
  return images.map(getImageSrc);
}

/**
 * 从 Markdown 正文中提取第一张图片的 URL
 */
export function extractFirstMarkdownImage(content?: string | null): string {
  if (!content) return "";
  const match = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/);
  if (match) return match[1];
  const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return htmlMatch ? htmlMatch[1] : "";
}

/**
 * 解析文章或项目的封面图：
 * 优先级 1: 显式指定的封面 (post.cover)
 * 优先级 2: 正文中的第一张图片 (首图法则)
 * 若无封面则返回空字符串，绝不自动填充站点背景大图
 */
export function resolveCoverImage(
  explicitCover?: string | null,
  content?: string | null
): string {
  if (explicitCover && explicitCover.trim()) {
    return toAbsoluteUrl(explicitCover.trim());
  }
  const firstImage = extractFirstMarkdownImage(content);
  if (firstImage) {
    return toAbsoluteUrl(firstImage);
  }
  return "";
}
