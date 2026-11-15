import Link from "next/link";

export function MushafRequired() {
  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <div className="text-5xl" aria-hidden="true">📖</div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          اختر المصحف أولا
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
          لم يتم تحديد أي مصحف بعد. يرجى العودة إلى قائمة المصاحف
          واختيار مصحف للمتابعة.
        </p>
        <Link
          href="/coran/page"
          className="rounded-lg bg-[var(--foreground)] px-5 py-2 font-semibold text-[var(--background)] transition hover:opacity-90"
        >
          الذهاب إلى قائمة المصاحف
        </Link>
      </div>
    </main>
  );
}
