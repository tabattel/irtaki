import type { ResourceId } from "../resource/resource";

export interface ResourceCache {
  readonly has: (id: ResourceId) => boolean;
  readonly get: (id: ResourceId) => unknown | undefined;
  readonly set: (id: ResourceId, content: unknown) => void;
  readonly delete: (id: ResourceId) => boolean;
  readonly clear: () => void;
}

export function createResourceCache(): ResourceCache {
  const contents = new Map<ResourceId, unknown>();

  return {
    has(id) {
      return contents.has(id);
    },

    get(id) {
      return contents.get(id);
    },

    set(id, content) {
      contents.set(id, content);
    },

    delete(id) {
      return contents.delete(id);
    },

    clear() {
      contents.clear();
    },
  };
}
