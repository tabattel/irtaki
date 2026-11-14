import { createHmac, randomBytes } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const TARTEEL_TICKET_AUDIENCE = "irtaki-tarteel-live";
export const TARTEEL_TICKET_TTL_SECONDS = 45;

export const TARTEEL_ALLOWED_MODES = [
  "tarteel1",
  "tarteel2",
] as const;

export type TarteelMode = (typeof TARTEEL_ALLOWED_MODES)[number];

type TicketClaims = {
  sub: string;
  aud: string;
  mode: TarteelMode;
  jti: string;
  iat: number;
  exp: number;
};

export type CreatedTarteelTicket = {
  ticket: string;
  expiresAt: number;
};

const DEFAULT_SECRET_PATH = join(
  homedir(),
  ".config",
  "irtaki",
  "tarteel-live.secret",
);

export async function readTarteelTicketSecret(
  secretPath = DEFAULT_SECRET_PATH,
): Promise<Buffer> {
  const fileInfo = await lstat(secretPath);

  if (fileInfo.isSymbolicLink() || !fileInfo.isFile()) {
    throw new Error("TARTEEL_SECRET_INVALID_FILE");
  }

  if ((fileInfo.mode & 0o777) !== 0o600) {
    throw new Error("TARTEEL_SECRET_INSECURE_PERMISSIONS");
  }

  if (
    typeof process.getuid === "function" &&
    fileInfo.uid !== process.getuid()
  ) {
    throw new Error("TARTEEL_SECRET_WRONG_OWNER");
  }

  const value = await readFile(secretPath, "utf8");

  if (!/^[0-9a-fA-F]{64}\n?$/.test(value)) {
    throw new Error("TARTEEL_SECRET_INVALID_FORMAT");
  }

  const secret = Buffer.from(value, "hex");

  if (secret.length !== 32) {
    throw new Error("TARTEEL_SECRET_INVALID_LENGTH");
  }

  return secret;
}

function encodeBase64Url(value: Buffer): string {
  return value.toString("base64url");
}

export function createTarteelTicket(
  userId: string,
  mode: TarteelMode,
  secret: Buffer,
  nowSeconds = Math.floor(Date.now() / 1000),
): CreatedTarteelTicket {
  if (
    typeof userId !== "string" ||
    userId.length === 0 ||
    userId.length > 128
  ) {
    throw new Error("TARTEEL_INVALID_USER");
  }

  if (!TARTEEL_ALLOWED_MODES.includes(mode)) {
    throw new Error("TARTEEL_INVALID_MODE");
  }

  if (!Buffer.isBuffer(secret) || secret.length !== 32) {
    throw new Error("TARTEEL_INVALID_SECRET");
  }

  if (!Number.isSafeInteger(nowSeconds) || nowSeconds < 0) {
    throw new Error("TARTEEL_INVALID_TIMESTAMP");
  }

  const expiresAt = nowSeconds + TARTEEL_TICKET_TTL_SECONDS;

  const claims: TicketClaims = {
    sub: userId,
    aud: TARTEEL_TICKET_AUDIENCE,
    mode,
    jti: randomBytes(16).toString("hex"),
    iat: nowSeconds,
    exp: expiresAt,
  };

  const payload = encodeBase64Url(
    Buffer.from(JSON.stringify(claims), "utf8"),
  );

  const signature = createHmac("sha256", secret)
    .update(payload, "ascii")
    .digest();

  return {
    ticket: `${payload}.${encodeBase64Url(signature)}`,
    expiresAt,
  };
}
