import { create } from "zustand";

export interface ToastItem {
  id: string;
  message: string;
  type?: "success" | "info" | "error";
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  add: (message: string, type?: "success" | "info" | "error", duration?: number) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = "success", duration = 2500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  success: (msg: string, duration?: number) => useToastStore.getState().add(msg, "success", duration),
  info: (msg: string, duration?: number) => useToastStore.getState().add(msg, "info", duration),
  error: (msg: string, duration?: number) => useToastStore.getState().add(msg, "error", duration),
};
