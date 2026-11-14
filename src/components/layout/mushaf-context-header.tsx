"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { MushafLearnerIndicator } from "@/components/quran/mushaf/mushaf-learner-indicator";

type Riwaya = {
  id: number;
  name?: string | null;
  latinName?: string | null;
};

function openAccountPanel() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("irtaki:open-account-panel"));
  }
}

export function MushafContextHeader() {
  const pathname = usePathname();
  const match = pathname?.match(/\/coran\/(\d+)/);
  const riwayaId = match ? Number(match[1]) : null;

  const [riwayaName, setRiwayaName] = useState<string | null>(null);

  useEffect(() => {
    if (!riwayaId || Number.isNaN(riwayaId)) {
      setRiwayaName(null);
      return;
    }

    let cancelled = false;

    fetch(`/api/riwayat/${riwayaId}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled) return;
        const riwaya = payload?.data as Riwaya | undefined;
        const resolved =
          riwaya?.name ??
          riwaya?.latinName ??
          (riwayaId === 10 ? "حفص عن عاصم" : null);
        setRiwayaName(resolved);
      })
      .catch(() => {
        if (!cancelled) setRiwayaName(null);
      });

    return () => {
      cancelled = true;
    };
  }, [riwayaId]);

  if (!riwayaId || Number.isNaN(riwayaId)) {
    return null;
  }

  return (
    <div
      className="mb-3 overflow-hidden rounded-xl border border-[var(--jannah-gold)]/50 bg-gradient-to-l from-[var(--jannah-cream)] via-white to-[var(--jannah-cream)]/70 shadow-sm"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--jannah-gold)]">
            المصحف
          </div>
          <div className="truncate text-lg font-bold leading-tight text-[var(--jannah-green)]">
            {riwayaName ?? (riwayaId === 10 ? "حفص عن عاصم" : "")}
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={openAccountPanel}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openAccountPanel();
            }
          }}
          aria-label="فتح لوحة الحساب"
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--jannah-gold)]/60 bg-white px-2.5 py-1.5 text-sm font-semibold text-[var(--jannah-green)] shadow-sm transition hover:bg-[var(--jannah-cream)] hover:shadow active:scale-95"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
          <MushafLearnerIndicator />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3 w-3 opacity-60"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
