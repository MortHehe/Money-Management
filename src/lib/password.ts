import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_COST = 131_072;

function derivePasswordKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: SCRYPT_COST, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString("hex");
  const hash = await derivePasswordKey(password, salt);
  return `scrypt:${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, salt, encodedHash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !encodedHash) {
    return false;
  }

  const expectedHash = Buffer.from(encodedHash, "hex");
  const suppliedHash = await derivePasswordKey(password, salt);

  return (
    expectedHash.length === suppliedHash.length &&
    timingSafeEqual(expectedHash, suppliedHash)
  );
}
