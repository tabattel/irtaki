"use client";

import { useEffect, useState } from "react";

import {
  getSimilarForAyah,
  type SimilarAyahDto,
} from "@/lib/api/similar";

import type { QuranpediaSimilarGroup } from "@irtaki/resource";

function formatQuranpediaText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function SimilarGroupView({
  group,
  index,
}: {
  group: QuranpediaSimilarGroup;
  index: number;
}) {

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--border)]">
      <header className="border-b border-[var(--border)] bg-[var(--muted)]/5 p-3">
        <h3 className="text-base font-semibold leading-8" dir="rtl">
          {group.notes}
        </h3>
      </header>

      <div className="space-y-3 p-3 sm:p-4">
        {group.ayahs.map((reference, referenceIndex) => {
          const info = reference.info;
          const surahName = info.surah.name;
          const displayText =
            formatQuranpediaText(reference.text) || info.text;

          return (
            <section
              key={`${info.id}-${referenceIndex}`}
              className="rounded-lg border border-[var(--border)] p-3"
              dir="rtl"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold">
                  {surahName}
                </span>

                <span className="text-[var(--muted)]">
                  {info.surah_id}:{info.number}
                </span>
              </div>

              <p className="mushaf-hafs-text text-right text-lg leading-[2.2]">
                {displayText}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border)] pt-2 text-xs text-[var(--muted)]">
                {info.page_number != null && (
                  <span>الصفحة: {info.page_number}</span>
                )}

                {info.juz != null && (
                  <span>الجزء: {info.juz}</span>
                )}

                {info.hizb != null && (
                  <span>الحزب: {info.hizb}</span>
                )}
              </div>

            </section>
          );
        })}

        {group.images.length > 0 && (
          <section className="border-t border-[var(--border)] pt-3">
            <h4 className="mb-2 text-sm font-semibold">الصور المرتبطة</h4>

            <div className="space-y-2">
              {group.images.map((image) => (
                <div
                  key={image.id}
                  className="rounded-lg bg-[var(--muted)]/5 p-3 text-xs"
                >
                  <p className="break-all">
                    {image.name || image.file_name}
                  </p>

                  <p className="mt-1 text-[var(--muted)]">
                    الصورة غير مضمنة في النسخة المحلية الحالية.
                  </p>

                  <p className="mt-1 text-[var(--muted)]">
                    Référence : {image.id}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {group.websites.length > 0 && (
          <section className="border-t border-[var(--border)] pt-3">
            <h4 className="mb-2 text-sm font-semibold">المواقع المرتبطة</h4>

            {group.websites.map((website, websiteIndex) => (
              <pre
                key={websiteIndex}
                className="overflow-x-auto whitespace-pre-wrap break-words text-xs"
              >
                {typeof website === "string"
                  ? website
                  : JSON.stringify(website, null, 2)}
              </pre>
            ))}
          </section>
        )}
      </div>

      <p className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
        المجموعة {index + 1} · {group.ayahs.length} آية مرتبطة
      </p>
    </article>
  );
}

export function MushafSimilarPanel({
  surahNumber,
  ayahNumber,
  onClose,
}: {
  surahNumber: number;
  ayahNumber: number;
  onClose: () => void;
}) {
  const [result, setResult] = useState<SimilarAyahDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setResult(null);
    setError(null);
    setLoading(true);

    void getSimilarForAyah(
      surahNumber,
      ayahNumber,
      controller.signal,
    )
      .then(setResult)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "تعذر تحميل المتشابهات من البيانات المحلية",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [surahNumber, ayahNumber]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4"
      dir="rtl"
    >
      <button
        type="button"
        aria-label="إغلاق لوحة المتشابهات"
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mushaf-similar-title"
        aria-busy={loading}
        className="relative z-10 flex h-[82dvh] max-h-[82dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] p-3 sm:p-4">
          <div className="min-w-0">
            <h2
              id="mushaf-similar-title"
              className="font-semibold"
            >
              متشابهات الآية
            </h2>

            <p className="mt-1 text-xs text-[var(--muted)]">
              السورة: {surahNumber}
              {" · "}
              الآية: {ayahNumber}
            </p>
          </div>

          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            onClick={onClose}
          >
            إغلاق
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {loading && (
            <p role="status" className="py-8 text-center text-sm text-[var(--muted)]">
              جارٍ تحميل المتشابهات من البيانات المحلية…
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 p-4 text-sm text-red-600"
            >
              <p>تعذر تحميل المتشابهات.</p>
              <p className="mt-2 break-words text-xs">{error}</p>
            </div>
          )}

          {!loading && !error && result?.status === "missing" && (
            <div className="py-10 text-center">
              <p className="font-medium">
                لا توجد متشابهات لهذه الآية.
              </p>

              <p className="mt-2 text-xs text-[var(--muted)]">
                لا توجد مجموعات مرتبطة بهذه الآية في بيانات Quranpedia المحلية.
              </p>
            </div>
          )}

          {!loading && !error && result?.status === "found" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                <span>
                  عدد المجموعات: {result.groups.length}
                </span>

                <span>
                  النسخة المحلية: {result.dataVersion}
                </span>
              </div>

              {result.groups.map((group, index) => (
                <SimilarGroupView
                  key={index}
                  group={group}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-[var(--border)] px-3 py-2 text-center text-xs text-[var(--muted)]">
          البيانات محمّلة من موارد IRTAKI المحلية
        </footer>
      </section>
    </div>
  );
}
