// Suivi local de la récitation Tarteel.
//
// Une fois le curseur verrouillé (premier appariement global réussi), on aligne
// TOUTE la transcription sur les mots du Coran autour du curseur, avec
// tolérance aux erreurs : un mot faux (même le dernier, souvent incomplet) ne
// bloque plus rien, il n'y a pas d'ambiguïté globale, et un mot corrigé dans
// une transcription ultérieure est de nouveau apparié et donc coloré.
//
// Module pur : aucun accès au DOM ni aux modes. Il ne dépend que de la
// normalisation existante du suivi Tarteel (lecture seule).

import { extractTarteelArabicWords } from "./mushaf-tarteel-matching";

export type TarteelTrackerTarget = { key: string; text: string };

export type TarteelTrackerOptions = {
  backWords?: number;
  aheadWords?: number;
  maxGap?: number;
  nearWords?: number;
  maxHypothesisWords?: number;
};

export type TarteelTrackerMatch = {
  index: number; // position globale dans les targets
  key: string;
  hypothesisIndex: number;
};

export type TarteelTrackerResult = {
  matches: TarteelTrackerMatch[];
  endIndex: number | null;
  nextCursor: number;
};

const MATCH_SCORE = 3;
const MISMATCH_SCORE = -1;
const GAP_SCORE = -1;

const DEFAULT_BACK_WORDS = 45;
const DEFAULT_AHEAD_WORDS = 60;
const DEFAULT_MAX_GAP = 4;
const DEFAULT_NEAR_WORDS = 5;
const DEFAULT_MAX_HYPOTHESIS_WORDS = 40;
const BEHIND_TOLERANCE = 3;

type Pair = { i: number; j: number };

