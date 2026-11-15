"use client";

import { AccountPanel } from "@/components/layout/account-panel";
import { useRouter } from "next/navigation";

export default function ComptePage() {
  const router = useRouter();

  function closeCompte() {
    if (typeof window !== "undefined" && window.history.length > 2) {
      router.back();
      return;
    }
    router.push("/coran");
  }

  return (
    <main
      data-compte-version="2026-11-15-v2"
      className="mx-auto w-full max-w-2xl px-3 py-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
    >
      <div className="space-y-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">الحساب</h1>
          <button
            type="button"
            onClick={closeCompte}
            aria-label="إغلاق والعودة"
            title="إغلاق والعودة"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-2xl font-bold leading-none text-[var(--foreground)] hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
          >
            ×
          </button>
        </header>
        <AccountPanel />
      </div>
    </main>
  );
}
