"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { List, X, BookOpen } from "lucide-react";

interface Heading {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

export default function ArticleTOC({
  hideWhenEmpty = false,
  className,
}: {
  hideWhenEmpty?: boolean;
  className?: string;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);

  const extractHeadings = useCallback(() => {
    const articleContent = document.querySelector(".article-content");
    if (!articleContent) return;

    const els = Array.from(
      articleContent.querySelectorAll("h2, h3")
    ) as HTMLElement[];

    const items: Heading[] = els.map((el, i) => {
      const text = el.textContent?.trim() || "";
      if (!el.id) {
        el.id = `article-heading-${i}`;
      }
      return { id: el.id, text, level: el.tagName === "H2" ? 2 : 3, element: el };
    });

    setHeadings(items.filter((h) => h.text.length > 0));
  }, []);

  useEffect(() => {
    const timer = setTimeout(extractHeadings, 300);
    return () => clearTimeout(timer);
  }, [extractHeadings]);

  // TopBar 偏移缓冲
  const SCROLL_OFFSET = 84;
  const SPY_THRESHOLD = 100;

  const resolveHeadingElement = useCallback(
    (heading: Heading): HTMLElement | null => {
      if (heading.element && heading.element.isConnected) {
        return heading.element;
      }
      const byId = document.getElementById(heading.id);
      if (byId) return byId;
      const tag = heading.level === 2 ? "h2" : "h3";
      const candidates = document.querySelectorAll(`.article-content ${tag}`);
      for (const el of candidates) {
        if (el.textContent?.trim() === heading.text) {
          return el as HTMLElement;
        }
      }
      return null;
    },
    []
  );

  useEffect(() => {
    if (headings.length === 0) return;

    const scrollRoot = document.getElementById("scroll-root");

    const onScroll = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      const useRoot = isDesktop && scrollRoot && scrollRoot.scrollHeight > scrollRoot.clientHeight;
      const scrollRect = useRoot ? scrollRoot.getBoundingClientRect() : { top: 0 };
      let current = "";
      for (const h of headings) {
        const el = resolveHeadingElement(h);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const relativeTop = useRoot ? rect.top - scrollRect.top : rect.top;
        if (relativeTop <= SPY_THRESHOLD) {
          current = h.id;
        }
      }
      setActiveId(current);
    };

    if (scrollRoot) scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      if (scrollRoot) scrollRoot.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [headings, resolveHeadingElement]);

  // 桌面端 activeId 变化时，自动平滑滚动目录卡片内部
  useEffect(() => {
    if (!activeId || !containerRef.current) return;
    const activeEl = containerRef.current.querySelector<HTMLElement>(`a[href="#${activeId}"]`);
    if (activeEl) {
      const container = containerRef.current;
      const targetTop = activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }
  }, [activeId]);

  // 移动端抽屉打开时或 activeId 变化时，自动居中高亮章节
  useEffect(() => {
    if (!isMobileDrawerOpen || !activeId || !mobileContainerRef.current) return;
    const activeEl = mobileContainerRef.current.querySelector<HTMLElement>(`a[href="#${activeId}"]`);
    if (activeEl) {
      const container = mobileContainerRef.current;
      const targetTop = activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }
  }, [isMobileDrawerOpen, activeId]);

  // 移动端抽屉打开时，锁定背景滚动，关闭时恢复
  useEffect(() => {
    if (isMobileDrawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileDrawerOpen]);

  // Esc 键关闭移动端抽屉
  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileDrawerOpen]);

