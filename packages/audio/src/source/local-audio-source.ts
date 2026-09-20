import type { AudioReciterId } from "../audio";
import { createAudioFileName } from "../resource/audio-resource";

export const HAFS_AUDIO_DIRECTORIES: Readonly<
  Record<AudioReciterId, string>
> = {
  "hafs-afassi": "mishary-alafasy",
  "hafs-abdelbasset": "abdelbasset-abdelsamad",
  "hafs-soudais": "abdulrahman-al-sudais",
  "hafs-houssari": "mahmoud-khalil-al-hussary",
  "hafs-chatir": "abu-bakr-al-shatri",
  "hafs-djebril": "mohamed-jebril",
};

export interface AudioSourceLocation {
  readonly reciterId: AudioReciterId;
  readonly directory: string;
  readonly fileName: string;
}

export function createLocalAudioSourceLocation(
  reciterId: AudioReciterId,
  surahNumber: number,
  ayahNumber: number,
): AudioSourceLocation {
  return {
    reciterId,
    directory: HAFS_AUDIO_DIRECTORIES[reciterId],
    fileName: createAudioFileName(surahNumber, ayahNumber),
  };
}
