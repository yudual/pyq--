import type { Metadata } from "next";
import CoverHeader from "@/components/CoverHeader";
import DesktopDecorations from "@/components/DesktopDecorations";
import FloatingActions from "@/components/FloatingActions";
import Footer from "@/components/Footer";
import DesktopFooter from "@/components/DesktopFooter";
import EditPostModal from "@/components/EditPostModal";
import ProfileTimeline from "@/components/profile/ProfileTimeline";
import ProfileFadeIn from "@/components/profile/ProfileFadeIn";
import ProfileScrollRestoration from "@/components/profile/ProfileScrollRestoration";
import { fetchOwner, fetchPostsPage, fetchSiteSettings } from "@/lib/server-data";

export const revalidate = 10;

export async function generateMetadata(): Promise<Metadata> {
  const owner = await fetchOwner();
  return {
    title: owner.nickname ? `${owner.nickname} 的归档` : "归档",
  };
}

function getCoverList(settings: Record<string, unknown> | null | undefined, fallback: string): string[] {
  const raw = settings?.backgroundImages;
  if (!raw) return [fallback];
  try {
    const images = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(images) && images.length > 0) {
      return images;
    }
  } catch {
    // ignore parse errors
  }
  return [fallback];
}

export default async function ProfilePage() {
  const owner = await fetchOwner();
  const [postsData, settings] = await Promise.all([
    fetchPostsPage(`userId=${encodeURIComponent(owner.id)}&page=1&limit=10`),
    fetchSiteSettings(),
  ]);
  const coverUrls = getCoverList(settings, owner.cover);

  return (
    <div id="scroll-root" className="relative min-h-screen overflow-x-hidden bg-wechat-white md:bg-wechat-bg transition-colors">
      <DesktopDecorations />

      <div className="relative mx-auto w-full max-w-[640px] md:max-w-2xl lg:max-w-3xl px-3 sm:px-4 pt-20 sm:pt-24 pb-16">
        <main className="relative w-full overflow-hidden rounded-3xl bg-wechat-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] border border-neutral-200/60 dark:border-neutral-800/80 pb-8 md:pb-12">
          <ProfileFadeIn>
            <CoverHeader user={owner} coverUrls={coverUrls} />

            <ProfileTimeline
              initialPosts={postsData.data}
              initialHasMore={postsData.hasMore}
              initialPage={1}
              initialError={postsData.error}
              ownerId={owner.id}
            />
            <Footer />
          </ProfileFadeIn>
        </main>
      </div>

      <FloatingActions />
      <DesktopFooter />
      <EditPostModal />
      <ProfileScrollRestoration />
    </div>
  );
}
