"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SURAH_OPTIONS, surahAyahCount } from "@/lib/quran/surahs";

type AyahOption = { number: number; preview: string };

function normalizeAr(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0640/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSurahInput(input: string): number | null {
  const trimmed = input.trim();
  const numMatch = trimmed.match(/^(\d+)\s*(?:-|–|:)\s*/u);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (Number.isInteger(n) && n >= 1 && n <= 114) return n;
  }
  const num = Number(trimmed);
  if (Number.isInteger(num) && num >= 1 && num <= 114) return num;
  const normalized = normalizeAr(trimmed).replace(/^سورة\s+/u, "").trim();
  for (let i = 0; i < SURAH_OPTIONS.length; i++) {
    const name = normalizeAr(
      SURAH_OPTIONS[i].replace(/^\d+\s*-\s*سورة\s+/u, ""),
    );
    if (name === normalized) return i + 1;
  }
  return null;
}

function parseAyahInput(input: string): number | null {
  const m = input.trim().match(/^(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export function GotoPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const riwayaMatch = pathname?.match(/^\/coran\/([^/]+)/);
  const riwayaId = riwayaMatch?.[1] ?? "";
  const currentPage = Number(pathname?.match(/\/page\/(\d+)/)?.[1] ?? 1);

  const [startPage, setStartPage] = useState<number>(currentPage);
  const [startSurah, setStartSurah] = useState("");
  const [startAyah, setStartAyah] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [ayahOptions, setAyahOptions] = useState<AyahOption[]>([]);

  const [surahOpen, setSurahOpen] = useState(false);
  const [ayahOpen, setAyahOpen] = useState(false);

  const surahInputRef = useRef<HTMLInputElement | null>(null);
  const ayahInputRef = useRef<HTMLInputElement | null>(null);

  const surahNumber = useMemo(() => parseSurahInput(startSurah), [startSurah]);
  const ayahMax = surahNumber ? surahAyahCount(surahNumber) : null;

  // ── Sync page → surah + ayah ──
  const pageTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!startPage || startPage < 1 || startPage > 604) return;
    if (pageTimerRef.current !== null) window.clearTimeout(pageTimerRef.current);
    pageTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/quran/page?p=${startPage}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.surah && data.ayah) {
          setStartSurah(data.display ?? String(data.surah));
          setStartAyah(String(data.ayah));
        }
      } catch {
        /* silent */
      }
    }, 300);
    return () => {
      if (pageTimerRef.current !== null) window.clearTimeout(pageTimerRef.current);
    };
  }, [startPage]);

  // ── Fetch ayahs de la sourate courante ──
  useEffect(() => {
    if (!surahNumber) {
      setAyahOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quran/surah?n=${surahNumber}`);
        if (!res.ok) {
          if (!cancelled) setAyahOptions([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) setAyahOptions(Array.isArray(data.ayahs) ? data.ayahs : []);
      } catch {
        if (!cancelled) setAyahOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [surahNumber]);

  // ── Preview ──
  useEffect(() => {
    if (!startSurah.trim() || !startAyah.trim()) {
      setPreview("");
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/quran/ayah?suray=${encodeURIComponent(startSurah)}&ayah=${encodeURIComponent(startAyah)}`,
        );
        if (!res.ok) {
          setPreview("");
          return;
        }
        const data = await res.json();
        setPreview(typeof data.preview === "string" ? data.preview : "");
      } catch {
        setPreview("");
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [startSurah, startAyah]);

  // ── Filtrage des options ──
  const surahFiltered = useMemo(() => {
    const q = normalizeAr(startSurah);
    if (!q) return SURAH_OPTIONS.slice(0, 30);
    const isNumeric = /^\d+/.test(startSurah.trim());
    if (isNumeric) {
      const n = startSurah.trim().match(/^(\d+)/)?.[1] ?? "";
      return SURAH_OPTIONS.filter((s) => s.startsWith(n + " ")).slice(0, 30);
    }
    return SURAH_OPTIONS.filter((s) => normalizeAr(s).includes(q)).slice(0, 30);
  }, [startSurah]);

  const ayahFiltered = useMemo(() => {
    const list =
      ayahOptions.length > 0
        ? ayahOptions.map((a) => ({
            value: String(a.number),
            label: `${a.number} - ${a.preview}`,
          }))
        : ayahMax
          ? Array.from({ length: ayahMax }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))
          : [];
    const q = startAyah.trim();
    if (!q) return list.slice(0, 50);
    if (/^\d+$/.test(q)) {
      const n = q;
      return list.filter((o) => o.value.startsWith(n)).slice(0, 50);
    }
    return list;
  }, [ayahOptions, ayahMax, startAyah]);

  function applyPages() {
    router.push(`/coran/${riwayaId}/page/${startPage}`);
  }

  async function applyAyahs() {
    if (!startSurah.trim() || !startAyah.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/quran/ayah?suray=${encodeURIComponent(startSurah)}&ayah=${encodeURIComponent(startAyah)}`,
      );
      const data = await res.json();
      if (data.page && data.id) {
        router.push(`/coran/${riwayaId}/page/${data.page}?ayah=${data.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs">
        الصفحة
        <input
          type="number"
          min={1}
          max={604}
          value={startPage}
          onChange={(e) => setStartPage(Number(e.target.value))}
          className="w-full min-w-0 rounded-lg border bg-transparent px-2 py-2 text-sm"
        />
      </label>

      {/* ───── السورة : combobox ───── */}
      <div className="flex flex-col gap-1 text-xs">
        <span>السورة</span>
        <div className="relative flex">
          <input
            ref={surahInputRef}
            type="text"
            placeholder="اسم أو رقم"
            value={startSurah}
            onChange={(e) => {
              setStartSurah(e.target.value);
              setStartAyah("");
              setSurahOpen(true);
            }}
            onFocus={() => setSurahOpen(true)}
            onBlur={() =>
              window.setTimeout(() => setSurahOpen(false), 150)
            }
            autoComplete="off"
            spellCheck={false}
            className="w-full min-w-0 rounded-lg border bg-transparent px-2 py-2 pl-10 pr-10 text-sm"
          />
          <button
            type="button"
            aria-label="فتح قائمة السور"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setSurahOpen((o) => !o);
              surahInputRef.current?.focus();
            }}
            className="absolute inset-y-0 left-0 flex w-9 items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ▼
          </button>

          {startSurah.length > 0 && (
            <button
              type="button"
              aria-label="مسح السورة"
              title="مسح"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setStartSurah("");
                setStartAyah("");
                setPreview("");
                setSurahOpen(false);
                surahInputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-lg leading-none text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              ×
            </button>
          )}
          {surahOpen && surahFiltered.length > 0 && (
            <ul
              dir="rtl"
              className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg"
            >
              {surahFiltered.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setStartSurah(s);
                      setStartAyah("");
                      setSurahOpen(false);
                    }}
                    className="w-full px-3 py-2 text-right text-sm hover:bg-[var(--surface)]"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ───── الآية : combobox ───── */}
      <div className="flex flex-col gap-1 text-xs">
        <span>الآية</span>
        <div className="relative flex">
          <input
            ref={ayahInputRef}
            type="text"
            inputMode="numeric"
            placeholder={
              !surahNumber
                ? "اختر السورة أولاً"
                : ayahMax
                  ? `1 - ${ayahMax}`
                  : "numéro"
            }
            value={startAyah}
            disabled={!surahNumber}
            onChange={(e) => {
              setStartAyah(e.target.value);
              setAyahOpen(true);
            }}
            onFocus={() => setAyahOpen(true)}
            onBlur={() =>
              window.setTimeout(() => setAyahOpen(false), 150)
            }
            autoComplete="off"
            spellCheck={false}
            className="w-full min-w-0 rounded-lg border bg-transparent px-2 py-2 pr-10 text-sm disabled:opacity-50"
          />
          <button
            type="button"
            aria-label="فتح قائمة الآيات"
            disabled={!surahNumber}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setAyahOpen((o) => !o);
              ayahInputRef.current?.focus();
            }}
            className="absolute inset-y-0 left-0 flex w-9 items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            ▼
          </button>
          {ayahOpen && ayahFiltered.length > 0 && (
            <ul
              dir="rtl"
              className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg"
            >
              {ayahFiltered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setStartAyah(o.value);
                      setAyahOpen(false);
                    }}
                    className="w-full px-3 py-2 text-right text-sm hover:bg-[var(--surface)]"
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {ayahMax !== null && (
          <span className="text-[10px] text-[var(--muted)]">
            عدد الآيات في هذه السورة: {ayahMax}
          </span>
        )}
      </div>

      {preview.length > 0 && (
        <div
          dir="rtl"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm leading-relaxed text-[var(--foreground)]"
        >
          <div className="mb-1 text-xs font-semibold text-[var(--muted)]">
            بداية الآية
          </div>
          <p>{preview}…</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={applyPages}
          className="rounded-lg border px-3 py-2 text-sm font-semibold"
        >
          تطبيق نطاق الصفحات
        </button>
        <button
          type="button"
          onClick={applyAyahs}
          disabled={loading || !startSurah.trim() || !startAyah.trim()}
          className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "…" : "تطبيق نطاق الآيات"}
        </button>
      </div>
    </div>
  );
}
