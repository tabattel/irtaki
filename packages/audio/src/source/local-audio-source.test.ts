import { describe, expect, it } from "vitest";

import {
  createLocalAudioSourceLocation,
  HAFS_AUDIO_DIRECTORIES,
} from "./local-audio-source";

describe("local audio source", () => {
  it("maps every v1 reciter to its storage directory", () => {
    expect(Object.keys(HAFS_AUDIO_DIRECTORIES)).toHaveLength(6);
  });

  it("maps Alafasy ayah 1 to the confirmed storage filename", () => {
    expect(
      createLocalAudioSourceLocation("hafs-afassi", 1, 1),
    ).toEqual({
      reciterId: "hafs-afassi",
      directory: "mishary-alafasy",
      fileName: "001001.opus",
    });
  });

  it("maps a later surah correctly", () => {
    expect(
      createLocalAudioSourceLocation("hafs-djebril", 114, 6),
    ).toEqual({
      reciterId: "hafs-djebril",
      directory: "mohamed-jebril",
      fileName: "114006.opus",
    });
  });
});
