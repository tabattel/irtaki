// Mesure de correspondance d'une récitation avec le texte d'une Ayah.
// Module pur : aucun import, aucune dépendance aux modes (Tarteel, Tilawa…).
// Le profil de normalisation est COPIÉ (et non importé) depuis le suivi Tarteel :
// il est figé et versionné, pour que chaque résultat reste recalculable à
// l'identique même si le suivi évolue.
// Correspondance exacte = mots normalisés identiques. Ce n'est PAS une mesure
// du Tajwid ni de la vocalisation.

export const NORMALIZATION_VERSION = "recitation-match-v1";
export const WER_ALGORITHM_VERSION = "word-edit-distance-ts-v1";

// Seuils provisoires, à calibrer : A < 5 %, B de 5 à 20 %, C > 20 %.
export const GRADE_A_MAX_PERCENT = 5;
export const GRADE_B_MAX_PERCENT = 20;

export type RecitationGrade = "A" | "B" | "C";

export type WerResult = {
  substitutions: number;
  deletions: number;
  insertions: number;
  referenceWordCount: number;
  hypothesisWordCount: number;
  editDistance: number;
  wer: number;
  werPercent: number;
};

export type RecitationComparison = WerResult & {
  exactMatch: boolean;
  grade: RecitationGrade;
  normalizationVersion: string;
  werAlgorithmVersion: string;
};

export function normalizeRecitationText(text: string): string {
  return text
    .normalize("NFC")
    // L'alef suscrit (U+0670) devient un alef avant la suppression des signes.
    .replace(/\u0670/g, "\u0627")
    // Signes diacritiques et signes de pause coraniques.
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "")
    // Tatweel.
    .replace(/\u0640/g, "")
    // Variantes de lettres : l'orthographe d'une transcription ASR n'est pas fiable.
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A")
    .replace(/\s+/g, " ")
    .trim();
}

export function recitationWords(text: string): string[] {
  const normalized = normalizeRecitationText(text);
  if (!normalized) return [];
  return normalized
    .split(" ")
    .map((word) => word.replace(/[^\u0621-\u064A]/g, ""))
    .filter((word) => word.length > 0);
}

export function calculateWer(
  reference: readonly string[],
  hypothesis: readonly string[],
): WerResult {
  const n = reference.length;
  const m = hypothesis.length;
  if (n === 0) throw new Error("reference must contain at least one word");

  const width = m + 1;
  const dist: number[] = new Array<number>((n + 1) * width).fill(0);
  const at = (i: number, j: number): number => dist[i * width + j] as number;
  const set = (i: number, j: number, value: number): void => {
    dist[i * width + j] = value;
  };

  for (let i = 0; i <= n; i += 1) set(i, 0, i);
  for (let j = 0; j <= m; j += 1) set(0, j, j);
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
      set(
        i,
        j,
        Math.min(at(i - 1, j - 1) + cost, at(i - 1, j) + 1, at(i, j - 1) + 1),
      );
    }
  }

  let i = n;
  let j = m;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const cost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
      if (at(i, j) === at(i - 1, j - 1) + cost) {
        if (cost === 1) substitutions += 1;
        i -= 1;
        j -= 1;
        continue;
      }
    }
    if (i > 0 && at(i, j) === at(i - 1, j) + 1) {
      deletions += 1;
      i -= 1;
      continue;
    }
    insertions += 1;
    j -= 1;
  }

  const editDistance = substitutions + deletions + insertions;
  return {
    substitutions,
    deletions,
    insertions,
    referenceWordCount: n,
    hypothesisWordCount: m,
    editDistance,
    wer: editDistance / n,
    werPercent: (editDistance * 100) / n,
  };
}

export function gradeFromWerPercent(werPercent: number): RecitationGrade {
  if (!Number.isFinite(werPercent) || werPercent < 0) {
    throw new Error("WER percent must be a non-negative number");
  }
  if (werPercent < GRADE_A_MAX_PERCENT) return "A";
  if (werPercent <= GRADE_B_MAX_PERCENT) return "B";
  return "C";
}

export function compareRecitation(
  referenceText: string,
  hypothesisText: string,
): RecitationComparison {
  const result = calculateWer(
    recitationWords(referenceText),
    recitationWords(hypothesisText),
  );
  return {
    ...result,
    exactMatch: result.editDistance === 0,
    grade: gradeFromWerPercent(result.werPercent),
    normalizationVersion: NORMALIZATION_VERSION,
    werAlgorithmVersion: WER_ALGORITHM_VERSION,
  };
}
