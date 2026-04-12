import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ALGORITHM = "aes-256-gcm";

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param plaintext - The string to encrypt.
 * @param hexKey - A 64-character hex string representing a 32-byte key.
 * @returns A colon-separated string in the format `iv:tag:ciphertext` (all hex-encoded).
 */
export function encrypt(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypts a string produced by `encrypt` using AES-256-GCM.
 * @param encrypted - A colon-separated string in the format `iv:tag:ciphertext`.
 * @param hexKey - A 64-character hex string representing a 32-byte key.
 * @returns The original plaintext string.
 * @throws If the ciphertext has been tampered with or the key is wrong.
 */
export function decrypt(encrypted: string, hexKey: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format: expected iv:tag:ciphertext");
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = Buffer.from(hexKey, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
