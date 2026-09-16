import type { ResourceIdentity } from "../../resource/resource";

import type { QuranpediaFile } from "./quranpedia-file";

export function mapResourceToQuranpediaFile(
  identity: ResourceIdentity,
): QuranpediaFile | undefined {
  if (identity.type === "qiraat") {
    return {
      name: "qiraat.json.gz",
      relativePath: "qiraat.json.gz",
      format: "json.gz",
    };
  }

  if (identity.type === "mushaf") {
    return {
      name: "mushafs-index.json.gz",
      relativePath: "mushafs-index.json.gz",
      format: "json.gz",
    };
  }

  return undefined;
}
