"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getSurahs, type SurahDto } from "@/lib/api/quran";

export function SurahList() {
  const [surahs, setSurahs] = useState<SurahDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSurahs() {
      try {
        const data = await getSurahs();

        if (!cancelled) {
          setSurahs(data);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger les sourates.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSurahs();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border p-8 text-center">
        <p className="text-sm text-gray-500">Chargement des sourates…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 p-8 text-center">
        <h2 className="text-lg font-semibold">
          Impossible de charger les sourates
        </h2>

        <p className="mt-2 text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (surahs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">Aucune sourate disponible</h2>

        <p className="mt-2 text-sm text-gray-500">
          Les données du Coran ne sont pas encore importées dans PostgreSQL.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {surahs.map((surah) => (
        <Link
          key={surah.id}
          href={`/coran/${surah.number}`}
          className="rounded-xl border p-4 transition hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="flex size-9 items-center justify-center rounded-full border text-sm">
              {surah.number}
            </span>

            <div className="text-right">
              <div className="font-semibold">{surah.name}</div>

              {surah.translatedName && (
                <div className="text-sm text-gray-500">
                  {surah.translatedName}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 text-left text-xs text-gray-500">
            {surah.numberOfAyahs} ayahs · pages {surah.firstPage}–
            {surah.lastPage}
          </div>
        </Link>
      ))}
    </div>
  );
}
