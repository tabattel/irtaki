import { describe, expect, it } from "vitest";

import { normalizeEmail } from "./normalize-email";

describe("normalizeEmail", () => {
  it("trims and lowercases an email", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});
