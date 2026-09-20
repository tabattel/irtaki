import { describe, expect, it } from "vitest";

import {
  createAudioFileName,
  createAudioResourceId,
  createAudioResourceIdentity,
  parseAudioResourceKey,
} from "./audio-resource";

describe("audio resource", () => {
  it("creates the physical audio filename", () => {
    expect(createAudioFileName(1, 1)).toBe("001001.opus");
    expect(createAudioFileName(114, 6)).toBe("114006.opus");
  });

  it("creates a source-independent resource identity", () => {
    expect(
      createAudioResourceIdentity("hafs-afassi", 1, 1),
    ).toEqual({
      type: "audio",
      scope: "ayah",
      key: "hafs-afassi:001001",
    });
  });

  it("creates a deterministic resource id", () => {
    expect(
      createAudioResourceId("hafs-afassi", 1, 1),
    ).toBe("audio/ayah/hafs-afassi:001001");
  });

  it("parses the resource key", () => {
    expect(parseAudioResourceKey("hafs-afassi:001001")).toEqual({
      reciterId: "hafs-afassi",
      surahNumber: 1,
      ayahNumber: 1,
    });
  });

  it("parses a later surah and ayah", () => {
    expect(parseAudioResourceKey("hafs-houssari:114006")).toEqual({
      reciterId: "hafs-houssari",
      surahNumber: 114,
      ayahNumber: 6,
    });
  });

  it("rejects an unknown reciter", () => {
    expect(parseAudioResourceKey("unknown:001001")).toBeUndefined();
  });

  it("rejects an invalid audio key", () => {
    expect(parseAudioResourceKey("hafs-afassi:000001")).toBeUndefined();
    expect(parseAudioResourceKey("hafs-afassi:001")).toBeUndefined();
    expect(parseAudioResourceKey("hafs-afassi:115001")).toBeUndefined();
  });

  it("rejects invalid surah numbers", () => {
    expect(() => createAudioFileName(0, 1)).toThrow();
    expect(() => createAudioFileName(115, 1)).toThrow();
  });

  it("rejects invalid ayah numbers", () => {
    expect(() => createAudioFileName(1, 0)).toThrow();
    expect(() => createAudioFileName(1, 1.5)).toThrow();
  });
});
