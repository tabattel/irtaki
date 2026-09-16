import { describe, expect, it } from "vitest";

import {
  createQuranpediaFile,
  type QuranpediaFile,
} from "./quranpedia-file";

describe("Quranpedia file", () => {
  it("represents a JSON.GZ source file", () => {
    const file: QuranpediaFile = createQuranpediaFile(
      "qiraat.json.gz",
      "qiraat.json.gz",
      "json.gz",
    );

    expect(file).toEqual({
      name: "qiraat.json.gz",
      relativePath: "qiraat.json.gz",
      format: "json.gz",
    });
  });

  it("represents a JSON source file", () => {
    const file: QuranpediaFile = createQuranpediaFile(
      "example.json",
      "example.json",
      "json",
    );

    expect(file.format).toBe("json");
  });

  it("represents a Markdown source file", () => {
    const file: QuranpediaFile = createQuranpediaFile(
      "README.md",
      "README.md",
      "md",
    );

    expect(file.format).toBe("md");
  });
});
