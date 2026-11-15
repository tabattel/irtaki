"use client";

import { GotoPanel } from "@/components/layout/goto-panel";
import { useRouter, usePathname } from "next/navigation";

import { MushafRequired } from "@/components/layout/mushaf-required";
export default function GotoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const riwayaMatch = pathname?.match(/^\/coran\/([^/]+)/);
  const riwayaId = riwayaMatch?.[1] ?? "";const riwayaId = riwayaMatch?.[1] ?? "";

  if (!riwayaId || !/^\d+$/.test(riwayaId)) {
    return <MushafRequired />;
  }

  function closeGoto() {
    if (typeof window !== "undefined" && window.history.length > 2) {
      router.back();
      return;
    }
    router.push(`/coran/${riwayaId}/page/1`);
  }

  return (
    <main data-goto-version="2026-11-15-v1" className="mx-auto w-full max-w-3xl px-3 py-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="space-y-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">انتقل إلى</h1>
          <button
            type="button"
            onClick={closeGoto}
            aria-label="إغلاق والعودة"
            title="إغلاق والعودة"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-2xl font-bold leading-none text-[var(--foreground)] hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
          >
            ×
          </button>
        </header>
        <p className="text-[var(--muted)]">
          اختر الصفحة أو السورة أو موضع القراءة للانتقال إليه.
        </p>
        <GotoPanel />
        
      </div>
    </main>
  );
}
