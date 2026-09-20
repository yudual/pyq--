"use client";

import { useToastStore } from "@/lib/toast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="通知提示"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center gap-2 max-w-[90vw] sm:max-w-md w-auto"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[13px] sm:text-[14px] font-medium shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 animate-fade-in-down border bg-white/95 text-neutral-800 border-neutral-200/80 dark:bg-neutral-900/95 dark:text-neutral-100 dark:border-neutral-800/90"
        >
          {t.type === "success" && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          )}
          {t.type === "error" && (
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          )}
          {t.type === "info" && (
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
          )}
          <span className="truncate max-w-[280px] sm:max-w-xs">{t.message}</span>
          <button
            type="button"
            onClick={() => remove(t.id)}
            className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            aria-label="关闭提示"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </aside>
  );
}
