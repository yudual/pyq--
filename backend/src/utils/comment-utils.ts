import { Comment } from "../models";

/**
 * 服务端推导被回复评论的邮箱（用于回复邮件通知）：
 * 1. 优先 replyToId 精确匹配父评论；
 * 2. 其次在同内容下按 replyTo 昵称找最近一条评论。
 * 公开接口已不下发明文邮箱，客户端无法再代传 replyToEmail，
 * 推导失败时回退到客户端传值以兼容旧数据。
 */
export async function resolveReplyToEmail(opts: {
  replyToId?: string | null;
  replyTo?: string | null;
  scope: { postId?: string; pageId?: string };
  fallback?: string | null;
}): Promise<string | null> {
  if (opts.replyToId) {
    const parent = await Comment.findOne({
      where: { id: opts.replyToId, ...opts.scope },
      attributes: ["email"],
    });
    if (parent?.email) return parent.email;
  }
  if (opts.replyTo) {
    const parent = await Comment.findOne({
      where: { authorName: opts.replyTo, ...opts.scope },
      order: [["createdAt", "DESC"]],
      attributes: ["email"],
    });
    if (parent?.email) return parent.email;
  }
  return opts.fallback || null;
}
