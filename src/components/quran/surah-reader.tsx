"use client";

import { useEffect, useState } from "react";

import { getAyahsBySurah, type AyahDto } from "@/lib/api/quran";

interface SurahReaderProps {
  surahNumber: number;
}

export function SurahReader({ surahNumber }: SurahReaderProps) {
  const [ayahs, setAyahs] = useState<AyahDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAyahs() {
      try {
        const data = await getAyahsBySurah(surahNumber);

        if (!cancelled) {
          setAyahs(data);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger les ayahs.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAyahs();

    return () => {
      cancelled = true;
    };
  }, [surahNumber]);

  if (loading) {
    return (
      <div className="rounded-xl border p-8 text-center">
        <p className="text-sm text-gray-500">Chargement des ayahs…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 p-8 text-center">
        <h2 className="text-lg font-semibold">
          Impossible de charger les ayahs
        </h2>

        <p className="mt-2 text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (ayahs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">Aucun ayah disponible</h2>

        <p className="mt-2 text-sm text-gray-500">
          Les données des ayahs ne sont pas encore importées dans PostgreSQL.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ayahs.map((ayah) => (
        <article key={ayah.id} className="rounded-xl border p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full border text-sm">
              {ayah.number}
            </span>

            <span className="text-xs text-gray-500">
              Page {ayah.pageNumber} · Juz {ayah.juz}
            </span>
          </div>

          <p
            dir="rtl"
            lang="ar"
            className="text-right text-2xl leading-[2.2] font-medium"
          >
            {ayah.text}
          </p>
        </article>
      ))}
    </div>
  );
}
