"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PostCardSkeleton } from "@/components/Skeleton";
import { groupByTime } from "@/lib/time-group";
import { authFetchHeaders } from "@/lib/auth";
import type { Post } from "@/lib/mock-data";
import ProfilePinnedStrip from "./ProfilePinnedStrip";
import TimelinePostCard from "./TimelinePostCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const PAGE_SIZE = 10;

/**
 * 格式化完整定位信息：城市 · 地点名
 * 两者都有用 "·" 连接，只有其一则单独显示。
 */
function formatLocation(loc: Post["location"]): string {
  if (!loc || typeof loc !== "object") return "";
  const city = (loc.city || "").trim();
  const name = (loc.name || "").trim();
  if (city && name) return `${city} · ${name}`;
  return city || name;
}

interface ProfileTimelineProps {
  initialPosts: Post[];
  initialHasMore: boolean;
  initialPage: number;
  initialError?: boolean;
  ownerId: string;
}

export default function ProfileTimeline({
  initialPosts,
  initialHasMore,
  initialPage,
  initialError = false,
  ownerId,
}: ProfileTimelineProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(initialError);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const router = useRouter();

  const buildFirstPageUrl = useCallback(
    (email: string) => {
      const emailQ = email ? `&email=${encodeURIComponent(email)}` : "";
      return `${API_URL}/posts?userId=${ownerId}&page=1&limit=${PAGE_SIZE}${emailQ}`;
    },
    [ownerId]
  );

  const retryFirstPage = useCallback(async () => {
    setError(false);
    try {
      const email = (typeof window !== "undefined" && localStorage.getItem("visitor_email")) || "";
      const res = await fetch(buildFirstPageUrl(email), {
        cache: "no-store",
        credentials: "include",
        headers: authFetchHeaders(),
      });
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      if (!Array.isArray(json?.data)) throw new Error("invalid response");
      setPosts(json.data);
      setPage(1);
      setHasMore(json.pagination?.hasMore ?? false);
    } catch {
      setError(true);
    }
  }, [buildFirstPageUrl]);

  // 客户端首次加载：用真实 IP/email/cookie/token 获取 meLiked 状态，覆盖 SSR 数据
  // 关键：登录用户必须带 Authorization header，否则后端走 cookie visitorId 维度
  // 但该维度点赞已被 migrateLikesToUserId 升级，导致 meLiked 错误
  useEffect(() => {
    const email = (typeof window !== "undefined" && localStorage.getItem("visitor_email")) || "";
    fetch(buildFirstPageUrl(email), {
      cache: "no-store",
      credentials: "include",
      headers: authFetchHeaders(),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.data) return;
        setPosts(json.data);
        setPage(1);
        setHasMore(json.pagination?.hasMore ?? false);
        setError(false);
      })
      .catch(() => {
        // SSR 首屏数据为空且客户端补拉也失败时，展示错误态而非空白
        if (initialPosts.length === 0) setError(true);
      });
  }, [ownerId, buildFirstPageUrl, initialPosts.length]);

  useEffect(() => {
    const handler = async () => {
      try {
        const email = (typeof window !== "undefined" && localStorage.getItem("visitor_email")) || "";
        const emailQ = email ? `&email=${encodeURIComponent(email)}` : "";
        const res = await fetch(
          `${API_URL}/posts?userId=${ownerId}&page=1&limit=${PAGE_SIZE}${emailQ}`,
          {
            cache: "no-store",
            credentials: "include",
            headers: authFetchHeaders(),
          }
        );
        if (res.ok) {
          const json = await res.json();
          setPosts(json.data || []);
          setPage(1);
          setHasMore(json.pagination?.hasMore ?? false);
          setError(false);
        }
      } catch {
        // ignore
      }
      router.refresh();
    };

    window.addEventListener("post-published", handler);
    return () => window.removeEventListener("post-published", handler);
  }, [ownerId, router]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    setError(false);
    try {
      const email = (typeof window !== "undefined" && localStorage.getItem("visitor_email")) || "";
      const emailQ = email ? `&email=${encodeURIComponent(email)}` : "";
      const res = await fetch(
        `${API_URL}/posts?userId=${ownerId}&page=${page + 1}&limit=${PAGE_SIZE}${emailQ}`,
        {
          cache: "no-store",
          credentials: "include",
          headers: authFetchHeaders(),
        }
      );
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setPosts((prev) => [...prev, ...(json.data || [])]);
      setPage((p) => p + 1);
      setHasMore(json.pagination?.hasMore ?? false);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [page, hasMore, ownerId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const root = isDesktop ? document.getElementById("scroll-root") : null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root, rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const { pinnedPosts, groups } = useMemo(() => {
    const pinned = posts.filter((p) => p.pinned);
    const baseTimelinePosts = posts.filter((p) => !p.pinned);
    return { pinnedPosts: pinned, groups: groupByTime(baseTimelinePosts) };
  }, [posts]);

  if (posts.length === 0) {
    if (error) {
      return (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-wechat-text">内容加载失败</p>
          <p className="mt-1 text-xs text-wechat-time">请检查网络后重试</p>
          <button
            type="button"
            onClick={retryFirstPage}
            className="mt-4 rounded-lg bg-wechat-link px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-80"
          >
            重试
          </button>
        </div>
      );
    }
    return (
      <div className="py-12 text-center text-sm text-wechat-time">暂无动态</div>
    );
  }

  return (
    <section>
      <ProfilePinnedStrip posts={pinnedPosts} />

      <div>
        {groups.map((group) => (
          <div key={group.key} className="mb-4 last:mb-0">
            {group.items.map((post, idx) => {
              const loc = formatLocation(post.location);
              return (
                <div key={post.id} className="flex">
                  {/* Left column: date (first item) + location */}
                  <div className="w-[68px] shrink-0 pl-4 pt-2 sm:pl-5 md:pl-6">
                    {idx === 0 &&
                      (group.type === "today" || group.type === "yesterday" ? (
                        <span className="text-[15px] font-semibold leading-tight text-wechat-text">
                          {group.label}
                        </span>
                      ) : (
                        <div className="flex items-baseline gap-0.5 leading-none">
                          <span className="text-[19px] font-semibold text-wechat-text">
                            {group.dayLabel}
                          </span>
                          <span className="text-[10px] text-wechat-time">
                            {group.monthLabel}
                          </span>
                        </div>
                      ))}
                    {loc && (
                      <p
                        className={`break-words text-[9px] leading-[1.25] text-wechat-time ${idx === 0 ? "mt-1.5" : "pt-2"}`}
                      >
                        {loc}
                      </p>
                    )}
                  </div>

                  {/* Right: post card */}
                  <div className="min-w-0 flex-1">
                    <TimelinePostCard post={post} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {loadingMore &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={`sk-${i}`} className="flex">
              <div className="w-[68px] shrink-0 pl-4 sm:pl-5 md:pl-6" />
              <div className="min-w-0 flex-1">
                <PostCardSkeleton />
              </div>
            </div>
          ))}
      </div>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-1" />

      {error && (
        <div className="py-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            className="text-sm text-wechat-link transition-opacity hover:opacity-70"
          >
            加载失败，点击重试
          </button>
        </div>
      )}

      {!hasMore && !loadingMore && posts.length > 0 && (
        <footer className="py-8 text-center text-xs text-wechat-time">
          已经到底了
        </footer>
      )}
    </section>
  );
}
