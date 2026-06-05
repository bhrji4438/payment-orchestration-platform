'use client';

/**
 * @file NotificationContext.tsx
 * @description React provider that subscribes to the NotificationService
 * singleton and manages the toast queue state for the UI layer.
 *
 * Responsibilities:
 * - Maintains the active toast queue (max 3 visible)
 * - Handles deduplication by message content
 * - Manages auto-dismiss timers
 * - Provides useNotification() hook (delegates to the singleton service)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { NotificationService, Toast, ToastVariant } from './notification.service';

const MAX_VISIBLE = 3;
const MAX_QUEUE = 10;

interface NotificationContextValue {
  toasts: Toast[];
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  toasts: [],
  dismiss: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (toast: Toast) => {
      setToasts((prev) => {
        // Deduplicate: drop if identical message already visible
        if (prev.some((t) => t.message === toast.message && t.variant === toast.variant)) {
          return prev;
        }
        // Queue overflow protection
        if (prev.length >= MAX_QUEUE) return prev;
        return [...prev, toast];
      });

      // Schedule auto-dismiss
      const delay = NotificationService.getAutoDismissMs(toast.variant);
      const timer = setTimeout(() => dismiss(toast.id), delay);
      timers.current.set(toast.id, timer);
    },
    [dismiss],
  );

  // Subscribe to the singleton service
  useEffect(() => {
    const unsubscribeToast = NotificationService.subscribe(addToast);
    const unsubscribeDismiss = NotificationService.subscribeDismiss(dismiss);
    return () => {
      unsubscribeToast();
      unsubscribeDismiss();
    };
  }, [addToast, dismiss]);

  // Cleanup timers on unmount
  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Only show the first MAX_VISIBLE toasts from the queue
  const visibleToasts = toasts.slice(0, MAX_VISIBLE);

  return (
    <NotificationContext.Provider value={{ toasts: visibleToasts, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
}

/** Hook for consuming the notification context inside React components. */
export function useNotification() {
  useContext(NotificationContext); // ensures re-renders when toasts change
  return {
    success: (message: string) => NotificationService.success(message),
    error: (message: string) => NotificationService.error(message),
    warning: (message: string) => NotificationService.warning(message),
    info: (message: string) => NotificationService.info(message),
    dismiss: (id: string) => NotificationService.dismiss(id),
  };
}

export function useToasts(): Pick<NotificationContextValue, 'toasts' | 'dismiss'> {
  return useContext(NotificationContext);
}

export type { Toast, ToastVariant };
