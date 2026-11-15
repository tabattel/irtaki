import { loadAyahs, SURAH_NAMES } from "../search/_lib/corpus";

function previewFromText(text: string, wordCount = 5): string {
  return text.split(/\s+/).filter(Boolean).slice(0, wordCount).join(" ");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const n = Number(url.searchParams.get("n") ?? "0");
  if (!n || n < 1 || n > 114) {
    return Response.json({ error: "invalid surah" }, { status: 400 });
  }
  try {
    const all = await loadAyahs();
    const surahAyahs = all
      .filter((a) => a.surah === n)
      .sort((a, b) => a.ayah - b.ayah);
    return Response.json({
      surah: n,
      name: SURAH_NAMES[n - 1] ?? "",
      ayahCount: surahAyahs.length,
      ayahs: surahAyahs.map((a) => ({
        number: a.ayah,
        preview: previewFromText(a.text, 5),
      })),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
