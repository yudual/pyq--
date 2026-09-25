/**
 * WP Ulike 风格的访客身份识别：按优先级取第一个非空字段作为唯一标识
 * （userId 已登录博主 > visitorId cookie 游客 > email 评论过的游客 > ip 兜底）。
 *
 * 互斥取一而非 OR 多重匹配——确保 meLiked 查询和点赞 toggle 用完全一致的单一条件，
 * 否则会出现"显示已赞但无法取消"的不一致。
 *
 * 返回 null 表示无法识别身份（无任何标识）。返回的对象其他维度字段置 null，
 * 与 Like 表的 4 个互斥 UNIQUE 索引 where 条件对齐。
 */
export function buildIdentity(
  userId?: string,
  visitorId?: string,
  email?: string,
  ip?: string
): { userId: string | null; visitorId: string | null; email: string | null; ip: string | null } | null {
  if (userId) return { userId, visitorId: null, email: null, ip: null };
  if (visitorId) return { visitorId, email: null, ip: null, userId: null };
  if (email) return { email, ip: null, visitorId: null, userId: null };
  if (ip) return { ip, visitorId: null, email: null, userId: null };
  return null;
}

export type VisitorIdentity = NonNullable<ReturnType<typeof buildIdentity>>;
