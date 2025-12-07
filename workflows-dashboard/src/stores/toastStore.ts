import { create } from "zustand";
import type { Toast } from "@/types/ui";
import type { ToastState } from "@/types/stores";

export const useToastStore = create<ToastState>(set => ({
  toasts: [],

  addToast: toast => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id
    };

    set(state => ({
      toasts: [...state.toasts, newToast]
    }));
  },

  removeToast: id => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  }
}));

export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: "success",
      title,
      message,
      duration: duration ?? 2500
    });
  },

  error: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: "error",
      title,
      message,
      duration: duration ?? 2500
    });
  },

  warning: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: "warning",
      title,
      message,
      duration: duration ?? 2500
    });
  },

  info: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: "info",
      title,
      message,
      duration: duration ?? 2500
    });
  }
};