  const handleClick = (e: React.MouseEvent, heading: Heading) => {
    e.preventDefault();
    const targetEl = resolveHeadingElement(heading);
    if (!targetEl) return;

    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const scrollRoot = document.getElementById("scroll-root");

    if (isDesktop && scrollRoot && scrollRoot.scrollHeight > scrollRoot.clientHeight) {
      const scrollRect = scrollRoot.getBoundingClientRect();
      const headingRect = targetEl.getBoundingClientRect();
      const top = scrollRoot.scrollTop + (headingRect.top - scrollRect.top) - SCROLL_OFFSET;
      scrollRoot.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    } else {
      const headingRect = targetEl.getBoundingClientRect();
      const top = window.scrollY + headingRect.top - SCROLL_OFFSET;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    setActiveId(heading.id);
  };

  const handleMobileItemClick = (e: React.MouseEvent, heading: Heading) => {
    handleClick(e, heading);
    setIsMobileDrawerOpen(false);
  };

  const defaultAsideClass = "hidden lg:block sticky top-24 z-20 w-64 xl:w-72 2xl:w-80 shrink-0 self-start";
  const asideClass = className || defaultAsideClass;

  if (headings.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <aside className={asideClass}>
        <div className="rounded-2xl bg-wechat-white p-4 sm:p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)] border border-neutral-200/70 dark:border-neutral-800/80">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            <List className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>章节目录</span>
          </h3>
          <p className="py-4 text-center text-xs text-neutral-400 dark:text-neutral-500">暂无标题章节</p>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* 桌面端：常驻右侧吸顶卡片 (>= 1024px 显示) */}
      <aside className={asideClass}>
        <div
          ref={containerRef}
          className="no-scrollbar max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain rounded-2xl bg-wechat-white p-4 sm:p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)] border border-neutral-200/70 dark:border-neutral-800/80"
        >
          <div className="mb-3.5 flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800/60">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              <List className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>章节目录</span>
            </h3>
            <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
              {headings.length} 节
            </span>
          </div>

          <nav className="space-y-1">
            {headings.map((h) => {
              const isActive = activeId === h.id;
              return (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  onClick={(e) => handleClick(e, h)}
                  className={`group flex items-start rounded-lg py-1.5 pr-2.5 text-[13px] leading-snug transition-all ${
                    h.level === 3 ? "pl-5 text-[12.5px]" : "pl-2.5 font-medium"
                  } ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
                      : "text-neutral-600 hover:bg-neutral-100/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 mt-1.5 mr-2 transition-colors ${
                    isActive
                      ? "bg-emerald-500"
                      : "bg-transparent group-hover:bg-neutral-300 dark:group-hover:bg-neutral-600"
                  }`} />
                  <span className="line-clamp-2 min-w-0 flex-1">{h.text}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* 移动端/平板端：精致悬浮呼出胶囊按钮 (< 1024px 显示) */}
      <button
        type="button"
        onClick={() => setIsMobileDrawerOpen(true)}
        className="lg:hidden fixed right-3.5 bottom-[calc(env(safe-area-inset-bottom,0px)+7.2rem)] z-40 flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 bg-white/90 dark:bg-[#1e1e24]/90 px-3.5 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-100 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.18)] dark:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-200 active:scale-90 hover:bg-white dark:hover:bg-[#282830] cursor-pointer"
        title="打开章节目录"
        aria-label="打开章节目录"
      >
        <List className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span>目录</span>
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 px-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          {headings.length}
        </span>
      </button>

      {/* 移动端/平板端：侧边栏滑出抽屉 (Slide-over Drawer) */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          {/* 半透明毛玻璃暗色遮罩 */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-xs animate-overlay-in"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* 右侧滑出主体面板 */}
          <div className="relative z-10 flex h-full w-[84vw] max-w-sm flex-col bg-white dark:bg-[#16161a] border-l border-neutral-200/80 dark:border-neutral-800 shadow-2xl animate-slide-in-right">
            {/* 抽屉头部 */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-sm text-neutral-800 dark:text-neutral-100">
                  章节目录
                </h3>
                <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  共 {headings.length} 节
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                title="关闭目录抽屉"
                aria-label="关闭目录"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 抽屉章节列表 */}
            <div
              ref={mobileContainerRef}
              className="flex-1 overflow-y-auto p-3 space-y-1 overscroll-contain [scrollbar-width:thin]"
            >
              {headings.map((h) => {
                const isActive = activeId === h.id;
                return (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    onClick={(e) => handleMobileItemClick(e, h)}
                    className={`group flex items-start justify-between rounded-xl px-3 py-2.5 text-sm transition-all ${
                      h.level === 3 ? "pl-6 text-[13px]" : "font-medium"
                    } ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 mt-2 transition-colors ${
                        isActive
                          ? "bg-emerald-500 scale-125"
                          : "bg-neutral-300 dark:bg-neutral-700 group-hover:bg-neutral-400"
                      }`} />
                      <span className="line-clamp-2 leading-relaxed">{h.text}</span>
                    </div>
                    {isActive && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2 mt-0.5">
                        当前
                      </span>
                    )}
                  </a>
                );
              })}
            </div>

            {/* 抽屉底部提示 */}
            <div className="border-t border-neutral-100 dark:border-neutral-800/80 px-4 py-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
              点击章节立即平滑跳转阅读
            </div>
          </div>
        </div>
      )}
    </>
  );
}
