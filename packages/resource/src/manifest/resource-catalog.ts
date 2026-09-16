import type { ResourceId } from "../resource/resource";
import type { ResourceManifest } from "./resource-manifest";

export interface ResourceCatalog {
  readonly register: (manifest: ResourceManifest) => void;
  readonly get: (id: ResourceId) => ResourceManifest | undefined;
  readonly list: () => readonly ResourceManifest[];
}

export function createResourceCatalog(): ResourceCatalog {
  const manifests = new Map<ResourceId, ResourceManifest>();

  return {
    register(manifest) {
      const id = `${manifest.identity.type}/${manifest.identity.scope}/${manifest.identity.key}`;

      manifests.set(id, manifest);
    },

    get(id) {
      return manifests.get(id);
    },

    list() {
      return [...manifests.values()];
    },
  };
}
