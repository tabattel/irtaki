"use client";

import { useState } from "react";

import { SearchBar } from "@/components/search/search-bar";
import { SearchResults } from "@/components/search/search-results";
import {
  searchQuran,
  type SearchMode,
  type SearchResult,
} from "@/lib/api/search";

export default function SearchPage() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(query: string, mode: SearchMode) {
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await searchQuran(query, mode);

      setResults(response.results);
      setTotal(response.total);
    } catch {
      setResults([]);
      setTotal(0);
      setError("تعذر تنفيذ البحث. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">البحث في القرآن</h1>

        <p className="text-[var(--muted)]">
          ابحث عن كلمة أو عبارة في آيات القرآن الكريم.
        </p>
      </header>

      <SearchBar onSearch={handleSearch} loading={loading} />

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"
        >
          {error}
        </p>
      )}

      {searched && !loading && !error && (
        <SearchResults results={results} total={total} />
      )}
    </div>
  );
}
