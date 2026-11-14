"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OfflineFallbackPage() {
  const router = useRouter();

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-6 text-center"
    >
      <div className="mb-6 text-5xl">📖</div>
      <h1 className="text-xl font-bold text-[var(--foreground)]">
        الصفحة غير متوفرة دون اتصال
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Cette page n'a pas encore été mise en cache pour une consultation hors-ligne.
        Naviguez d'abord vers cette page en ligne, puis revenez hors-ligne.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium transition hover:bg-[var(--surface)]"
        >
          ← العودة
        </button>
        <Link
          href="/coran"
          className="rounded-lg bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-[var(--background)]"
        >
          العودة إلى المصحف
        </Link>
      </div>
    </main>
  );
}
