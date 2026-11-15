import { loadAyahs, loadWordIndex } from "../_lib/corpus";

export async function GET() {
  try {
    const ayahs = await loadAyahs();
    const words = await loadWordIndex();
    return Response.json({
      ayahCount: ayahs.length,
      wordCount: words.length,
      totalOccurrences: words.reduce((s, w) => s + w.count, 0),
      sample: words.slice(0, 5),
    });
  } catch (err) {
    return Response.json(
      { error: String(err), stack: (err as Error)?.stack },
      { status: 500 },
    );
  }
}
