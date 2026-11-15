import fs from "node:fs/promises";
import path from "node:path";

const LAYOUT_DIR = path.join(
  process.cwd(),
  "storage/mushaf/layout/kfgqpc-v2-1421h",
);

const AYAHS_PER_SURAH: readonly number[] = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
  111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
  54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60,
  49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19,
  26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3,
  6, 3, 5, 4, 5, 6,
];

export function globalAyahId(surah: number, ayah: number): number {
  if (surah < 1 || surah > 114) return 0;
  let id = 0;
  for (let i = 0; i < surah - 1; i++) id += AYAHS_PER_SURAH[i];
  return id + ayah;
}

export const SURAH_NAMES: readonly string[] = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة",
  "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
  "هود", "يوسف", "الرعد", "إبراهيم", "الحجر",
  "النحل", "الإسراء", "الكهف", "مريم", "طه",
  "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان",
  "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
  "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر",
  "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية",
  "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
  "الذاريات", "الطور", "النجم", "القمر", "الرحمن",
  "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
  "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق",
  "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
  "نوح", "الجن", "المزمل", "المدثر", "القيامة",
  "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
  "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج",
  "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
  "الشمس", "الليل", "الضحى", "الشرح", "التين",
  "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
  "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل",
  "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
  "المسد", "الإخلاص", "الفلق", "الناس",
];

export function surahName(n: number): string {
  return SURAH_NAMES[n - 1] ?? "";
}

export type AyahEntry = {
  id: number;
  surah: number;
  ayah: number;
  text: string;
  words: string[];
  page: number;
};

type Word = { surah: number | string; ayah: number | string; text: string };
type Line = { words?: Word[] };
type PageFile = { page?: number; lines?: Line[] };

let ayahCache: AyahEntry[] | null = null;

function isArabicDigitOnly(s: string): boolean {
  return /^[\u0660-\u0669]+$/.test(s.trim());
}

export async function loadAyahs(): Promise<AyahEntry[]> {
  if (ayahCache) return ayahCache;
  const files = (await fs.readdir(LAYOUT_DIR)).filter((f) =>
    /^page-\d+\.json$/.test(f),
  );
  const map = new Map<string, AyahEntry>();
  for (const f of files) {
    const raw = await fs.readFile(path.join(LAYOUT_DIR, f), "utf8");
    const data = JSON.parse(raw) as PageFile;
    const page = Number(data.page ?? f.match(/\d+/)?.[0] ?? 0);
    for (const line of data.lines ?? []) {
      for (const w of line.words ?? []) {
        if (w.surah === "" || w.ayah === "") continue;
        if (typeof w.text !== "string" || !w.text) continue;
        if (isArabicDigitOnly(w.text)) continue;
        const surah = Number(w.surah);
        const ayah = Number(w.ayah);
        if (!surah || !ayah) continue;
        const key = `${surah}:${ayah}`;
        const prev = map.get(key);
        if (prev) {
          prev.text += " " + w.text;
          prev.words.push(w.text);
        } else {
          map.set(key, {
            id: globalAyahId(surah, ayah),
            surah,
            ayah,
            text: w.text,
            words: [w.text],
            page,
          });
        }
      }
    }
  }
  ayahCache = Array.from(map.values()).sort(
    (a, b) => a.surah - b.surah || a.ayah - b.ayah,
  );
  return ayahCache;
}

export function normalize(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0640/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePartial(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0640/g, "")
    .replace(/\u0629/g, "\u062A")
    .replace(/\u0627/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripDiacritics(s: string): string {
  return s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
}

export function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

export type WordIndexEntry = { word: string; norm: string; count: number };

let wordIndexCache: WordIndexEntry[] | null = null;

export async function loadWordIndex(): Promise<WordIndexEntry[]> {
  if (wordIndexCache) return wordIndexCache;
  const all = await loadAyahs();
  const map = new Map<string, WordIndexEntry>();
  for (const a of all) {
    for (const w of a.words) {
      const norm = normalizePartial(w);
      if (!norm) continue;
      const existing = map.get(norm);
      if (existing) existing.count++;
      else map.set(norm, { word: stripDiacritics(w), norm, count: 1 });
    }
  }
  wordIndexCache = Array.from(map.values());
  return wordIndexCache;
}
