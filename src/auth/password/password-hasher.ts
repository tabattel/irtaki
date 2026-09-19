import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const scrypt = (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: {
    N: number;
    r: number;
    p: number;
    maxmem: number;
  },
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey as Buffer);
    });
  });

const KEY_LENGTH = 64;
const SALT_LENGTH = 32;

const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);

    const derivedKey = (await scrypt(password, salt, KEY_LENGTH, {
      ...SCRYPT_OPTIONS,
    })) as Buffer;

    return [
      "scrypt",
      SCRYPT_OPTIONS.N,
      SCRYPT_OPTIONS.r,
      SCRYPT_OPTIONS.p,
      salt.toString("hex"),
      derivedKey.toString("hex"),
    ].join("$");
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split("$");

    if (parts.length !== 6 || parts[0] !== "scrypt") {
      return false;
    }

    const [, n, r, p, saltHex, hashHex] = parts;

    const salt = Buffer.from(saltHex, "hex");
    const expectedHash = Buffer.from(hashHex, "hex");

    if (
      !Number.isInteger(Number(n)) ||
      !Number.isInteger(Number(r)) ||
      !Number.isInteger(Number(p)) ||
      salt.length !== SALT_LENGTH ||
      expectedHash.length !== KEY_LENGTH
    ) {
      return false;
    }

    const derivedKey = (await scrypt(password, salt, KEY_LENGTH, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT_OPTIONS.maxmem,
    })) as Buffer;

    return timingSafeEqual(derivedKey, expectedHash);
  }
}
