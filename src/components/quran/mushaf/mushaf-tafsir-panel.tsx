"use client";

import { useEffect, useState } from "react";
import {
  getTafsirForAyah,
  type TafsirAyahDto,
  type TafsirBookId,
} from "@/lib/api/tafsir";
import type { SafeTafsirNode } from "@irtaki/resource";

const BOOK_OPTIONS: readonly {
  id: TafsirBookId;
  label: string;
}[] = [
  {
    id: "quranpedia-tafsir-muyassar",
    label: "التفسير الميسر",
  },
  {
    id: "quranpedia-tafsir-jalalayn",
    label: "تفسير الجلالين",
  },
];

function SafeTafsirNodeView({
  node,
}: {
  node: SafeTafsirNode;
}) {
  if (node.type === "text") {
    return <>{node.value}</>;
  }

  const className = node.classes.join(" ") || undefined;

  const children = node.children.map((child, index) => (
    <SafeTafsirNodeView key={index} node={child} />
  ));

  switch (node.tag) {
    case "br":
      return <br />;
    case "span":
      return <span className={className}>{children}</span>;
    case "p":
      return <p className={className}>{children}</p>;
    case "strong":
      return <strong className={className}>{children}</strong>;
    case "div":
      return <div className={className}>{children}</div>;
  }
}

export function MushafTafsirPanel({
  ayahId,
  onClose,
}: {
  ayahId: number | null;
  onClose: () => void;
}) {
  const [bookId, setBookId] = useState<TafsirBookId>(
    "quranpedia-tafsir-muyassar",
  );
  const [result, setResult] = useState<TafsirAyahDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ayahId === null) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setResult(null);
    setError(null);
    setLoading(true);

    void getTafsirForAyah(
      ayahId,
      bookId,
      controller.signal,
    )
      .then(setResult)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "تعذر تحميل التفسير",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [ayahId, bookId]);

  if (ayahId === null) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4"
      dir="rtl"
    >
      <button
        type="button"
        aria-label="إغلاق لوحة التفسير"
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mushaf-tafsir-title"
        aria-busy={loading}
        className="relative z-10 flex max-h-[82dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="min-w-0">
            <h2
              id="mushaf-tafsir-title"
              className="font-semibold"
            >
              تفسير الآية
            </h2>

            <p className="mt-1 text-xs text-[var(--muted)]">
              رقم الآية: {result?.ayah.number ?? "—"}
              {" · "}
              السورة: {result?.ayah.surahNumber ?? "—"}
            </p>
          </div>

          <button
            type="button"
            className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-2"
            onClick={onClose}
          >
            إغلاق
          </button>
        </header>

        <div className="border-b border-[var(--border)] p-3">
          <label
            htmlFor="mushaf-tafsir-book"
            className="mb-2 block text-sm font-medium"
          >
            كتاب التفسير
          </label>

          <select
            id="mushaf-tafsir-book"
            value={bookId}
            onChange={(event) =>
              setBookId(event.target.value as TafsirBookId)
            }
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
          >
            {BOOK_OPTIONS.map((book) => (
              <option key={book.id} value={book.id}>
                {book.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-24 overflow-y-auto p-4">
          {loading && (
            <p role="status" className="text-sm text-[var(--muted)]">
              جارٍ تحميل التفسير…
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          {!loading && !error && result?.status === "missing" && (
            <p className="text-sm text-[var(--muted)]">
              لا يتوفر تفسير لهذه الآية في هذا الكتاب.
            </p>
          )}

          {!loading && !error && result?.status === "found" && (
            <div className="space-y-4">
              <div className="text-sm font-semibold">
                {result.book.name}
              </div>

              {result.book.author && (
                <p className="text-xs text-[var(--muted)]">
                  {result.book.author}
                  {result.book.edition
                    ? ` · ${result.book.edition}`
                    : ""}
                </p>
              )}

              {result.content.map((block, index) => (
                <article
                  key={`${block.part ?? "part"}-${block.page ?? "page"}-${index}`}
                  className="space-y-2 border-b border-[var(--border)] pb-4 last:border-b-0"
                >
                  {(block.part !== null || block.page !== null) && (
                    <p className="text-xs text-[var(--muted)]">
                      {block.part !== null
                        ? `الجزء: ${block.part}`
                        : ""}
                      {block.part !== null && block.page !== null
                        ? " · "
                        : ""}
                      {block.page !== null
                        ? `الصفحة: ${block.page}`
                        : ""}
                    </p>
                  )}

                  <div className="whitespace-pre-wrap text-base leading-8">
                    {block.nodes.map((node, nodeIndex) => (
                      <SafeTafsirNodeView
                        key={nodeIndex}
                        node={node}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
