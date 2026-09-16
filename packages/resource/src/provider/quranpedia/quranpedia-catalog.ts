import type { QuranpediaFile } from "./quranpedia-file";

export interface QuranpediaCatalog {
  readonly register: (file: QuranpediaFile) => void;
  readonly get: (name: string) => QuranpediaFile | undefined;
  readonly list: () => readonly QuranpediaFile[];
}

export function createQuranpediaCatalog(): QuranpediaCatalog {
  const files = new Map<string, QuranpediaFile>();

  return {
    register(file) {
      files.set(file.name, file);
    },

    get(name) {
      return files.get(name);
    },

    list() {
      return [...files.values()];
    },
  };
}
