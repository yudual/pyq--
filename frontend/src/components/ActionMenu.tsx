"use client";

import { useState, useRef, useEffect } from "react";
import { Heart, MessageSquare, Pencil, Trash2, Pin, PinOff, Share2 } from "lucide-react";

interface ActionMenuProps {
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  liked?: boolean;
  pinned?: boolean;
}

export default function ActionMenu({
  onLike,
  onComment,
  onShare,
  onEdit,
  onDelete,
  onPin,
  liked = false,
  pinned = false,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 管理员登录后菜单项多（赞/评论/分享/置顶/编辑/删除），手机端需要紧凑布局
  // 访客时只有赞/评论/分享，用稍大舒适尺寸
  const isFullMenu = !!(onPin || onEdit || onDelete);
  const itemCls = isFullMenu
    ? "flex h-full items-center gap-[4px] whitespace-nowrap px-2.5 md:gap-1.5 md:px-3.5 text-[12px] md:text-[14px] font-medium hover:bg-[#5c5c5c] transition-colors cursor-pointer"
    : "flex h-full items-center gap-1.5 md:gap-2 whitespace-nowrap px-3.5 md:px-4 text-[13px] md:text-[14px] font-medium hover:bg-[#5c5c5c] transition-colors cursor-pointer";
  const iconCls = isFullMenu
    ? "h-[14px] w-[14px] md:h-[16px] md:w-[16px]"
    : "h-[16px] w-[16px] md:h-[18px] md:w-[18px]";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("touchstart", onPointerDown, { passive: true });
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const Divider = () => <div className="h-[20px] w-px bg-[#5c5c5c]" />;

  // 无任何可用操作时不显示按钮
  if (!onLike && !onComment && !onShare && !onPin && !onEdit && !onDelete) return null;

  return (
    <div className="relative" ref={containerRef}>
      {/* 两个点按钮 — 微信朋友圈风格 */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-[20px] w-[28px] items-center justify-center rounded-[4px] bg-wechat-bubble transition-colors hover:bg-wechat-hover active:bg-wechat-border cursor-pointer"
        aria-label="操作"
      >
        <span className="flex items-center gap-[3px]">
          <span className="h-[3px] w-[3px] rounded-full bg-wechat-nickname" />
          <span className="h-[3px] w-[3px] rounded-full bg-wechat-nickname" />
        </span>
      </button>

      {/* 弹出菜单：赞 / 评论 / 分享 / 置顶 / 编辑 / 删除 — 微信朋友圈风格 */}
      {open && (
        <div className="absolute right-full top-1/2 z-20 mr-1.5 flex h-[38px] origin-right -translate-y-1/2 items-center overflow-hidden rounded-[7px] bg-[#4c4c4c] text-white shadow-lg animate-pop-in">
          {(() => {
            const items: React.ReactNode[] = [];
            if (onLike) {
              items.push(
                <button
                  key="like"
                  type="button"
                  onClick={() => {
                    onLike();
                    setOpen(false);
                  }}
                  className={itemCls}
                >
                  <Heart
                    className={`${iconCls} ${liked ? "text-red-500" : ""}`}
                    fill={liked ? "currentColor" : "none"}
                    strokeWidth={1.8}
                  />
                  <span>{liked ? "取消" : "赞"}</span>
                </button>
              );
            }
            if (onComment) {
              items.push(
                <button
                  key="comment"
                  type="button"
                  onClick={() => {
                    onComment();
                    setOpen(false);
                  }}
                  className={itemCls}
                >
                  <MessageSquare className={iconCls} strokeWidth={1.8} />
                  <span>评论</span>
                </button>
              );
            }
            if (onShare) {
              items.push(
                <button
                  key="share"
                  type="button"
                  onClick={() => {
                    onShare();
                    setOpen(false);
                  }}
                  className={itemCls}
                >
                  <Share2 className={iconCls} strokeWidth={1.8} />
                  <span>分享</span>
                </button>
              );
            }
            if (onPin) {
              items.push(
                <button
                  key="pin"
                  type="button"
                  onClick={() => {
                    onPin();
                    setOpen(false);
                  }}
                  className={itemCls}
                >
                  {pinned ? (
                    <PinOff className={iconCls} strokeWidth={1.8} />
                  ) : (
                    <Pin className={iconCls} strokeWidth={1.8} />
                  )}
                  <span>{pinned ? "取消置顶" : "置顶"}</span>
                </button>
              );
            }
            if (onEdit) {
              items.push(
                <button
                  key="edit"
                  type="button"
                  onClick={() => {
                    onEdit();
                    setOpen(false);
                  }}
                  className={itemCls}
                >
                  <Pencil className={iconCls} strokeWidth={1.8} />
                  <span>编辑</span>
                </button>
              );
            }
            if (onDelete) {
              items.push(
                <button
                  key="delete"
                  type="button"
                  onClick={() => {
                    onDelete();
                    setOpen(false);
                  }}
                  className={itemCls}
                >
                  <Trash2 className={iconCls} strokeWidth={1.8} />
                  <span>删除</span>
                </button>
              );
            }
            return items.map((item, idx) => (
              <div key={idx} className="flex h-full items-center">
                {idx > 0 && <Divider />}
                {item}
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
