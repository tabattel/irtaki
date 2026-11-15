"use client";

import { useEffect, useState } from "react";

export type ErrorAlertProps = {
  message: string | null | undefined;
  title?: string;
  autoDismissMs?: number;
  onDismiss?: () => void;
  className?: string;
};

export function ErrorAlert({
  message,
  title,
  autoDismissMs,
  onDismiss,
  className = "",
}: ErrorAlertProps) {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (autoDismissMs && autoDismissMs > 0) {
      const t = window.setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, autoDismissMs);
      return () => window.clearTimeout(t);
    }
  }, [message, autoDismissMs, onDismiss]);

  if (!visible || !message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={
        "mb-3 flex items-start gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-red-800 shadow-sm " +
        className
      }
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="mt-0.5 h-5 w-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div className="flex-1">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        <p className="text-sm font-medium" dir="rtl">{message}</p>
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label="إغلاق"
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
          className="shrink-0 rounded p-1 text-red-700 hover:bg-red-100"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