export function createTarteelTracker(
  targets: ReadonlyArray<TarteelTrackerTarget>,
) {
  const cache = new Map<number, readonly string[]>();

  // Un mot du Mushaf peut s'écrire de deux façons dans une transcription :
  // l'alef suscrit (U+0670) devient un alef (« الرحمان », « الكتاب »), ou il
  // disparaît (« الرحمن », « يخفى » : le ى final porte un alef suscrit dans le
  // Mushaf mais pas dans la transcription). Les deux formes sont acceptées.
  function formsAt(index: number): readonly string[] {
    const cached = cache.get(index);
    if (cached !== undefined) return cached;
    const target = targets[index];
    const forms: string[] = [];
    if (target) {
      const withAlef = extractTarteelArabicWords(target.text).join("");
      const withoutDagger = extractTarteelArabicWords(
        target.text.replace(/\u0670/g, ""),
      ).join("");
      if (withAlef) forms.push(withAlef);
      if (withoutDagger && withoutDagger !== withAlef) forms.push(withoutDagger);
    }
    cache.set(index, forms);
    return forms;
  }

  // cursor = index du prochain mot attendu. cursor <= 0 : non verrouillé.
  function track(
    cursor: number,
    hypothesisText: string,
    options: TarteelTrackerOptions = {},
  ): TarteelTrackerResult {
    const none: TarteelTrackerResult = {
      matches: [],
      endIndex: null,
      nextCursor: cursor,
    };
    if (!Number.isInteger(cursor) || cursor <= 0 || cursor > targets.length) {
      return none;
    }

    const back = options.backWords ?? DEFAULT_BACK_WORDS;
    const ahead = options.aheadWords ?? DEFAULT_AHEAD_WORDS;
    const maxGap = options.maxGap ?? DEFAULT_MAX_GAP;
    const nearWords = options.nearWords ?? DEFAULT_NEAR_WORDS;
    const maxHypothesis =
      options.maxHypothesisWords ?? DEFAULT_MAX_HYPOTHESIS_WORDS;

    const hypothesis = extractTarteelArabicWords(hypothesisText).slice(
      -maxHypothesis,
    );
    const lo = Math.max(0, cursor - back);
    const hi = Math.min(targets.length, cursor + ahead);
    const n = hi - lo;
    const m = hypothesis.length;
    if (m === 0 || n <= 0) return none;

    const zone: Array<readonly string[]> = [];
    for (let j = 0; j < n; j += 1) zone.push(formsAt(lo + j));

    // Alignement semi-global : la transcription est entièrement alignée, les
    // mots du Coran avant et après la zone sont gratuits, ceux sautés à
    // l'intérieur coûtent un point.
    const width = n + 1;
    const grid: number[] = new Array<number>((m + 1) * width).fill(0);
    const cell = (i: number, j: number): number => grid[i * width + j] as number;
    const isMatch = (i: number, j: number): boolean => {
      const word = hypothesis[i - 1];
      const forms = zone[j - 1];
      return word !== undefined && forms !== undefined && forms.includes(word);
    };

    for (let i = 1; i <= m; i += 1) grid[i * width] = i * GAP_SCORE;
    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        const diagonal =
          cell(i - 1, j - 1) + (isMatch(i, j) ? MATCH_SCORE : MISMATCH_SCORE);
        const skipHypothesis = cell(i - 1, j) + GAP_SCORE;
        const skipTarget = cell(i, j - 1) + GAP_SCORE;
        grid[i * width + j] = Math.max(diagonal, skipHypothesis, skipTarget);
      }
    }

    // Fin de l'alignement : meilleur score, à égalité le plus proche du curseur.
    const cursorOffset = cursor - lo;
    let endColumn = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let j = 0; j <= n; j += 1) {
      const value = cell(m, j);
      if (
        value > bestScore ||
        (value === bestScore &&
          Math.abs(j - cursorOffset) < Math.abs(endColumn - cursorOffset))
      ) {
        bestScore = value;
        endColumn = j;
      }
    }

    const pairs: Pair[] = [];
    let i = m;
    let j = endColumn;
    while (i > 0) {
      if (j === 0) {
        i -= 1;
        continue;
      }
      const here = cell(i, j);
      const matched = isMatch(i, j);
      const diagonal =
        cell(i - 1, j - 1) + (matched ? MATCH_SCORE : MISMATCH_SCORE);
      if (here === diagonal) {
        if (matched) pairs.push({ i: i - 1, j: lo + j - 1 });
        i -= 1;
        j -= 1;
        continue;
      }
      if (here === cell(i - 1, j) + GAP_SCORE) {
        i -= 1;
        continue;
      }
      j -= 1;
    }
    pairs.reverse();

    // Regroupement en blocs compacts.
    const clusters: Pair[][] = [];
    for (const pair of pairs) {
      const current = clusters[clusters.length - 1];
      const previous = current?.[current.length - 1];
      if (
        current &&
        previous &&
        pair.j - previous.j <= maxGap &&
        pair.i - previous.i <= maxGap
      ) {
        current.push(pair);
      } else {
        clusters.push([pair]);
      }
    }

    // Un bloc rattaché au curseur : 2 mots suffisent. Sinon : 3 mots.
    const matches: TarteelTrackerMatch[] = [];
    let endIndex = -1;
    for (const cluster of clusters) {
      const first = cluster[0];
      const last = cluster[cluster.length - 1];
      if (!first || !last) continue;
      const anchored =
        last.j >= cursor - BEHIND_TOLERANCE && first.j <= cursor + nearWords;
      if (cluster.length < (anchored ? 2 : 3)) continue;
      for (const pair of cluster) {
        const key = targets[pair.j]?.key;
        if (key === undefined) continue;
        matches.push({ index: pair.j, key, hypothesisIndex: pair.i });
        if (pair.j > endIndex) endIndex = pair.j;
      }
    }

    if (matches.length === 0) return none;
    return {
      matches,
      endIndex,
      nextCursor: Math.max(cursor, endIndex + 1),
    };
  }

  return { track };
}

export type TarteelTracker = ReturnType<typeof createTarteelTracker>;
