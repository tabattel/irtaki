"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { MushafRequired } from "@/components/layout/mushaf-required";
type Hit = { id: number; surah: number; ayah: number; text: string; page?: number; occurrences?: number; surahName?: string };
type SurahEntry = { num: number; name: string; normExact: string; normPartial: string; firstPage: number; firstAyahId: number; ayahCount: number };
type WordEntry = { word: string; norm: string; count: number };
type SearchIndex = { words: WordEntry[]; surahs: SurahEntry[] };

const VERSION = "2026-11-15-scoped-v1";

function normalizePartial(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0640/g, "")
    .replace(/\u0629/g, "\u062A")
    .replace(/\u0627/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function displaySurah(name: string): string {
  const clean = (name || "").replace(/^سورة\s+/u, "").trim();
  return clean ? `سورة ${clean}` : "";
}

export default function QuranSearchScopedPage() {
  const router = useRouter();
  const params = useParams<{ riwayaId: string }>();
  const riwayaId = params?.riwayaId ?? "";const riwayaId = params?.riwayaId ?? "";

  if (!riwayaId || !/^\d+$/.test(riwayaId)) {
    return <MushafRequired />;
  }

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"partial" | "exact">("partial");
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestRect, setSuggestRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/quran-search-index.json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: SearchIndex) => setIndex(d))
      .catch((e) => setIndexError(String(e)));
  }, []);

  const norm = normalizePartial(query);
  const surahMatches = useMemo(() => {
    if (!index || norm.length < 2) return [];
    return index.surahs.filter((s) => s.normPartial.includes(norm) || s.normExact.includes(norm));
  }, [index, norm]);
  const suggestions = useMemo(() => {
    if (!index || norm.length < 2) return [];
    return index.words.filter((e) => e.norm.includes(norm)).slice(0, 20).map((e) => e.word);
  }, [index, norm]);

  function reposition() {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSuggestRect({ left: r.left, top: r.bottom + 4, width: r.width });
  }

  function navigateTo(page: number, ayahId: number) {
    if (!riwayaId) return;
    router.push(`/coran/${encodeURIComponent(riwayaId)}/page/${page}?ayah=${ayahId}`);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(null); setTotal(null);
    try {
      const res = await fetch(`/api/quran/search?q=${encodeURIComponent(query)}&mode=${mode}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHits(data.results ?? []);
      setTotal(typeof data.total === "number" ? data.total : null);
    } catch {
      setError("تعذر إجراء البحث. حاول مرة أخرى.");
      setHits([]);
    } finally {
      setLoading(false);
    }
  }

  function closeSearch() {
    if (typeof window !== "undefined" && window.history.length > 2) {
      router.back();
      return;
    }
    router.push(`/coran/${riwayaId || "10"}/page/1`);
  }

  return (
    <main data-search-version={VERSION} className="mx-auto w-full max-w-7xl px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8">
      <div className="space-y-8">
        
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold">البحث في القرآن</h1>
            <button
              type="button"
              onClick={closeSearch}
              aria-label="إغلاق البحث والعودة إلى المصحف"
              title="إغلاق والعودة"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-2xl font-bold leading-none text-[var(--foreground)] hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
            >
              ×
            </button>
          </div>
          <p className="text-[var(--muted)]">
            الرواية الحالية : <span className="font-semibold">{riwayaId || "—"}</span>
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row" role="search">
          <div className="relative flex-1">
            <label htmlFor="scoped-search" className="sr-only">البحث في القرآن</label>
            <input
              ref={inputRef}
              id="scoped-search"
              name="quran-search-scoped"
              type="text"
              inputMode="search"
              dir="rtl"
              placeholder="ابحث في القرآن..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { reposition(); setShowSuggestions(true); }}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 200)}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              className="min-h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 outline-none focus:ring-2 focus:ring-[var(--foreground)]"
            />
            {showSuggestions && suggestions.length > 0 && suggestRect && typeof document !== "undefined" && (
              <ul
                dir="rtl"
                style={{ position: "fixed", left: suggestRect.left, top: suggestRect.top, width: suggestRect.width, zIndex: 9999 }}
                className="max-h-56 overflow-y-auto overscroll-contain rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-xl"
              >
                {suggestions.map((w, i) => (
                  <li key={`${w}-${i}`}>
                    <button
                      type="button"
                      dir="rtl"
                      className="w-full px-3 py-2 text-right text-sm hover:bg-[var(--border)]"
                      onMouseDown={(e) => { e.preventDefault(); setQuery(w); setShowSuggestions(false); }}
                    >
                      {w}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "partial" | "exact")}
            className="min-h-12 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4"
          >
            <option value="partial">بحث جزئي</option>
            <option value="exact">بحث مطابق</option>
          </select>
          <button type="submit" disabled={!query.trim() || loading}
            className="min-h-12 rounded-lg bg-[var(--foreground)] px-6 font-semibold text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "…" : "بحث"}
          </button>
        </form>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        {surahMatches.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-[var(--muted)]">السور</h2>
            <ul className="space-y-2">
              {surahMatches.map((s) => (
                <li key={s.num}
                  className="cursor-pointer rounded-lg border-2 border-[var(--foreground)] p-3 hover:bg-[var(--background)]"
                  role="button" tabIndex={0}
                  onClick={() => navigateTo(s.firstPage, s.firstAyahId)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigateTo(s.firstPage, s.firstAyahId); } }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{displaySurah(s.name)}</span>
                    <span className="text-xs text-[var(--muted)]">{s.ayahCount} آيات · صفحة {s.firstPage}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {total !== null && (
          <div className="text-center text-sm font-semibold text-[var(--muted)]">
            {total === 0 ? "لا توجد نتائج"
              : total > hits.length ? `${total} نتيجة (عرض ${hits.length})`
                : `${total} نتيجة`}
          </div>
        )}

        <ul className="space-y-2">
          {hits.map((h) => (
            <li key={h.id}
              className="cursor-pointer rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--background)]"
              role="button" tabIndex={0}
              onClick={() => h.page && h.id && navigateTo(h.page, h.id)}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && h.page && h.id) { e.preventDefault(); navigateTo(h.page, h.id); } }}>
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                <span>
                  {h.surahName ? `${displaySurah(h.surahName)} · ` : ""}
                  {h.surah}:{h.ayah}
                  {h.page ? ` · صفحة ${h.page}` : ""}
                </span>
                {typeof h.occurrences === "number" && h.occurrences > 0 ? (
                  <span className="shrink-0 rounded bg-[var(--foreground)] px-2 py-0.5 text-[var(--background)]">{h.occurrences}×</span>
                ) : null}
              </div>
              <p dir="rtl" className="mt-1">{h.text}</p>
            </li>
          ))}
        </ul>

      </div>
    </main>
  );
}
