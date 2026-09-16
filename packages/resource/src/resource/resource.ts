import type { ResourceScope } from "../scope/resource-scope";

export type ResourceType =
  | "mushaf"
  | "audio"
  | "tafsir"
  | "qiraat"
  | "morphology"
  | "i3rab"
  | "asbab"
  | "mutashabihat";

export interface ResourceIdentity {
  readonly type: ResourceType;
  readonly scope: ResourceScope;
  readonly key: string;
}

export type ResourceId = string;

export interface Resource {
  readonly id: ResourceId;
  readonly identity: ResourceIdentity;
}

export function createResourceId(identity: ResourceIdentity): ResourceId {
  return `${identity.type}/${identity.scope}/${identity.key}`;
}
