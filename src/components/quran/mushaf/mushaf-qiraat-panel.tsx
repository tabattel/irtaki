"use client";

import { useEffect, useState } from "react";

import { getQiraatForAyah, type QiraatAyahDto } from "@/lib/api/qiraat";

export function MushafQiraatPanel({
  surahNumber,
  ayahNumber,
  onClose,
}: {
  surahNumber: number;
  ayahNumber: number;
  onClose: () => void;
}) {
  const [result, setResult] = useState<QiraatAyahDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setResult(null);
    setError(null);
    setLoading(true);

    void getQiraatForAyah(surahNumber, ayahNumber, controller.signal)
      .then(setResult)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "تعذر تحميل القراءات من البيانات المحلية",
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
        aria-label="إغلاق لوحة القراءات"
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mushaf-qiraat-title"
        aria-busy={loading}
        className="relative z-10 flex h-[82dvh] max-h-[82dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] p-3 sm:p-4">
          <div className="min-w-0">
            <h2 id="mushaf-qiraat-title" className="font-semibold">
              قراءات الآية
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
            <p
              role="status"
              className="py-8 text-center text-sm text-[var(--muted)]"
            >
              جارٍ تحميل القراءات من البيانات المحلية…
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 p-4 text-sm text-red-600"
            >
              <p>تعذر تحميل القراءات.</p>
              <p className="mt-2 text-xs break-words">{error}</p>
            </div>
          )}

          {!loading && !error && result?.status === "missing" && (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              لا تتوفر بيانات قراءات لهذه الآية في النسخة المحلية الحالية.
            </p>
          )}

          {!loading &&
            !error &&
            result?.status === "found" &&
            result.words.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                لا توجد تفاصيل قراءات مسجلة لهذه الآية في المصدر.
              </p>
            )}

          {!loading && !error && result?.status === "found" && (
            <div className="space-y-4">
              {result.words.map((word, wordIndex) => (
                <article
                  key={`${wordIndex}-${word.ayah_word}`}
                  className="overflow-hidden rounded-xl border border-[var(--border)]"
                >
                  <header className="border-b border-[var(--border)] bg-[var(--muted)]/5 p-3">
                    <p className="text-xs font-medium text-[var(--muted)]">
                      الموضع {wordIndex + 1} في الآية
                    </p>

                    <p
                      className="mushaf-hafs-text mt-2 text-right text-xl leading-[2.2]"
                      dir="rtl"
                    >
                      {word.ayah_word}
                    </p>
                  </header>

                  <div className="space-y-3 p-3 sm:p-4">
                    {word.qiraat.map((reading, readingIndex) => (
                      <section
                        key={`${wordIndex}-${readingIndex}`}
                        className="rounded-lg border border-[var(--border)] p-3"
                      >
                        <div className="mb-2 text-xs font-semibold text-[var(--muted)]">
                          القراءة {readingIndex + 1}
                        </div>

                        <p
                          className="text-base leading-8 whitespace-pre-wrap"
                          dir="rtl"
                        >
                          {reading.qiraa_text}
                        </p>

                        <div className="mt-3 border-t border-[var(--border)] pt-3">
                          <h4 className="mb-2 text-sm font-semibold">الرواة</h4>

                          {reading.rewayat.length === 0 && (
                            <p className="text-xs text-[var(--muted)]">
                              لا يوجد راوٍ مسجل لهذه القراءة في هذه البيانات.
                            </p>
                          )}

                          <div className="space-y-2">
                            {reading.rewayat.map((rewaya, rewayaIndex) => {
                              const rawi = rewaya.rawi;
                              const qiraa = rawi.qiraa;

                              return (
                                <div
                                  key={`${rawi.id}-${qiraa.id}-${rewayaIndex}`}
                                  className="rounded-lg bg-[var(--muted)]/5 p-3"
                                >
                                  <div className="space-y-1">
                                    <p className="font-semibold">
                                      {qiraa.full_name}
                                    </p>

                                    <p className="text-sm">
                                      الراوي: {rawi.name}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </section>
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
