import { describe, expect, it } from "vitest";

import { PasswordHasher } from "./password-hasher";

describe("PasswordHasher", () => {
  it("creates a salted password hash", async () => {
    const hasher = new PasswordHasher();

    const hash = await hasher.hash("password-123");

    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$[a-f0-9]{64}\$[a-f0-9]{128}$/);
  });

  it("creates different hashes for the same password", async () => {
    const hasher = new PasswordHasher();

    const first = await hasher.hash("password-123");
    const second = await hasher.hash("password-123");

    expect(first).not.toBe(second);
  });

  it("verifies the correct password", async () => {
    const hasher = new PasswordHasher();

    const hash = await hasher.hash("password-123");

    await expect(hasher.verify("password-123", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hasher = new PasswordHasher();

    const hash = await hasher.hash("password-123");

    await expect(hasher.verify("wrong-password", hash)).resolves.toBe(false);
  });

  it("rejects an invalid hash", async () => {
    const hasher = new PasswordHasher();

    await expect(hasher.verify("password-123", "invalid-hash")).resolves.toBe(
      false,
    );
  });
});
