"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global boundary caught error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-6">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-wechat-text sm:text-3xl">页面加载遇到问题</h1>
      <p className="mt-2 text-sm text-wechat-time max-w-sm">
        抱歉，加载过程中发生了未知错误。您可以尝试重新加载页面，或返回首页。
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#07c160] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#06ae56] active:scale-98"
        >
          <RotateCcw className="h-4 w-4" />
          <span>重试</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-wechat-text shadow-sm transition-all hover:bg-neutral-50 active:scale-98 dark:border-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          <Home className="h-4 w-4" />
          <span>返回首页</span>
        </Link>
      </div>
    </div>
  );
}
