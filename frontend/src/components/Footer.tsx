"use client";

import { useEffect } from "react";
import { useSiteSettings } from "@/lib/site-settings-store";

/** 全局底部：版权与备案信息一行展开平铺 */
export default function Footer() {
  const beian = useSiteSettings((s) => s.beian);
  const beianUrl = useSiteSettings((s) => s.beianUrl);
  const footerHtml = useSiteSettings((s) => s.footerHtml);
  const loaded = useSiteSettings((s) => s.loaded);
  const fetchSettings = useSiteSettings((s) => s.fetchSettings);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (!loaded || (!footerHtml && !beian)) return null;

  const href = beianUrl || "https://beian.miit.gov.cn";

  return (
    <footer className="w-full py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
      <div className="mx-auto flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-4 leading-relaxed">
        {footerHtml && (
          <span
            className="footer-html inline-flex flex-wrap items-center gap-x-1 [&_a]:text-neutral-500 hover:[&_a]:text-neutral-700 dark:[&_a]:text-neutral-400 dark:hover:[&_a]:text-neutral-200 transition-colors"
            dangerouslySetInnerHTML={{ __html: footerHtml }}
          />
        )}
        {footerHtml && beian && (
          <span className="text-neutral-300 dark:text-neutral-600 select-none">·</span>
        )}
        {beian && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            {beian}
          </a>
        )}
      </div>
    </footer>
  );
}
