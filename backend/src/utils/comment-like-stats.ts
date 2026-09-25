import { Op, fn, col } from "sequelize";
import { CommentLike } from "../models";
import type { VisitorIdentity } from "./identity";

export interface CommentLikeStat {
  likeCount: number;
  meLiked: boolean;
}

/**
 * 批量统计评论点赞数 + 当前访客点赞状态（固定 2 次查询，避免 N+1）。
 * identity 为 null 时跳过访客状态查询，所有评论 meLiked=false。
 */
export async function loadCommentLikeStats(
  commentIds: string[],
  identity: VisitorIdentity | null
): Promise<Map<string, CommentLikeStat>> {
  const result = new Map<string, CommentLikeStat>();
  if (commentIds.length === 0) return result;

  const likeCounts = await CommentLike.findAll({
    attributes: ["commentId", [fn("COUNT", col("id")), "likeCount"]],
    where: { commentId: { [Op.in]: commentIds }, status: "like" },
    group: ["commentId"],
    raw: true,
  }) as any[];
  for (const row of likeCounts) {
    result.set(row.commentId, { likeCount: Number(row.likeCount), meLiked: false });
  }

  if (identity) {
    const mine = await CommentLike.findAll({
      attributes: ["commentId"],
      where: { commentId: { [Op.in]: commentIds }, status: "like", ...identity },
      raw: true,
    }) as any[];
    for (const row of mine) {
      const existing = result.get(row.commentId);
      if (existing) existing.meLiked = true;
      else result.set(row.commentId, { likeCount: 0, meLiked: true });
    }
  }

  for (const id of commentIds) {
    if (!result.has(id)) result.set(id, { likeCount: 0, meLiked: false });
  }
  return result;
}
