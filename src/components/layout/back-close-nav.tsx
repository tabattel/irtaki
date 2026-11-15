"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/objectifs", label: "الأهداف" },
  { href: "/statistiques", label: "الإحصائيات" },
  { href: "/historique", label: "السجل" },
] as const;

export function BackCloseNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      className="sticky top-2 z-40 mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/95 p-2.5 backdrop-blur"
      dir="rtl"
    >
      <nav className="flex flex-wrap gap-2" aria-label="التنقل بين المساحات">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "min-h-11 rounded-lg bg-emerald-600 px-4 text-base font-bold leading-[44px] text-white shadow-sm"
                  : "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 text-base font-semibold leading-[44px] text-[var(--foreground)] transition hover:bg-[var(--surface)]"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => router.back()}
        aria-label="إغلاق والعودة"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-xl font-bold leading-none text-[var(--foreground)] transition hover:bg-[var(--surface)]"
      >
        ✕
      </button>
    </div>
  );
}
