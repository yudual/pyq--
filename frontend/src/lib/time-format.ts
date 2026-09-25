import type { Post } from "./types";

/**
 * 时区安全的时间格式化工具。
 *
 * 问题：new Date(iso).getHours() 等方法使用运行环境的本地时区。
 * SSR (Next.js 服务器) 默认 UTC，而用户浏览器是 UTC+8，
 * 导致同一时间戳在服务端和客户端渲染出不同结果，
 * 引发 hydration mismatch 和 ISR 缓存页面时间错误。
 *
 * 解决：使用 Intl.DateTimeFormat 指定 timeZone: "Asia/Shanghai"，
 * 确保服务端和客户端始终输出中国时间。
 */
const CST_TIMEZONE = "Asia/Shanghai";

interface CSTDateParts {
  year: number;
  month: number; // 1-based
  day: number;
  hour: number;
  minute: number;
}

function getCSTParts(iso: string): CSTDateParts {
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return { year: 1970, month: 1, day: 1, hour: 0, minute: 0 };
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CST_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value || "0";

  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10) % 24, // 24:00 → 0
    minute: parseInt(get("minute"), 10),
  };
}

export function formatWeChatDate(iso: string): string {
  const p = getCSTParts(iso);
  return `${p.year}年${p.month}月${p.day}日`;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "刚刚";
  if (diffHour < 1) return `${diffMin}分钟前`;
  if (diffDay < 1) return `${diffHour}小时前`;
  if (diffDay === 1) return "昨天";
  if (diffDay < 3) return `${diffDay}天前`;

  const p = getCSTParts(iso);
  return `${p.year}年${p.month}月${p.day}日`;
}

/**
 * 完整发布时间格式（精确到分）：YYYY-MM-DD HH:mm，如 "2026-09-17 13:40"
 * 杜绝只展示模糊的“几分钟前”、“几天前”，让访客与博主明确获知真实发布时间。
 */
export function formatExactDateTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const p = getCSTParts(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * 详情页动态时间格式：显示完整清晰的发布日期与时间
 * 如 "2026-09-17 13:40"
 */
export function formatDetailTime(iso: string): string {
  return formatExactDateTime(iso);
}

/** 文章详情页时间格式：始终完整日期 "2026年2月11日 15:13"（不显示今天/昨天） */
export function formatArticleTime(iso: string): string {
  const p = getCSTParts(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * 将 ISO 日期字符串或 Date 转换为北京时间 CST (+08:00) 的 datetime-local 控件格式（YYYY-MM-DDTHH:mm）
 */
export function toDateTimeLocal(input?: string | Date): string {
  if (input === undefined || input === null || input === "") {
    const p = getCSTParts(new Date().toISOString());
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
  }
  const iso = typeof input === "string" ? input : input.toISOString();
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const p = getCSTParts(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * 将 datetime-local 字符串按 CST 时区 (+08:00) 安全解析为标准 ISO 8601 UTC 字符串，若无效则返回 undefined
 */
export function toIsoDateString(val?: string | Date): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val.toISOString();
  }
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split("T");
  if (parts.length !== 2) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const [datePart, timePart] = parts;
  const normalizedTime = timePart.length === 5 ? `${timePart}:00` : timePart;
  const isoWithOffset = `${datePart}T${normalizedTime}+08:00`;
  const d = new Date(isoWithOffset);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** 别名导出，确保语义明确一致 */
export const parseDateTimeLocalToISO = toIsoDateString;

const VIDEO_PLATFORM_LABELS: Record<string, string> = {
  douyin: "抖音",
  kuaishou: "快手",
  xhs: "小红书",
  weibo: "微博",
  bilibili: "哔哩哔哩",
  upload: "本地上传",
  url: "链接",
  embed: "嵌入视频",
};

/** 根据动态的媒体内容返回"来自XXX"的平台标签 */
export function getPostSourceLabel(post: Post): string | null {
  if (post.type === "article") return "文章";
  if (post.video) {
    const p = post.video.platform;
    if (p && VIDEO_PLATFORM_LABELS[p]) return VIDEO_PLATFORM_LABELS[p];
    if (post.video.source === "upload") return "本地上传";
    if (post.video.source === "parse") return "视频平台";
    return "视频";
  }
  if (post.music) return null;
  return null;
}

/**
 * 评论时间格式：月日 + 时分（不带今天/昨天，不带年份）
 * 例："1月9日 01:33"
 */
export function formatCommentTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
