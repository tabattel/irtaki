/**
 * Préparation du texte arabe pour le rapprochement Tarteel.
 *
 * Ce module est indépendant de Tartil, Ratil et Tilawa.
 * Il ne réalise aucune recherche en base de données
 * et ne déclenche aucune navigation dans le Mushaf.
 */

/**
 * Normalise un texte arabe pour faciliter les comparaisons.
 */
export function normalizeTarteelArabic(text: string): string {
  return text
    .normalize("NFC")
    // Suppression des signes diacritiques arabes.
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    // Suppression du tatweel.
    .replace(/\u0640/g, "")
    // Normalisation de certaines variantes de lettres.
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    // Espaces uniformisés.
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrait les mots arabes d'une transcription.
 */
export function extractTarteelArabicWords(text: string): string[] {
  const normalized = normalizeTarteelArabic(text);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .map((word) => word.replace(/[^\u0621-\u064A]/g, ""))
    .filter((word) => word.length > 0);
}

/**
 * Mot du Mushaf utilisable par le moteur de suivi.
 * La clé conserve l'identifiant réel du mot : sourate:ayah:mot.
 */
export interface TarteelTargetWord {
  key: string;
  text: string;
}

/**
 * Correspondance exacte entre un mot reconnu et le Mushaf.
 */
export interface TarteelWordMatch {
  key: string;
  targetIndex: number;
  recognizedIndex: number;
}

/**
 * Recherche une séquence de mots reconnus dans les mots du Mushaf.
 *
 * La fonction :
 * - compare les mots après normalisation arabe ;
 * - respecte leur ordre ;
 * - ne valide que les correspondances exactes ;
 * - ne modifie jamais les données reçues ;
 * - ne déclenche aucune navigation ni aucun effet visuel.
 *
 * Elle renvoie les correspondances trouvées dans l'ordre.
 */
export function findTarteelWordMatches(
  targets: TarteelTargetWord[],
  recognizedText: string,
  startIndex = 0,
): TarteelWordMatch[] {
  const recognizedWords = extractTarteelArabicWords(recognizedText);

  if (
    targets.length === 0 ||
    recognizedWords.length === 0 ||
    !Number.isInteger(startIndex) ||
    startIndex < 0 ||
    startIndex >= targets.length
  ) {
    return [];
  }

  const normalizedTargets = targets.map((target) =>
    normalizeTarteelArabic(target.text),
  );

  const matches: TarteelWordMatch[] = [];
  let cursor = startIndex;

  for (let recognizedIndex = 0;
    recognizedIndex < recognizedWords.length;
    recognizedIndex += 1
  ) {
    const recognized = recognizedWords[recognizedIndex];

    let foundIndex = -1;

    for (let targetIndex = cursor;
      targetIndex < normalizedTargets.length;
      targetIndex += 1
    ) {
      if (normalizedTargets[targetIndex] === recognized) {
        foundIndex = targetIndex;
        break;
      }
    }

    if (foundIndex === -1) {
      continue;
    }

    matches.push({
      key: targets[foundIndex].key,
      targetIndex: foundIndex,
      recognizedIndex,
    });

    cursor = foundIndex + 1;

    if (cursor >= targets.length) {
      break;
    }
  }

  return matches;
}

/**
 * Extrait les nouveaux mots entre deux transcriptions successives.
 *
 * Reconnaît les transcriptions cumulatives et les fenêtres glissantes
 * lorsque leur chevauchement est identifiable sans ambiguïté.
 *
 * En l'absence de chevauchement fiable, retourne un tableau vide.
 */
export function getTarteelNewWords(
  previousText: string,
  currentText: string,
): string[] {
  const previous = extractTarteelArabicWords(previousText);
  const current = extractTarteelArabicWords(currentText);

  if (current.length === 0) return [];
  if (previous.length === 0) return current;

  // La nouvelle transcription reprend intégralement l'ancienne.
  const isCumulative =
    current.length >= previous.length &&
    previous.every((word, index) => word === current[index]);

  if (isCumulative) {
    return current.slice(previous.length);
  }

  // Chercher le plus grand chevauchement :
  // fin de l'ancienne transcription = début de la nouvelle.
  const maxOverlap = Math.min(previous.length, current.length);

  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    const previousSuffix = previous.slice(-overlap);
    const currentPrefix = current.slice(0, overlap);

    const matches = previousSuffix.every(
      (word, index) => word === currentPrefix[index],
    );

    if (matches) {
      return current.slice(overlap);
    }
  }

  // Aucun chevauchement fiable : ne pas faire avancer le suivi.
  return [];
}


/**
 * Une occurrence complète d'une séquence reconnue dans le Mushaf.
 */
export interface TarteelSequenceCandidate {
  startIndex: number;
  endIndex: number;
  matches: TarteelWordMatch[];
}

/**
 * Recherche toutes les occurrences exactes et contiguës d'une transcription
 * dans les mots réels du Mushaf.
 *
 * Contrairement à findTarteelWordMatches, aucun mot cible ne peut être sauté.
 * Toutes les occurrences sont conservées pour gérer les ambiguïtés.
 */
export function findTarteelSequenceCandidates(
  targets: TarteelTargetWord[],
  recognizedText: string,
): TarteelSequenceCandidate[] {
  const recognizedWords = extractTarteelArabicWords(recognizedText);

  if (
    targets.length === 0 ||
    recognizedWords.length === 0 ||
    recognizedWords.length > targets.length
  ) {
    return [];
  }

  const normalizedTargets = targets.map((target) =>
    normalizeTarteelArabic(target.text),
  );

  const candidates: TarteelSequenceCandidate[] = [];

  for (
    let startIndex = 0;
    startIndex <= targets.length - recognizedWords.length;
    startIndex += 1
  ) {
    const matches = recognizedWords.every(
      (word, offset) =>
        normalizedTargets[startIndex + offset] === word,
    );

    if (!matches) {
      continue;
    }

    const wordMatches: TarteelWordMatch[] = recognizedWords.map(
      (_word, offset) => ({
        key: targets[startIndex + offset].key,
        targetIndex: startIndex + offset,
        recognizedIndex: offset,
      }),
    );

    candidates.push({
      startIndex,
      endIndex: startIndex + recognizedWords.length - 1,
      matches: wordMatches,
    });
  }

  return candidates;
}

/**
 * Résultat de la recherche du plus long suffixe reconnu dans le Mushaf.
 */
export interface TarteelSuffixCandidates {
  recognizedWords: string[];
  matchedWords: number;
  candidates: TarteelSequenceCandidate[];
}

/**
 * Recherche le plus long suffixe de la transcription qui correspond
 * exactement à une ou plusieurs séquences contiguës du Mushaf.
 *
 * Toutes les occurrences du suffixe retenu sont conservées.
 * Cette fonction ne choisit aucune ayah et ne déclenche aucun effet.
 */
export function findTarteelLongestSuffixCandidates(
  targets: TarteelTargetWord[],
  recognizedText: string,
): TarteelSuffixCandidates {
  const recognizedWords = extractTarteelArabicWords(recognizedText);

  for (
    let suffixStart = 0;
    suffixStart < recognizedWords.length;
    suffixStart += 1
  ) {
    const suffix = recognizedWords.slice(suffixStart);
    const candidates = findTarteelSequenceCandidates(
      targets,
      suffix.join(" "),
    );

    if (candidates.length > 0) {
      return {
        recognizedWords: suffix,
        matchedWords: suffix.length,
        candidates,
      };
    }
  }

  return {
    recognizedWords: [],
    matchedWords: 0,
    candidates: [],
  };
}

