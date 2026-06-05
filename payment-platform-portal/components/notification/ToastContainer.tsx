'use client';

/**
 * @file ToastContainer.tsx
 * @description Fixed-position container for toasts. Renders above all other
 * UI elements including modals (z-[9999]). Positioned bottom-right on desktop,
 * bottom-center on mobile.
 */

import React from 'react';
import { useToasts } from './NotificationContext';
import { Toast } from './Toast';
import { NotificationService } from './notification.service';

export function ToastContainer() {
  const { toasts, dismiss } = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none sm:bottom-6 sm:right-6 max-sm:bottom-4 max-sm:right-4 max-sm:left-4 max-sm:max-w-none"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={dismiss}
          autoDismissMs={NotificationService.getAutoDismissMs(toast.variant)}
        />
      ))}
    </div>
  );
}
