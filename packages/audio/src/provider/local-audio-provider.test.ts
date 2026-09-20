import { describe, expect, it } from "vitest";

import { createLocalAudioProvider } from "./local-audio-provider";

describe("local audio provider", () => {
  const provider = createLocalAudioProvider(
    "/irtaki/storage/audio/coran/hafs/opus",
  );

  it("resolves an Alafasy ayah", () => {
    expect(
      provider.resolve("audio/ayah/hafs-afassi:001001"),
    ).toBe(
      "/irtaki/storage/audio/coran/hafs/opus/mishary-alafasy/001001.opus",
    );
  });

  it("resolves a Jebril ayah", () => {
    expect(
      provider.resolve("audio/ayah/hafs-djebril:114006"),
    ).toBe(
      "/irtaki/storage/audio/coran/hafs/opus/mohamed-jebril/114006.opus",
    );
  });

  it("rejects an invalid resource id", () => {
    expect(
      provider.resolve("audio/ayah/unknown:001001"),
    ).toBeUndefined();
  });

  it("rejects a non-audio resource", () => {
    expect(
      provider.resolve("mushaf/ayah/hafs-afassi:001001"),
    ).toBeUndefined();
  });
});
