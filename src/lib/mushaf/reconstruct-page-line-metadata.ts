import {
  getMushafPageLayout,
  type MushafPageLayout,
} from "@/lib/api/mushaf";

type HistoricalTrace = {
  status: string;
  pageNumber: number;
  surahNumber: number;
  ayahNumber: number;
  lineNumbers?: readonly number[];
  pageLineCount?: number | null;
};

const layoutCache = new Map<number, Promise<MushafPageLayout>>();

function loadPageLayout(pageNumber: number): Promise<MushafPageLayout> {
  const cached = layoutCache.get(pageNumber);
  if (cached) return cached;

  // L'API de layout utilisée actuellement par IRTAKI prend le Mushaf Hafs 2.
  const pending = getMushafPageLayout(2, pageNumber).catch((error: unknown) => {
    layoutCache.delete(pageNumber);
    throw error;
  });

  layoutCache.set(pageNumber, pending);
  return pending;
}

function hasUsableLineMetadata(record: HistoricalTrace): boolean {
  return (
    Number.isInteger(record.pageLineCount) &&
    (record.pageLineCount ?? 0) > 0 &&
    Array.isArray(record.lineNumbers) &&
    record.lineNumbers.some(
      (line) =>
        Number.isInteger(line) &&
        line > 0 &&
        line <= (record.pageLineCount ?? 0),
    )
  );
}

/**
 * Complète les anciennes traces à partir du layout coranique réel.
 *
 * Les lignes déjà enregistrées sont conservées. Si elles manquent, les
 * ayahs identifiées par sourate et numéro sont recherchées dans les lignes
 * du layout correspondant à la page historique.
 *
 * Une erreur de chargement ne bloque jamais l'affichage de l'historique.
 */
export async function reconstructMissingPageLineMetadata<
  T extends HistoricalTrace,
>(records: readonly T[]): Promise<T[]> {
  if (records.length === 0) return [];

  const pages = [
    ...new Set(
      records
        .filter((record) => !hasUsableLineMetadata(record))
        .map((record) => record.pageNumber)
        .filter(
          (page) =>
            Number.isInteger(page) &&
            page >= 1 &&
            page <= 604,
        ),
    ),
  ];

  const layouts = new Map<number, MushafPageLayout | null>();
  let cursor = 0;

  // Limite la concurrence pour ne pas lancer des centaines de requêtes
  // simultanées si l'historique contient beaucoup de pages anciennes.
  const workerCount = Math.min(6, pages.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < pages.length) {
        const page = pages[cursor++];

        try {
          const layout = await loadPageLayout(page);
          layouts.set(
            page,
            layout.page === page ? layout : null,
          );
        } catch {
          layouts.set(page, null);
        }
      }
    }),
  );

  return records.map((record) => {
    if (hasUsableLineMetadata(record)) return record;

    const layout = layouts.get(record.pageNumber);
    if (
      !layout ||
      !Number.isInteger(record.surahNumber) ||
      !Number.isInteger(record.ayahNumber)
    ) {
      return record;
    }

    // Même convention que le calcul du Mushaf : seules les lignes coraniques
    // de type "ayah" sont incluses dans le dénominateur.
    const ayahLines = layout.lines.filter((line) => line.type === "ayah");
    const pageLineCount = ayahLines.length;

    if (pageLineCount < 1 || pageLineCount > 100) return record;

    const lineNumbers: number[] = [];

    ayahLines.forEach((line, index) => {
      const containsAyah = line.words.some(
        (word) =>
          word.surah === record.surahNumber &&
          word.ayah === record.ayahNumber,
      );

      if (containsAyah) lineNumbers.push(index + 1);
    });

    if (lineNumbers.length === 0) return record;

    return {
      ...record,
      lineNumbers,
      pageLineCount,
    };
  });
}
