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

  return (
    <div id="scroll-root" className="relative min-h-screen overflow-x-hidden bg-wechat-white md:bg-wechat-bg transition-colors">
      <DesktopDecorations />

      {/* 1. 第一幕：极简质感出场 (Hero 100vh) */}
      <HeroSection owner={owner} siteSettings={settings} />

      {/* 2. 第二幕：微信朋友圈朴素动态流 */}
      <div id="moments-section" className="relative mx-auto w-full max-w-2xl px-3 sm:px-4 pt-6 sm:pt-8 pb-20 scroll-mt-16 sm:scroll-mt-20">
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
          <Footer />
        </main>
      </div>

      {/* 悬浮操作与弹窗 */}
      <FloatingActions />
      <DesktopFooter />
      <EditPostModal />
      <ProfileScrollRestoration storageKey="home-scroll-y" waitForFadeIn={false} />
    </div>
  );
}
