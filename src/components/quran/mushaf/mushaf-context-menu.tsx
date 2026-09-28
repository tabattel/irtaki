"use client";

import type { MushafContextTarget } from "./mushaf-selection";

type MushafContextMenuProps = {
  target: MushafContextTarget;
  x: number;
  y: number;
  onClose: () => void;
};

export function MushafContextMenu({
  target,
  x,
  y,
  onClose,
}: MushafContextMenuProps) {
  const isWord = target.type === "word";

  return (
    <div
      role="menu"
      dir="rtl"
      className="fixed z-50 min-w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] p-1 shadow-xl"
      style={{
        left: Math.min(x, window.innerWidth - 240),
        top: Math.min(y, window.innerHeight - 260),
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="border-b border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]">
        {isWord ? (
          <>
            <div className="font-semibold text-[var(--foreground)]">
              {target.text}
            </div>
            <div>
              {target.surahNumber}:{target.ayahNumber} — mot {target.wordNumber}
            </div>
          </>
        ) : (
          <div className="font-semibold text-[var(--foreground)]">
            الآية {target.surahNumber}:{target.ayahNumber}
          </div>
        )}
      </div>

      {isWord ? (
        <>
          <button
            type="button"
            role="menuitem"
            disabled
            className="block w-full rounded-lg px-3 py-2 text-right text-sm opacity-50"
          >
            بحث عن الكلمة
          </button>

          <button
            type="button"
            role="menuitem"
            disabled
            className="block w-full rounded-lg px-3 py-2 text-right text-sm opacity-50"
          >
            إضافة تعليق
          </button>

          <button
            type="button"
            role="menuitem"
            disabled
            className="block w-full rounded-lg px-3 py-2 text-right text-sm opacity-50"
          >
            تمييز الكلمة
          </button>

          <button
            type="button"
            role="menuitem"
            disabled
            className="block w-full rounded-lg px-3 py-2 text-right text-sm opacity-50"
          >
            تخصيص المظهر
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            role="menuitem"
            disabled
            className="block w-full rounded-lg px-3 py-2 text-right text-sm opacity-50"
          >
            نسخ الآية
          </button>

          <button
            type="button"
            role="menuitem"
            disabled
            className="block w-full rounded-lg px-3 py-2 text-right text-sm opacity-50"
          >
            إضافة تعليق
          </button>

          <button
            type="button"
            role="menuitem"
            disabled
            className="block w-full rounded-lg px-3 py-2 text-right text-sm opacity-50"
          >
            موارد الآية
          </button>
        </>
      )}

      <div className="mt-1 border-t border-[var(--border)] pt-1">
        <button
          type="button"
          role="menuitem"
          onClick={onClose}
          className="block w-full rounded-lg px-3 py-2 text-right text-sm hover:bg-[var(--surface)]"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
