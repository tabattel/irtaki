import { loadAyahs, SURAH_NAMES } from "../search/_lib/corpus";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("p") ?? "0");
  if (!page || page < 1 || page > 604) {
    return Response.json({ error: "invalid page" }, { status: 400 });
  }
  try {
    const all = await loadAyahs();
    const first = all.find((a) => a.page === page);
    if (!first) return Response.json({ error: "page not found" }, { status: 404 });
    const surahName = SURAH_NAMES[first.surah - 1] ?? "";
    return Response.json({
      page,
      surah: first.surah,
      ayah: first.ayah,
      surahName,
      display: `${first.surah} - سورة ${surahName}`,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
