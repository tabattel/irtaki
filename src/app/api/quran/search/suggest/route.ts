import { loadWordIndex, normalizePartial } from "../_lib/corpus";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // decodeURIComponent au cas où le client n'aurait pas encodé
    const raw = url.searchParams.get("q") ?? "";
    const q = raw.trim();
    if (q.length < 2) return Response.json({ words: [] });
    const needle = normalizePartial(q);
    if (!needle) return Response.json({ words: [] });
    const idx = await loadWordIndex();
    const words = idx
      .filter((e) => e.norm.includes(needle))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((e) => e.word);
    return Response.json({ words });
  } catch (err) {
    console.error("[suggest]", err);
    return Response.json({ words: [] }); // 200, jamais d'erreur visible côté UI
  }
}
