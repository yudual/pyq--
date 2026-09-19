import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DesktopDecorations from "@/components/DesktopDecorations";
import DesktopFooter from "@/components/DesktopFooter";
import EditPostModal from "@/components/EditPostModal";
import FloatingActions from "@/components/FloatingActions";
import Footer from "@/components/Footer";
import ProfileFadeIn from "@/components/profile/ProfileFadeIn";
import ArticleTOC from "@/components/ArticleTOC";
import type { User } from "@/lib/mock-data";

interface SpecialPageLayoutProps {
  owner: User;
  children: ReactNode;
  showToc?: boolean;
}

export default function SpecialPageLayout({ children, showToc = false }: SpecialPageLayoutProps) {
  return (
    <div id="scroll-root" className="relative min-h-screen overflow-x-clip bg-wechat-white md:bg-wechat-bg transition-colors">
      <DesktopDecorations />

      {/* 居中自适应容器与桌面侧边栏布局 (pt-20 sm:pt-24) */}
      <div className="relative mx-auto w-full max-w-[1440px] xl:max-w-[1600px] 2xl:max-w-[1720px] px-3 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 flex justify-center items-start gap-8 xl:gap-10">
        <div className="w-full flex-1 min-w-0 max-w-[980px] xl:max-w-[1100px] 2xl:max-w-[1200px] flex flex-col">
          {/* 品牌导航闭环 */}
          <div className="mb-4 sm:mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回首页</span>
            </Link>
          </div>

          <main className="relative flex min-h-[calc(100vh-10rem)] w-full flex-col overflow-hidden rounded-3xl bg-wechat-white p-4 sm:p-8 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] border border-neutral-200/60 dark:border-neutral-800/80">
            <ProfileFadeIn>
              <div className="flex-1">{children}</div>
              <Footer />
            </ProfileFadeIn>
          </main>
        </div>

        {showToc && (
          <ArticleTOC
            className="hidden lg:block sticky top-24 z-20 w-64 xl:w-72 2xl:w-80 shrink-0 self-start"
            hideWhenEmpty
          />
        )}
      </div>

      <FloatingActions />
      <DesktopFooter />
      <EditPostModal />
    </div>
  );
}
