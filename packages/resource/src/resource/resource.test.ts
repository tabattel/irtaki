import { describe, expect, it } from "vitest";

import {
  createResourceId,
  type Resource,
  type ResourceIdentity,
  type ResourceType,
} from "./resource";

import type { ResourceScope } from "../scope/resource-scope";

describe("Resource identity", () => {
  it("represents a resource identity", () => {
    const identity: ResourceIdentity = {
      type: "mushaf",
      scope: "surah",
      key: "hafs:1",
    };

    expect(identity).toEqual({
      type: "mushaf",
      scope: "surah",
      key: "hafs:1",
    });
  });

  it("represents a resource with its identity", () => {
    const resource: Resource = {
      id: "mushaf/surah/hafs:1",
      identity: {
        type: "mushaf",
        scope: "surah",
        key: "hafs:1",
      },
    };

    expect(resource.id).toBe("mushaf/surah/hafs:1");
    expect(resource.identity.type).toBe("mushaf");
    expect(resource.identity.scope).toBe("surah");
    expect(resource.identity.key).toBe("hafs:1");
  });

  it("restricts resource types and scopes to the domain vocabulary", () => {
    const type: ResourceType = "tafsir";
    const scope: ResourceScope = "book";

    expect(type).toBe("tafsir");
    expect(scope).toBe("book");
  });

  it("creates a stable resource id from its identity", () => {
    const identity: ResourceIdentity = {
      type: "mushaf",
      scope: "surah",
      key: "hafs:1",
    };

    expect(createResourceId(identity)).toBe("mushaf/surah/hafs:1");
  });
});
