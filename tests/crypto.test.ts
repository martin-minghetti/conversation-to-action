import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

describe("crypto", () => {
  const testKey = "a".repeat(64); // 32 bytes hex

  it("encrypts and decrypts a string", () => {
    const original = "sk-ant-api03-secret-key";
    const encrypted = encrypt(original, testKey);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":"); // iv:tag:ciphertext format
    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext for same input", () => {
    const original = "same-input";
    const a = encrypt(original, testKey);
    const b = encrypt(original, testKey);
    expect(a).not.toBe(b); // different IV each time
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("test", testKey);
    const tampered = encrypted.slice(0, -4) + "xxxx";
    expect(() => decrypt(tampered, testKey)).toThrow();
  });

  it("throws on wrong key", () => {
    const encrypted = encrypt("test", testKey);
    const wrongKey = "b".repeat(64);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });
});
