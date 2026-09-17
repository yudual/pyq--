import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DesktopDecorations from "@/components/DesktopDecorations";
import ArticleTOC from "@/components/ArticleTOC";
import FloatingActions from "@/components/FloatingActions";
import Footer from "@/components/Footer";
import DesktopFooter from "@/components/DesktopFooter";
import EditPostModal from "@/components/EditPostModal";
import ArticleReader from "@/components/article/ArticleReader";
import ProfileFadeIn from "@/components/profile/ProfileFadeIn";
import { Post } from "@/lib/mock-data";
import { getApiUrl } from "@/lib/api-fetch";
import { stripMarkdownAndHtml } from "@/lib/frontmatter";

const API_URL = getApiUrl();

export const revalidate = 10;

async function getPost(id: string): Promise<Post | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/posts/${id}`, {
      next: { revalidate: 10, tags: ["posts"] },
    });
  } catch (err) {
    throw new Error(`网络请求失败: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`获取文章失败 (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const post = await getPost(id);
    if (!post) return { title: "文章详情" };
    const cleanSummary = stripMarkdownAndHtml(post.excerpt || post.content || "");
    return {
      title: `${post.title || "文章详情"} - 个人博客`,
      description: cleanSummary.slice(0, 150) || "文章详情",
    };
  } catch {
    return { title: "文章详情" };
  }
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  if (post.status === "draft") notFound();

  // 跨频道路由守卫 (Cross-Channel Route Guard)
  if (post.category === "项目" || post.type === "project") {
    redirect(`/projects/${post.shortId || post.id}`);
  }
  if (post.type !== "article") {
    redirect(`/moments/${post.shortId || post.id}`);
  }

  return (
    <div id="scroll-root" className="relative min-h-screen overflow-x-hidden bg-wechat-white md:bg-wechat-bg transition-colors">
      <DesktopDecorations />

      {/* 居中自适应博客阅读容器与右侧目录 */}
      <div className="relative mx-auto w-full max-w-6xl xl:max-w-7xl px-3 sm:px-6 pt-18 sm:pt-24 pb-16 flex justify-center items-start gap-8">
        <div className="w-full max-w-4xl min-w-0 flex-1 flex flex-col">
          {/* 返回文章列表 */}
          <div className="mb-4 sm:mb-6">
            <Link
              href="/articles"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回文章列表</span>
            </Link>
          </div>

          <main className="relative flex min-h-[calc(100vh-10rem)] w-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-wechat-white p-4 sm:p-8 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] border border-neutral-200/60 dark:border-neutral-800/80">
            <ProfileFadeIn>
              <div className="flex-1">
                <ArticleReader post={post} />
              </div>
              <div className="mt-16">
                <Footer />
              </div>
            </ProfileFadeIn>
          </main>
        </div>

        {/* 桌面端右侧章节目录 (>= 1024px 显示，sticky跟随滚动) */}
        <ArticleTOC
          className="hidden lg:block lg:sticky lg:top-24 lg:w-60 xl:w-[17rem] shrink-0 self-start"
          hideWhenEmpty
        />
      </div>

      <FloatingActions />
      <DesktopFooter />
      <EditPostModal />
    </div>
  );
}
