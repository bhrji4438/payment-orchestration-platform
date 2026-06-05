'use client';

/**
 * @file Toast.tsx
 * @description Individual toast notification component.
 * Supports success, error, warning, info variants with:
 * - Animated entry/exit
 * - Progress bar countdown
 * - Manual close button
 * - Full ARIA accessibility (role="alert", aria-live)
 */

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Toast as ToastType, ToastVariant } from './notification.service';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
  autoDismissMs: number;
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    icon: React.ReactNode;
    container: string;
    progress: string;
    iconColor: string;
    ariaLive: 'polite' | 'assertive';
  }
> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
    container:
      'bg-zinc-900 border border-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.08)]',
    progress: 'bg-emerald-500',
    iconColor: 'text-emerald-400',
    ariaLive: 'polite',
  },
  error: {
    icon: <XCircle className="h-4 w-4 shrink-0" />,
    container:
      'bg-zinc-900 border border-red-500/25 shadow-[0_0_20px_rgba(239,68,68,0.08)]',
    progress: 'bg-red-500',
    iconColor: 'text-red-400',
    ariaLive: 'assertive',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
    container:
      'bg-zinc-900 border border-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.08)]',
    progress: 'bg-amber-500',
    iconColor: 'text-amber-400',
    ariaLive: 'polite',
  },
  info: {
    icon: <Info className="h-4 w-4 shrink-0" />,
    container:
      'bg-zinc-900 border border-indigo-500/25 shadow-[0_0_20px_rgba(99,102,241,0.08)]',
    progress: 'bg-indigo-500',
    iconColor: 'text-indigo-400',
    ariaLive: 'polite',
  },
};

export function Toast({ toast, onDismiss, autoDismissMs }: ToastProps) {
  const config = VARIANT_CONFIG[toast.variant];
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate in
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Progress bar countdown
  useEffect(() => {
    const step = 100 / (autoDismissMs / 50); // update every 50ms
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return next;
      });
    }, 50);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoDismissMs]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  return (
    <div
      role="alert"
      aria-live={config.ariaLive}
      aria-atomic="true"
      className={`
        relative w-full max-w-sm rounded-xl overflow-hidden pointer-events-auto
        transition-all duration-300 ease-out
        ${config.container}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      {/* Content */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className={`mt-0.5 ${config.iconColor}`}>{config.icon}</span>
        <p className="flex-1 text-sm font-medium text-zinc-200 leading-snug pr-1">
          {toast.message}
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="text-zinc-500 hover:text-zinc-300 transition-colors mt-0.5 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full bg-zinc-800">
        <div
          className={`h-full transition-none ${config.progress}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
