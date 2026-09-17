import type { JsonGzipReader } from "../../reader/json-gzip-reader";
import type { QuranpediaMushafDocument } from "./quranpedia-mushaf";
import type {
  QuranpediaMushafIndexRecord,
  QuranpediaMushafsIndexLoader,
} from "./quranpedia-mushafs-index";
import type {
  QuranpediaRiwaya,
  QuranpediaRiwayaCatalog,
} from "./quranpedia-riwayat";

export interface QuranpediaMushafs {
  readonly list: () => Promise<readonly QuranpediaMushafIndexRecord[]>;
  readonly load: (id: number) => Promise<QuranpediaMushafDocument>;
  readonly loadAll: () => Promise<readonly QuranpediaMushafDocument[]>;
  readonly riwayat: () => Promise<readonly QuranpediaRiwaya[]>;
}

export interface QuranpediaMushafsOptions {
  readonly rootPath: string;
  readonly reader: JsonGzipReader;
  readonly indexLoader: QuranpediaMushafsIndexLoader;
  readonly riwayaCatalog: QuranpediaRiwayaCatalog;
}

export function createQuranpediaMushafs(
  options: QuranpediaMushafsOptions,
): QuranpediaMushafs {
  const indexPath = `${options.rootPath}/mushafs-index.json.gz`;

  async function getIndex(): Promise<readonly QuranpediaMushafIndexRecord[]> {
    const index = await options.indexLoader.read(indexPath);
    return index.data;
  }

  return {
    async list() {
      return getIndex();
    },

    async load(id) {
      const mushafs = await getIndex();
      const mushaf = mushafs.find((item) => item.id === id);

      if (!mushaf) {
        throw new Error(`Quranpedia mushaf not found: ${id}`);
      }

      const filePath = `${options.rootPath}/mushafs-${mushaf.id}.json.gz`;

      return options.reader.read<QuranpediaMushafDocument>(filePath);
    },

    async loadAll() {
      const mushafs = await getIndex();

      return Promise.all(
        mushafs.map((mushaf) => {
          const filePath =
            `${options.rootPath}/mushafs-${mushaf.id}.json.gz`;

          return options.reader.read<QuranpediaMushafDocument>(filePath);
        }),
      );
    },

    async riwayat() {
      return options.riwayaCatalog.list();
    },
  };
}
