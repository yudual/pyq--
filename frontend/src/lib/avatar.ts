import md5 from "blueimp-md5";
import { toAbsoluteUrl } from "./upload";

// 站点 URL（用于构造默认头像的绝对 URL）
// 优先用 NEXT_PUBLIC_SITE_URL；否则从 NEXT_PUBLIC_API_URL 推导（兼容旧配置）
// 当 NEXT_PUBLIC_API_URL=/api（相对路径，rewrites 模式）时 SITE_URL 为空，回退到 wavatar
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_API_URL || "")
  .replace(/\/api$/, "")
  .replace(/\/$/, "");
// Cravatar d 参数：有绝对站点 URL 时用站点默认头像，否则回退到 wavatar
const DEFAULT_AVATAR_PARAM = SITE_URL.startsWith("http")
  ? encodeURIComponent(`${SITE_URL}/default-avatar.jpg`)
  : "wavatar";

/**
 * Generate a Cravatar avatar URL from an email address.
 * Hash: trim -> lowercase -> MD5
 * Docs: https://cravatar.com/developer/api
 *
 * URL params:
 *   s   - size in pixels
 *   d   - default image when no avatar exists (站点默认头像)
 *   r   - rating (g = suitable for all audiences)
 */
export function cravatarUrl(email: string, size = 200): string {
  const normalized = (email || "").trim().toLowerCase();
  const hash = md5(normalized);
  return `https://cravatar.com/avatar/${hash}?s=${size}&d=${DEFAULT_AVATAR_PARAM}&r=g`;
}

/**
 * Resolve the avatar URL for a user/commenter.
 * - If avatar is an uploaded image (starts with /uploads/) or an absolute URL, use it directly.
 * - Otherwise, fall back to Cravatar based on email.
 */
export function resolveAvatar(avatar: string, email: string, size = 200): string {
  if (avatar && avatar.trim()) {
    return toAbsoluteUrl(avatar);
  }
  return cravatarUrl(email, size);
}

/**
 * 由服务端下发的头像 hash（MD5 hex）构造 Cravatar URL。
 * hash 缺失时回退到对 fallbackSource 做 hash（如评论者昵称）。
 */
export function cravatarUrlFromHash(
  hash: string | null | undefined,
  fallbackSource: string,
  size = 200
): string {
  const h = hash || md5((fallbackSource || "").trim().toLowerCase());
  return `https://cravatar.com/avatar/${h}?s=${size}&d=${DEFAULT_AVATAR_PARAM}&r=g`;
}

/**
 * Resolve the avatar URL without touching the raw email:
 * prefers the uploaded avatar, then the server-issued avatarHash.
 */
export function resolveAvatarFromHash(
  avatar: string | null | undefined,
  hash: string | null | undefined,
  size = 200
): string {
  if (avatar && avatar.trim()) {
    return toAbsoluteUrl(avatar);
  }
  return cravatarUrlFromHash(hash, "", size);
}

/**
 * 为通知列表中的 actor 生成头像 URL。
 * 有 email 用 email hash，无 email 用昵称 hash；统一用站点默认头像作为 fallback。
 */
export function actorAvatarUrl(email: string, name: string, size = 64): string {
  const source = (email || "").trim().toLowerCase() || (name || "访客").trim().toLowerCase();
  const hash = md5(source);
  return `https://cravatar.com/avatar/${hash}?s=${size}&d=${DEFAULT_AVATAR_PARAM}&r=g`;
}
