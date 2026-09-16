import type { ResourceId } from "../resource/resource";

export type OfflinePackStatus =
  | "available"
  | "pending"
  | "partial";

export interface OfflinePack {
  readonly id: string;
  readonly name: string;
  readonly resources: readonly ResourceId[];
  readonly status: OfflinePackStatus;
}

export interface OfflinePackCatalog {
  readonly register: (pack: OfflinePack) => void;
  readonly get: (id: string) => OfflinePack | undefined;
  readonly list: () => readonly OfflinePack[];
}

export function createOfflinePackCatalog(): OfflinePackCatalog {
  const packs = new Map<string, OfflinePack>();

  return {
    register(pack) {
      packs.set(pack.id, pack);
    },

    get(id) {
      return packs.get(id);
    },

    list() {
      return [...packs.values()];
    },
  };
}
