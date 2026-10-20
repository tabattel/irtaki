import type { AudioReciterId } from "../audio";
import { createAudioFileName } from "../resource/audio-resource";

export const AUDIO_QIRAA_ID = 5;
export const AUDIO_RIWAYA_ID = 10;

export const HAFS_AUDIO_DIRECTORIES: Readonly<Record<AudioReciterId, string>> =
  {
    "hafs-afassi": "mishary-alafasy",
    "hafs-abdelbasset": "abdelbasset-abdelsamad",
    "hafs-soudais": "abdulrahman-al-sudais",
    "hafs-houssari": "mahmoud-khalil-al-hussary",
    "hafs-chatir": "abu-bakr-al-shatri",
    "hafs-djebril": "mohamed-jebril",
  };

export interface AudioSourceLocation {
  readonly qiraaId: number;
  readonly riwayaId: number;
  readonly reciterId: AudioReciterId;
  readonly fileName: string;
  readonly directory: string;
}

export function createLocalAudioSourceLocation(
  reciterId: AudioReciterId,
  surahNumber: number,
  ayahNumber: number,
): AudioSourceLocation {
  return {
    qiraaId: AUDIO_QIRAA_ID,
    riwayaId: AUDIO_RIWAYA_ID,
    reciterId,
    directory: HAFS_AUDIO_DIRECTORIES[reciterId],
    fileName: createAudioFileName(surahNumber, ayahNumber),
  };
}
