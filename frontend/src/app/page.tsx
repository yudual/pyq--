import DesktopDecorations from "@/components/DesktopDecorations";
import PostList from "@/components/PostList";
import FloatingActions from "@/components/FloatingActions";
import Footer from "@/components/Footer";
import DesktopFooter from "@/components/DesktopFooter";
import AdminNotifications from "@/components/AdminNotifications";
import EditPostModal from "@/components/EditPostModal";
import ProfileScrollRestoration from "@/components/profile/ProfileScrollRestoration";
import HeroSection from "@/components/home/HeroSection";
import { fetchOwner, fetchPostsPage, fetchSiteSettings } from "@/lib/server-data";

const PAGE_SIZE = 10;

// ISR：10 秒重新验证（后端写操作后会触发按需重验证，10秒仅作安全网）
export const revalidate = 10;

export default async function Home() {
  const [owner, postsData, settings] = await Promise.all([
    fetchOwner(),
    fetchPostsPage(`page=1&limit=${PAGE_SIZE}`),
    fetchSiteSettings(),
  ]);

  // 首页桌面端单层壁纸：优先使用 decorationImage，若未设置则回退至 backgroundImages 或 owner.cover，保证桌面端始终只有单层统一壁纸
  let homepageBg = "";
  if (typeof settings?.decorationImage === "string" && settings.decorationImage.trim()) {
    homepageBg = settings.decorationImage.trim();
  } else if (settings?.backgroundImages) {
    try {
      const parsed = typeof settings.backgroundImages === "string" ? JSON.parse(settings.backgroundImages) : settings.backgroundImages;
      if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0].trim()) {
        homepageBg = parsed[0].trim();
      }
    } catch {}
  }
  if (!homepageBg && typeof owner?.cover === "string" && owner.cover.trim()) {
    homepageBg = owner.cover.trim();
  }

  return (
    <div id="scroll-root" className="relative min-h-screen overflow-x-clip bg-wechat-white md:bg-wechat-bg transition-colors">
      <DesktopDecorations image={homepageBg || undefined} />

      {/* 1. 第一幕：典雅博主 Hero 展区 (轻盈透气，与全局背景自然融合) */}
      <HeroSection owner={owner} siteSettings={settings} />

      {/* 2. 第二幕：博客动态流与长文聚合（大气宽屏画卷） */}
      <div id="moments-section" className="relative mx-auto w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl px-3 sm:px-6 lg:px-8 pt-0 sm:pt-2 pb-20 scroll-mt-20">
        <main className="relative w-full overflow-hidden rounded-3xl bg-wechat-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] border border-neutral-200/60 dark:border-neutral-800/80">
          {/* 动态卡片顶部栏 */}
          <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] px-5 py-3.5 bg-neutral-50/60 dark:bg-neutral-800/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">博客动态 · 岁岁念与随笔</span>
              <span className="rounded-full bg-neutral-200/70 dark:bg-neutral-700/70 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                {postsData.total ?? postsData.data.length} 条记录
              </span>
            </div>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              全频道聚合
            </span>
          </div>

          <div className="pt-2">
            <AdminNotifications />
          </div>

          <PostList
            initialPosts={postsData.data}
            initialHasMore={postsData.hasMore}
            initialPage={1}
            initialError={postsData.error}
          />
        </main>
        <Footer />
      </div>

      {/* 悬浮操作与弹窗 */}
      <FloatingActions />
      <DesktopFooter />
      <EditPostModal />
      <ProfileScrollRestoration storageKey="home-scroll-y" waitForFadeIn={false} />
    </div>
  );
}
