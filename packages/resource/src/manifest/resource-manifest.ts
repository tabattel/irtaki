import type {
  ResourceIdentity,
  ResourceType,
} from "../resource/resource";
import type { ResourceScope } from "../scope/resource-scope";

export interface ResourceManifest {
  readonly identity: ResourceIdentity;
  readonly type: ResourceType;
  readonly scope: ResourceScope;
  readonly source: string;
  readonly version: string;
  readonly format: string;
  readonly size?: number;
  readonly checksum?: string;
}
