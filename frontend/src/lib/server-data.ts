import type { Post, User } from "@/lib/mock-data";
import { getApiUrl } from "@/lib/api-fetch";

/**
 * 服务端组件专用的帖子列表取数工具。
 * 接口失败时不再回退到 mock 数据，而是返回真实空列表并标记 error，
 * 由 PostList 展示错误态与重试按钮。
 */
export interface PostsPageResult {
  data: Post[];
  hasMore: boolean;
  total: number;
  error: boolean;
}

const EMPTY_PAGE: PostsPageResult = { data: [], hasMore: false, total: 0, error: true };

/** 空博主占位：接口不可用时不伪造博主身份，组件自身会降级到中性文案 */
export const EMPTY_OWNER: User = {
  id: "",
  nickname: "",
  avatar: "",
  cover: "",
  bio: "",
};

export async function fetchPostsPage(query: string): Promise<PostsPageResult> {
  try {
    const res = await fetch(`${getApiUrl()}/posts?${query}`, { next: { revalidate: 10, tags: ["posts"] } });
    if (!res.ok) return EMPTY_PAGE;
    const json = await res.json();
    const rawData = Array.isArray(json?.data) ? json.data : [];
    const data = rawData.filter((p: Post) => (p.status ? p.status === "published" : true));
    return {
      data,
      hasMore: json?.pagination?.hasMore ?? false,
      total: json?.pagination?.total ?? data.length,
      error: false,
    };
  } catch {
    return EMPTY_PAGE;
  }
}

export async function fetchOwner(): Promise<User> {
  try {
    const res = await fetch(`${getApiUrl()}/users/owner`, { next: { revalidate: 10, tags: ["owner"] } });
    if (!res.ok) return EMPTY_OWNER;
    const json = await res.json();
    if (!json || typeof json !== "object") return EMPTY_OWNER;
    return json as User;
  } catch {
    return EMPTY_OWNER;
  }
}

export async function fetchSiteSettings(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${getApiUrl()}/settings`, { next: { revalidate: 10, tags: ["settings"] } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

