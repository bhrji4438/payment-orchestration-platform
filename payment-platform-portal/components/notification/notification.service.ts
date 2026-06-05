/**
 * @file notification.service.ts
 * @description Singleton notification service — callable from anywhere,
 * including Axios interceptors and utility functions that run outside React.
 *
 * Architecture:
 * - This is a plain TypeScript singleton (no React dependency).
 * - The React NotificationContext subscribes to this service via a listener.
 * - This decoupling means you can call NotificationService.error() from
 *   api.ts interceptors, Zustand actions, or any async utility without
 *   needing a React hook reference.
 *
 * This is the same pattern used by Sentry, Datadog RUM, and other FAANG-grade
 * SDKs that need to emit events both inside and outside React component trees.
 */

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  createdAt: number;
}

type ToastListener = (toast: Toast) => void;
type DismissListener = (id: string) => void;

// Auto-dismiss durations (ms) — per spec
const AUTO_DISMISS: Record<ToastVariant, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};

class NotificationServiceClass {
  private listeners: ToastListener[] = [];
  private dismissListeners: DismissListener[] = [];

  /** Subscribe the React context to toast events. Returns an unsubscribe fn. */
  subscribe(listener: ToastListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Subscribe to dismiss events (e.g. from service-level auto-dismiss). */
  subscribeDismiss(listener: DismissListener): () => void {
    this.dismissListeners.push(listener);
    return () => {
      this.dismissListeners = this.dismissListeners.filter((l) => l !== listener);
    };
  }

  private emit(variant: ToastVariant, message: string): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const toast: Toast = { id, variant, message, createdAt: Date.now() };
    this.listeners.forEach((l) => l(toast));
    return id;
  }

  success(message: string): string {
    return this.emit('success', message);
  }

  error(message: string): string {
    return this.emit('error', message);
  }

  warning(message: string): string {
    return this.emit('warning', message);
  }

  info(message: string): string {
    return this.emit('info', message);
  }

  dismiss(id: string): void {
    this.dismissListeners.forEach((l) => l(id));
  }

  getAutoDismissMs(variant: ToastVariant): number {
    return AUTO_DISMISS[variant];
  }
}

/** Singleton instance — import this anywhere in the codebase. */
export const NotificationService = new NotificationServiceClass();
