import {
  loadAyahs,
  normalize,
  normalizePartial,
  countOccurrences,
  surahName,
  type AyahEntry,
} from "./_lib/corpus";

type ResultHit = AyahEntry & { occurrences: number; surahName: string };

function cleanSurahName(name: string): string {
  return name.replace(/^سورة\s+/u, "").trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const mode = url.searchParams.get("mode") ?? "partial";
  if (!q) return Response.json({ results: [], total: 0 });

  try {
    const all = await loadAyahs();
    const results: ResultHit[] = [];
    let total = 0;

    if (mode === "exact") {
      const needle = normalize(q);
      if (!needle) return Response.json({ results: [], total: 0 });

      for (const a of all) {
        let n = 0;
        for (const w of a.words) if (normalize(w) === needle) n++;
        if (n > 0) {
          total++;
          if (results.length < 200) {
            results.push({
              ...a,
              occurrences: n,
              surahName: cleanSurahName(surahName(a.surah)),
            });
          }
        }
      }
    } else {
      const needle = normalizePartial(q);
      if (!needle) return Response.json({ results: [], total: 0 });

      for (const a of all) {
        const n = countOccurrences(normalizePartial(a.text), needle);
        if (n > 0) {
          total++;
          if (results.length < 200) {
            results.push({
              ...a,
              occurrences: n,
              surahName: cleanSurahName(surahName(a.surah)),
            });
          }
        }
      }
    }

    return Response.json({ results, total });
  } catch (err) {
    return Response.json(
      { results: [], total: 0, error: String(err) },
      { status: 500 },
    );
  }
}
