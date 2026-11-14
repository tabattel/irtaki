import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  createTarteelTicket,
  readTarteelTicketSecret,
  TARTEEL_ALLOWED_MODES,
  TARTEEL_TICKET_AUDIENCE,
  TARTEEL_TICKET_TTL_SECONDS,
} from "./tarteel-ticket";

import { createHmac } from "node:crypto";
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  writeFile,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SECRET = Buffer.from(
  "0123456789abcdef0123456789abcdef",
  "utf8",
);

const temporaryDirectories: string[] = [];

async function createTemporarySecret(
  content: string,
  permissions = 0o600,
): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "irtaki-tarteel-"));
  temporaryDirectories.push(directory);

  const secretPath = join(directory, "secret");

  await writeFile(secretPath, content, { mode: permissions });
  await chmod(secretPath, permissions);

  return secretPath;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Tarteel ticket generation", () => {
  it("creates a valid HMAC-SHA256 ticket", () => {
    const now = 1_800_000_000;

    const result = createTarteelTicket(
      "user-test-123",
      "tarteel1",
      SECRET,
      now,
    );

    const [payloadPart, signaturePart] = result.ticket.split(".");

    expect(payloadPart).toBeTruthy();
    expect(signaturePart).toBeTruthy();

    const expectedSignature = createHmac("sha256", SECRET)
      .update(payloadPart, "ascii")
      .digest("base64url");

    expect(signaturePart).toBe(expectedSignature);

    const claims = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    );

    expect(claims.sub).toBe("user-test-123");
    expect(claims.aud).toBe(TARTEEL_TICKET_AUDIENCE);
    expect(claims.mode).toBe("tarteel1");
    expect(claims.iat).toBe(now);
    expect(claims.exp).toBe(
      now + TARTEEL_TICKET_TTL_SECONDS,
    );
    expect(claims.jti).toMatch(/^[0-9a-f]{32}$/);

    expect(result.expiresAt).toBe(claims.exp);
  });

  it("supports both allowed recognition modes", () => {
    for (const mode of TARTEEL_ALLOWED_MODES) {
      const result = createTarteelTicket(
        "user-1",
        mode,
        SECRET,
        1_800_000_000,
      );

      const payload = result.ticket.split(".")[0];

      const claims = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      );

      expect(claims.mode).toBe(mode);
    }
  });

  it("generates a different identifier for every ticket", () => {
    const first = createTarteelTicket(
      "user-1",
      "tarteel1",
      SECRET,
      1_800_000_000,
    );

    const second = createTarteelTicket(
      "user-1",
      "tarteel1",
      SECRET,
      1_800_000_000,
    );

    expect(first.ticket).not.toBe(second.ticket);
  });

  it("rejects an empty user identifier", () => {
    expect(() =>
      createTarteelTicket("", "tarteel1", SECRET),
    ).toThrow("TARTEEL_INVALID_USER");
  });

  it("rejects an invalid recognition mode", () => {
    expect(() =>
      createTarteelTicket(
        "user-1",
        "invalid" as never,
        SECRET,
      ),
    ).toThrow("TARTEEL_INVALID_MODE");
  });

  it("rejects an invalid secret", () => {
    expect(() =>
      createTarteelTicket(
        "user-1",
        "tarteel1",
        Buffer.from("short"),
      ),
    ).toThrow("TARTEEL_INVALID_SECRET");
  });

  it("rejects an invalid timestamp", () => {
    expect(() =>
      createTarteelTicket(
        "user-1",
        "tarteel1",
        SECRET,
        Number.NaN,
      ),
    ).toThrow("TARTEEL_INVALID_TIMESTAMP");
  });
});

describe("Tarteel shared secret file", () => {
  it("reads a valid 32-byte hexadecimal secret", async () => {
    const value = "0123456789abcdef".repeat(4);
    const path = await createTemporarySecret(`${value}\n`);

    const secret = await readTarteelTicketSecret(path);

    expect(secret).toHaveLength(32);
    expect(secret.toString("hex")).toBe(value);
  });

  it("rejects a secret with an invalid format", async () => {
    const path = await createTemporarySecret("invalid-secret\n");

    await expect(
      readTarteelTicketSecret(path),
    ).rejects.toThrow("TARTEEL_SECRET_INVALID_FORMAT");
  });

  it("rejects a secret with insecure permissions", async () => {
    const path = await createTemporarySecret(
      "0123456789abcdef".repeat(4),
      0o644,
    );

    await expect(
      readTarteelTicketSecret(path),
    ).rejects.toThrow("TARTEEL_SECRET_INSECURE_PERMISSIONS");
  });

  it("rejects a missing secret file", async () => {
    const path = join(tmpdir(), "irtaki-secret-that-does-not-exist");

    await expect(
      readTarteelTicketSecret(path),
    ).rejects.toThrow();
  });

  it("does not modify the secret file", async () => {
    const value = "0123456789abcdef".repeat(4);
    const path = await createTemporarySecret(value);

    await readTarteelTicketSecret(path);

    await expect(readFile(path, "utf8")).resolves.toBe(value);
  });

  it("rejects a symbolic link as secret file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "irtaki-tarteel-"));
    temporaryDirectories.push(directory);

    const target = join(directory, "real-secret");
    const link = join(directory, "secret-link");

    await writeFile(target, "0123456789abcdef".repeat(4), {
      mode: 0o600,
    });

    await symlink(target, link);

    await expect(
      readTarteelTicketSecret(link),
    ).rejects.toThrow("TARTEEL_SECRET_INVALID_FILE");
  });

  it("rejects permissions other than 600", async () => {
    const path = await createTemporarySecret(
      "0123456789abcdef".repeat(4),
      0o400,
    );

    await expect(
      readTarteelTicketSecret(path),
    ).rejects.toThrow("TARTEEL_SECRET_INSECURE_PERMISSIONS");
  });
});
