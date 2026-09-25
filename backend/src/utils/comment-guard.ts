import { blacklistService } from "../services/blacklist-service";
import { checkCommentRate, resetViolations } from "../middleware/rateLimit";

/** 违规累计达阈值后的自动临时封禁时长：1 小时 */
export const AUTO_BAN_DURATION = 60 * 60 * 1000;

export type CommentGuardResult =
  | { ok: true; antiSpamEnabled: boolean }
  | { ok: false; status: 403 | 429; body: Record<string, unknown> };

/**
 * 评论防刷流程：黑名单检查（邮箱/IP）→ 限流 → 达阈值自动临时封禁。
 * 总开关（站点设置的防刷开关）关闭时直接放行。
 * 返回 ok=false 时路由应以对应状态码返回 body 并终止。
 */
export async function enforceCommentGuard(email: string, ip: string): Promise<CommentGuardResult> {
  const antiSpamEnabled = await blacklistService.isAntiSpamEnabled();
  if (!antiSpamEnabled) {
    return { ok: true, antiSpamEnabled: false };
  }

  const ban = await blacklistService.check(email, ip);
  if (ban.banned) {
    const until = ban.expiresAt
      ? new Date(ban.expiresAt).toLocaleString("zh-CN", { hour12: false })
      : "永久";
    return {
      ok: false,
      status: 403,
      body: {
        message: `您已被限制评论（原因：${ban.reason || "违规操作"}，解除时间：${until}）。如有疑问请联系管理员。`,
        code: "BANNED",
      },
    };
  }

  // 限流：邮箱 10 秒内最多 2 条；IP 60 秒内最多 10 条
  const rate = checkCommentRate(email, ip);
  if (!rate.allowed) {
    if (rate.banKey) {
      await blacklistService.add(rate.banKey.type, rate.banKey.value, "频繁刷评论自动封禁", AUTO_BAN_DURATION);
      resetViolations(rate.banKey.type, rate.banKey.value);
    }
    const msg =
      rate.reason === "RATE_LIMIT_EMAIL"
        ? `评论太快了，请等待 ${rate.retryAfter} 秒后再试`
        : "操作过于频繁，请稍后再试";
    return {
      ok: false,
      status: 429,
      body: { message: msg, code: rate.reason, retryAfter: rate.retryAfter },
    };
  }

  return { ok: true, antiSpamEnabled: true };
}
