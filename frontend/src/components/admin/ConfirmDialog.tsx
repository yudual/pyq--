"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useExitAnimation } from "@/lib/use-exit-animation";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const actionRef = useRef<"confirm" | "cancel">("cancel");

  const { closing, handleClose } = useExitAnimation(() => {
    setVisible(false);
    setSubmitting(false);
    if (actionRef.current === "confirm") {
      onConfirm();
    } else {
      onCancel();
    }
  }, 180);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setSubmitting(false);
    } else if (visible && !closing) {
      setVisible(false);
    }
  }, [open, visible, closing]);

  // Esc 键盘关闭支持
  useEffect(() => {
    if (!visible || closing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        actionRef.current = "cancel";
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, closing, handleClose]);

  if (typeof document === "undefined") return null;
  if (!visible && !open) return null;

  const triggerClose = (action: "confirm" | "cancel") => {
    if (submitting || closing) return;
    actionRef.current = action;
    if (action === "confirm") {
      setSubmitting(true);
    }
    handleClose();
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 ${
        closing ? "animate-overlay-out" : "animate-overlay-in"
      }`}
      onClick={() => triggerClose("cancel")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl bg-adm-card p-5 shadow-xl ${
          closing ? "animate-pop-out" : "animate-pop-in"
        }`}
      >
        <h3 className="text-base font-semibold text-adm-text">{title}</h3>
        <p className="mt-2 text-sm text-adm-text-secondary leading-relaxed">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => triggerClose("cancel")}
            disabled={submitting}
            className="adm-btn adm-btn--secondary"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => triggerClose("confirm")}
            disabled={submitting}
            className={danger ? "adm-btn adm-btn--danger" : "adm-btn adm-btn--primary"}
          >
            {submitting ? "处理中..." : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
