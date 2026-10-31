export type {
  Resource,
  ResourceId,
  ResourceIdentity,
  ResourceType,
} from "./resource/resource";

export { createResourceId } from "./resource/resource";

export type { ResourceScope } from "./scope/resource-scope";

export type { ResourceManifest } from "./manifest/resource-manifest";

export {
  createResourceCatalog,
  type ResourceCatalog,
} from "./manifest/resource-catalog";

export {
  createResourceResolver,
  type ResourceResolver,
} from "./resolution/resource-resolver";

export type { ResourceProvider } from "./provider/resource-provider";

export {
  createResourceCache,
  type ResourceCache,
} from "./cache/resource-cache";

export {
  createResourceDelivery,
  type ResourceDelivery,
} from "./delivery/resource-delivery";

export {
  createOfflinePackCatalog,
  type OfflinePack,
  type OfflinePackCatalog,
  type OfflinePackStatus,
} from "./offline/offline-pack";

export {
  createQuranpediaSource,
  type QuranpediaSource,
} from "./provider/quranpedia/quranpedia-source";

export {
  createQuranpediaFile,
  type QuranpediaFile,
} from "./provider/quranpedia/quranpedia-file";

export {
  createQuranpediaCatalog,
  type QuranpediaCatalog,
} from "./provider/quranpedia/quranpedia-catalog";

export { mapResourceToQuranpediaFile } from "./provider/quranpedia/quranpedia-resource-map";

export {
  mapQuranpediaMushafToDomain,
} from "./mapping/quranpedia-domain-mapper";

export {
  createQuranpediaMushafsIndexLoader,
  type QuranpediaMushafIndexRecord,
  type QuranpediaMushafsIndex,
  type QuranpediaMushafsIndexLoader,
} from "./provider/quranpedia/quranpedia-mushafs-index";

export {
  createQuranpediaMushafs,
  type QuranpediaMushafs,
  type QuranpediaMushafsOptions,
} from "./provider/quranpedia/quranpedia-mushafs";

export {
  QURANPEDIA_RIWAYAT,
  createQuranpediaRiwayaCatalog,
  type QuranpediaRiwaya,
  type QuranpediaRiwayaCatalog,
} from "./provider/quranpedia/quranpedia-riwayat";

export {
  createQuranpediaQiraatLoader,
  type QuranpediaQiraa,
  type QuranpediaRawi,
  type QuranpediaRewaya,
  type QuranpediaQiraatReading,
  type QuranpediaQiraatWord,
  type QuranpediaQiraatAyah,
  type QuranpediaQiraatDocument,
  type QuranpediaQiraatLoader,
} from "./provider/quranpedia/quranpedia-qiraat";

export {
  createQuranpediaRecitersLoader,
  type QuranpediaReciterRawi,
  type QuranpediaRecitationType,
  type QuranpediaRecitationClassification,
  type QuranpediaReciter,
  type QuranpediaReciterGroup,
  type QuranpediaRecitersDocument,
  type QuranpediaRecitersLoader,
} from "./provider/quranpedia/quranpedia-reciters";

export {
  createQuranpediaTafsirCatalog,
  QURANPEDIA_TAFSIR_OTHER_CATEGORY_LABEL,
  type QuranpediaTafsirCatalog,
} from "./provider/quranpedia/quranpedia-tafsir-catalog";

export {
  createQuranpediaTafsirLoader,
} from "./provider/quranpedia/quranpedia-tafsir-loader";

export {
  createQuranpediaTafsirIndex,
  type QuranpediaTafsirIndex,
} from "./provider/quranpedia/quranpedia-tafsir-index";

export {
  parseQuranpediaTafsirHtml,
  isSafeTafsirClassName,
  type SafeTafsirNode,
} from "./provider/quranpedia/quranpedia-tafsir-html";

export type {
  TafsirBookCategory,
  QuranpediaTafsirCatalogEntry,
  QuranpediaTafsirBookMetadata,
  QuranpediaTafsirContentBlock,
  QuranpediaTafsirAyah,
  QuranpediaTafsirDocument,
  QuranpediaTafsirLoader,
  QuranpediaTafsirLookup,
} from "./provider/quranpedia/quranpedia-tafsir-types";

export {
  createQuranpediaSimilarLoader,
} from "./provider/quranpedia/quranpedia-similar-loader";

export {
  createQuranpediaSimilarIndex,
  type QuranpediaSimilarIndex,
} from "./provider/quranpedia/quranpedia-similar-index";

export type {
  QuranpediaSimilarAttachment,
  QuranpediaSimilarYoutube,
  QuranpediaSimilarSurah,
  QuranpediaSimilarAyahInfo,
  QuranpediaSimilarAyahReference,
  QuranpediaSimilarGroup,
  QuranpediaSimilarEntry,
  QuranpediaSimilarDocument,
  QuranpediaSimilarLoader,
  QuranpediaSimilarLookup,
} from "./provider/quranpedia/quranpedia-similar-types";

export {
  createJsonGzipReader,
  type JsonGzipReader,
} from "./reader/json-gzip-reader";
