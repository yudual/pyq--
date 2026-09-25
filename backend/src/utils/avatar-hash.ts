import { createHash } from "crypto";

/**
 * 由邮箱生成 Cravatar 头像 hash（MD5 hex）。
 * 哈希规则与前端 lib/avatar.ts 一致：trim -> lowercase -> MD5。
 * 公开接口只下发 hash，不下发明文邮箱。
 */
export function avatarHash(email?: string | null): string | undefined {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash("md5").update(normalized).digest("hex");
}
