import Link from "next/link";
import { Home, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06] mb-6 text-neutral-400 dark:text-neutral-500">
        <FileQuestion className="h-10 w-10 text-neutral-400 dark:text-neutral-500" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight text-wechat-text sm:text-5xl">404</h1>
      <p className="mt-3 text-lg font-medium text-wechat-text">页面未找到</p>
      <p className="mt-1 text-sm text-wechat-time max-w-sm">
        抱歉，您访问的页面不存在或已被移除、更名。
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[#07c160] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#06ae56] active:scale-98"
        >
          <Home className="h-4 w-4" />
          <span>返回首页</span>
        </Link>
      </div>
    </div>
  );
}
