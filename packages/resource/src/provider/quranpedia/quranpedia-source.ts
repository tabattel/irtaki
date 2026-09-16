export interface QuranpediaSource {
  readonly name: "quranpedia";
  readonly version: string;
  readonly rootPath: string;
}

export function createQuranpediaSource(
  rootPath: string,
  version: string,
): QuranpediaSource {
  return {
    name: "quranpedia",
    version,
    rootPath,
  };
}
