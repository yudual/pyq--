"use client";

import { ReactNode } from "react";

interface ChannelHeaderProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  count?: number;
  maxWidth?: string;
  rightAction?: ReactNode;
}

export default function ChannelHeader({
  title,
  subtitle,
  icon,
  count,
  maxWidth = "max-w-4xl",
  rightAction,
}: ChannelHeaderProps) {
  return (
    <div className={`relative mx-auto w-full ${maxWidth} px-4 sm:px-6 pt-20 sm:pt-24 pb-6 transition-colors`}>
      <div className="flex items-center justify-between border-b border-neutral-200/70 dark:border-neutral-800/80 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {title}
            </h1>
            {typeof count === "number" && (
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {count}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {subtitle}
          </p>
        </div>
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>
    </div>
  );
}
