import type { ResourceCache } from "../cache/resource-cache";
import type { ResourceProvider } from "../provider/resource-provider";
import type { ResourceId } from "../resource/resource";

export interface ResourceDelivery {
  readonly get: (id: ResourceId) => Promise<unknown>;
}

export function createResourceDelivery(
  cache: ResourceCache,
  provider: ResourceProvider,
): ResourceDelivery {
  return {
    async get(id) {
      const cached = cache.get(id);

      if (cached !== undefined) {
        return cached;
      }

      const content = await provider.get(id);

      if (content !== undefined) {
        cache.set(id, content);
      }

      return content;
    },
  };
}
