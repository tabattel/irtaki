import type {
  ResourceIdentity,
  ResourceId,
} from "@irtaki/resource";

import type { AudioReciterId } from "../audio";

export interface AudioResourceKey {
  readonly reciterId: AudioReciterId;
  readonly surahNumber: number;
  readonly ayahNumber: number;
}

const RECITER_IDS = new Set<AudioReciterId>([
  "hafs-afassi",
  "hafs-abdelbasset",
  "hafs-soudais",
  "hafs-houssari",
  "hafs-chatir",
  "hafs-djebril",
]);

export function createAudioFileName(
  surahNumber: number,
  ayahNumber: number,
): string {
  validateSurahNumber(surahNumber);
  validateAyahNumber(ayahNumber);

  return (
    surahNumber.toString().padStart(3, "0") +
    ayahNumber.toString().padStart(3, "0") +
    ".opus"
  );
}

export function createAudioResourceIdentity(
  reciterId: AudioReciterId,
  surahNumber: number,
  ayahNumber: number,
): ResourceIdentity {
  const fileName = createAudioFileName(surahNumber, ayahNumber);

  return {
    type: "audio",
    scope: "ayah",
    key: `${reciterId}:${fileName.slice(0, -5)}`,
  };
}

export function createAudioResourceId(
  reciterId: AudioReciterId,
  surahNumber: number,
  ayahNumber: number,
): ResourceId {
  return createResourceId(
    createAudioResourceIdentity(reciterId, surahNumber, ayahNumber),
  );
}

export function parseAudioResourceKey(
  key: string,
): AudioResourceKey | undefined {
  const separatorIndex = key.indexOf(":");

  if (separatorIndex <= 0 || separatorIndex === key.length - 1) {
    return undefined;
  }

  const reciterId = key.slice(0, separatorIndex);
  const audioKey = key.slice(separatorIndex + 1);

  if (!RECITER_IDS.has(reciterId as AudioReciterId)) {
    return undefined;
  }

  if (!/^\d{6}$/.test(audioKey)) {
    return undefined;
  }

  const surahNumber = Number(audioKey.slice(0, 3));
  const ayahNumber = Number(audioKey.slice(3));

  if (
    surahNumber < 1 ||
    surahNumber > 114 ||
    ayahNumber < 1
  ) {
    return undefined;
  }

  return {
    reciterId: reciterId as AudioReciterId,
    surahNumber,
    ayahNumber,
  };
}

function createResourceId(identity: ResourceIdentity): ResourceId {
  return `${identity.type}/${identity.scope}/${identity.key}`;
}

function validateSurahNumber(surahNumber: number): void {
  if (
    !Number.isInteger(surahNumber) ||
    surahNumber < 1 ||
    surahNumber > 114
  ) {
    throw new Error("surahNumber must be an integer between 1 and 114");
  }
}

function validateAyahNumber(ayahNumber: number): void {
  if (!Number.isInteger(ayahNumber) || ayahNumber < 1) {
    throw new Error("ayahNumber must be a positive integer");
  }
}
