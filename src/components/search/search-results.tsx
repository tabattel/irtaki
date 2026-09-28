import Link from "next/link";

import type { SearchResult } from "@/lib/api/search";

type SearchResultsProps = {
  results: SearchResult[];
  total: number;
};

export function SearchResults({ results, total }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
        لا توجد نتائج.
      </p>
    );
  }

  return (
    <section aria-label="نتائج البحث">
      <p className="mb-4 text-sm text-[var(--muted)]">عدد النتائج: {total}</p>

      <ol className="space-y-4">
        {results.map((result) => {
          const href =
            result.source === "ayah" &&
            result.pageNumber !== undefined &&
            result.ayahId !== undefined
              ? `/coran/page/${result.pageNumber}?ayah=${result.ayahId}`
              : `/coran/${result.surahNumber}`;

          return (
            <li key={`${result.source}-${result.resultNumber}`}>
              <Link
                href={href}
                className="block rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 transition hover:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--foreground)] focus:outline-none"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                  <span className="font-semibold">سورة {result.surahName}</span>

                  {result.ayahNumber !== undefined && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>الآية {result.ayahNumber}</span>
                    </>
                  )}

                  {result.pageNumber !== undefined && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>صفحة {result.pageNumber}</span>
                    </>
                  )}
                </div>

                <p className="text-lg leading-10" dir="rtl">
                  {result.text}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
