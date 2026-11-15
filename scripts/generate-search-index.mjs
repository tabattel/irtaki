import fs from "node:fs/promises";
import path from "node:path";

const LAYOUT = "storage/mushaf/layout/kfgqpc-v2-1421h";

const SURAH_NAMES = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
  "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
  "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
  "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
  "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
  "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
  "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس"
];

const AYAHS_PER_SURAH = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,
  59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,
  52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,
  21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
];

function globalAyahId(surah, ayah) {
  if (surah < 1 || surah > 114) return 0;
  let id = 0;
  for (let i = 0; i < surah - 1; i++) id += AYAHS_PER_SURAH[i];
  return id + ayah;
}
const stripDiacritics = (s) => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
const normalizeExact = (s) =>
  s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
   .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
   .replace(/\u0640/g, "").replace(/\s+/g, " ").trim();
const normalizePartial = (s) =>
  s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
   .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
   .replace(/\u0640/g, "").replace(/\u0629/g, "\u062A")
   .replace(/\u0627/g, "").replace(/\s+/g, " ").trim();

const files = (await fs.readdir(LAYOUT)).filter((f) => /^page-\d+\.json$/.test(f));
const wordMap = new Map();
const firstBySurah = new Map();

for (const f of files) {
  const data = JSON.parse(await fs.readFile(path.join(LAYOUT, f), "utf8"));
  const page = Number(data.page ?? f.match(/\d+/)?.[0] ?? 0);
  for (const line of data.lines ?? []) {
    for (const w of line.words ?? []) {
      if (!w.text || typeof w.text !== "string") continue;
      if (/^[\u0660-\u0669]+$/.test(w.text.trim())) continue;
      const surah = Number(w.surah), ayah = Number(w.ayah);
      if (!surah || !ayah) continue;
      if (ayah === 1 && !firstBySurah.has(surah))
        firstBySurah.set(surah, { firstPage: page, firstAyahId: globalAyahId(surah, 1) });
      const norm = normalizePartial(w.text);
      if (!norm) continue;
      const ex = wordMap.get(norm);
      if (ex) ex.count++;
      else wordMap.set(norm, { word: stripDiacritics(w.text), norm, count: 1 });
    }
  }
}

const words = Array.from(wordMap.values()).sort((a, b) => b.count - a.count);
const surahs = SURAH_NAMES.map((name, i) => {
  const meta = firstBySurah.get(i + 1) ?? { firstPage: 1, firstAyahId: globalAyahId(i + 1, 1) };
  return {
    num: i + 1, name,
    normExact: normalizeExact(name),
    normPartial: normalizePartial(name),
    firstPage: meta.firstPage,
    firstAyahId: meta.firstAyahId,
    ayahCount: AYAHS_PER_SURAH[i],
  };
});

await fs.writeFile("public/quran-search-index.json", JSON.stringify({ words, surahs }), "utf8");
console.log(`✓ public/quran-search-index.json : ${words.length} mots, ${surahs.length} سور`);
