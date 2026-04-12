import { describe, it, expect } from "vitest";
import { stringSimilarity, extractKeywords } from "@/lib/utils";

describe("stringSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(stringSimilarity("Login page crashes on Safari", "Login page crashes on Safari")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    expect(stringSimilarity("apple banana cherry", "dog elephant fish")).toBe(0);
  });

  it("returns high similarity (>0.3) for similar bug reports", () => {
    const a = "Login page crashes on Safari";
    const b = "Safari login crash after OAuth";
    expect(stringSimilarity(a, b)).toBeGreaterThan(0.3);
  });

  it("is case-insensitive", () => {
    const lower = stringSimilarity("login page crashes safari", "LOGIN PAGE CRASHES SAFARI");
    expect(lower).toBe(1);
  });
});

describe("extractKeywords", () => {
  it("extracts meaningful words from text", () => {
    const keywords = extractKeywords("Login page crashes on Safari");
    expect(keywords).toContain("login");
    expect(keywords).toContain("page");
    expect(keywords).toContain("crashes");
    expect(keywords).toContain("safari");
  });

  it("excludes stop words", () => {
    const keywords = extractKeywords("Login page crashes on Safari after OAuth");
    expect(keywords).not.toContain("on");
    expect(keywords).not.toContain("after");
  });

  it("excludes words with 2 or fewer characters", () => {
    const keywords = extractKeywords("is an bug in the UI");
    expect(keywords).not.toContain("is");
    expect(keywords).not.toContain("an");
    expect(keywords).not.toContain("in");
  });

  it("returns lowercase keywords", () => {
    const keywords = extractKeywords("Safari Login CRASH");
    expect(keywords).toContain("safari");
    expect(keywords).toContain("login");
    expect(keywords).toContain("crash");
  });
});
