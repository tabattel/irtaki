"use client";

import { FormEvent, useState } from "react";

import type { SearchMode } from "@/lib/api/search";

type SearchBarProps = {
  initialQuery?: string;
  initialMode?: SearchMode;
  onSearch: (query: string, mode: SearchMode) => void;
  loading?: boolean;
};

export function SearchBar({
  initialQuery = "",
  initialMode = "partial",
  onSearch,
  loading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>(initialMode);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    onSearch(normalizedQuery, mode);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row"
      role="search"
    >
      <label htmlFor="quran-search" className="sr-only">
        البحث في القرآن
      </label>

      <input
        id="quran-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث في القرآن..."
        dir="rtl"
        className="min-h-12 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 outline-none focus:ring-2 focus:ring-[var(--foreground)]"
      />

      <label htmlFor="search-mode" className="sr-only">
        نوع البحث
      </label>

      <select
        id="search-mode"
        value={mode}
        onChange={(event) => setMode(event.target.value as SearchMode)}
        className="min-h-12 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4"
      >
        <option value="partial">بحث جزئي</option>
        <option value="exact">بحث مطابق</option>
      </select>

      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="min-h-12 rounded-lg bg-[var(--foreground)] px-6 font-semibold text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "جارٍ البحث..." : "بحث"}
      </button>
    </form>
  );
}
