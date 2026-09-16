import type { ResourceId } from "../resource/resource";

export interface ResourceProvider {
  readonly get: (id: ResourceId) => Promise<unknown>;
}
