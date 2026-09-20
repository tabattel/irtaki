import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

import type { AudioReciterId } from "../audio";
import {
  createAudioFileName,
  parseAudioResourceKey,
} from "../resource/audio-resource";
import { HAFS_AUDIO_DIRECTORIES } from "../source/local-audio-source";

export interface LocalAudioProvider {
  readonly resolve: (resourceId: string) => string | undefined;
  readonly exists: (resourceId: string) => Promise<boolean>;
}

export function createLocalAudioProvider(
  rootDirectory: string,
): LocalAudioProvider {
  function resolve(resourceId: string): string | undefined {
    const prefix = "audio/ayah/";

    if (!resourceId.startsWith(prefix)) {
      return undefined;
    }

    const key = resourceId.slice(prefix.length);
    const parsed = parseAudioResourceKey(key);

    if (!parsed) {
      return undefined;
    }

    const directory = HAFS_AUDIO_DIRECTORIES[parsed.reciterId];
    const fileName = createAudioFileName(
      parsed.surahNumber,
      parsed.ayahNumber,
    );

    return join(
      rootDirectory,
      directory,
      fileName,
    );
  }

  async function exists(resourceId: string): Promise<boolean> {
    const filePath = resolve(resourceId);

    if (!filePath) {
      return false;
    }

    try {
      await access(filePath, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  return {
    resolve,
    exists,
  };
}
