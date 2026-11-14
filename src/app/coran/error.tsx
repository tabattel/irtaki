"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CoranError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Coran Error]", error);
  }, [error]);

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-6 text-center">
      <div className="mb-6 text-4xl">📖</div>
      <h1 className="text-xl font-bold text-[var(--foreground)]">
        Page indisponible hors connexion
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Cette page n'a pas encore été téléchargée. Vous pouvez toujours naviguer.
      </p>
      
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => reset()}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface)]"
        >
          Réessayer
        </button>
        <Link
          href="/coran"
          className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm text-[var(--background)]"
        >
          Retour au sommaire
        </Link>
      </div>
    </main>
  );
}
