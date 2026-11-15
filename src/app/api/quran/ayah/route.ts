import {
  SURAH_NAMES,
  loadAyahs,
  globalAyahId,
} from "../search/_lib/corpus";

function previewFromText(text: string, wordCount = 10): string {
  return text.split(/\s+/).filter(Boolean).slice(0, wordCount).join(" ");
}

function resolveSurah(input: string): number | null {
  const trimmed = input.trim();
  const numMatch = trimmed.match(/^(\d+)\s*(?:-|\u2013|:)\s*/u);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (Number.isInteger(n) && n >= 1 && n <= 114) return n;
  }
  const num = Number(trimmed);
  if (Number.isInteger(num) && num >= 1 && num <= 114) return num;
  const normalized = trimmed.replace(/^سورة\s+/u, "").trim();
  const idx = SURAH_NAMES.findIndex((n) => n === normalized);
  return idx >= 0 ? idx + 1 : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const surayInput = url.searchParams.get("suray") ?? "";
  const ayah = Number(url.searchParams.get("ayah") ?? "0");
  if (!ayah || ayah < 1) {
    return Response.json({ error: "invalid ayah" }, { status: 400 });
  }
  const suray = resolveSurah(surayInput);
  if (!suray) {
    return Response.json({ error: "invalid surah" }, { status: 400 });
  }
  try {
    const all = await loadAyahs();
    const found = all.find((a) => a.surah === suray && a.ayah === ayah);
    if (!found) {
      return Response.json({
        id: globalAyahId(suray, ayah),
        page: null,
        surah: suray,
        ayah,
      });
    }
    const preview = previewFromText(found.text ?? "", 10);
    return Response.json({
      id: found.id,
      page: found.page,
      surah: found.surah,
      ayah: found.ayah,
      preview,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
