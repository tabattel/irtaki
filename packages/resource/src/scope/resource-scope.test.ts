import { describe, expect, it } from "vitest";

import type { ResourceScope } from "./resource-scope";

describe("Resource scope", () => {
  it("represents a Quran-wide scope", () => {
    const scope: ResourceScope = "quran";

    expect(scope).toBe("quran");
  });

  it("represents a surah scope", () => {
    const scope: ResourceScope = "surah";

    expect(scope).toBe("surah");
  });

  it("represents an ayah scope", () => {
    const scope: ResourceScope = "ayah";

    expect(scope).toBe("ayah");
  });

  it("represents a page scope", () => {
    const scope: ResourceScope = "page";

    expect(scope).toBe("page");
  });

  it("represents a juz scope", () => {
    const scope: ResourceScope = "juz";

    expect(scope).toBe("juz");
  });

  it("represents a book scope", () => {
    const scope: ResourceScope = "book";

    expect(scope).toBe("book");
  });

  it("represents a topic scope", () => {
    const scope: ResourceScope = "topic";

    expect(scope).toBe("topic");
  });

  it("represents a range scope", () => {
    const scope: ResourceScope = "range";

    expect(scope).toBe("range");
  });
});
