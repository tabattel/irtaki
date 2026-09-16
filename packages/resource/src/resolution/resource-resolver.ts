import type { ResourceId } from "../resource/resource";
import type { ResourceCatalog } from "../manifest/resource-catalog";
import type { ResourceManifest } from "../manifest/resource-manifest";

export interface ResourceResolver {
  readonly resolve: (id: ResourceId) => ResourceManifest | undefined;
}

export function createResourceResolver(
  catalog: ResourceCatalog,
): ResourceResolver {
  return {
    resolve(id) {
      return catalog.get(id);
    },
  };
}
