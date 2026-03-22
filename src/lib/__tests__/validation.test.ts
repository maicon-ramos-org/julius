import { describe, it, expect } from "vitest";
import { sanitize, positiveNumber, positiveInt } from "../validation";

describe("sanitize", () => {
  it("trims whitespace", () => {
    expect(sanitize("  hello  ")).toBe("hello");
  });

  it("removes null bytes", () => {
    expect(sanitize("hello\0world")).toBe("helloworld");
  });

  it("returns null for non-string", () => {
    expect(sanitize(123)).toBe(null);
    expect(sanitize(undefined)).toBe(null);
    expect(sanitize(null)).toBe(null);
  });

  it("returns empty string for empty string", () => {
    expect(sanitize("")).toBe("");
  });
});

describe("positiveNumber", () => {
  it("returns number for valid positive number", () => {
    expect(positiveNumber(42)).toBe(42);
    expect(positiveNumber(3.14)).toBe(3.14);
  });

  it("parses string numbers", () => {
    expect(positiveNumber("19.99")).toBe(19.99);
  });

  it("returns zero for zero", () => {
    expect(positiveNumber(0)).toBe(0);
  });

  it("returns null for negative", () => {
    expect(positiveNumber(-5)).toBe(null);
  });

  it("returns null for NaN", () => {
    expect(positiveNumber("abc")).toBe(null);
  });

  it("returns null for null/undefined", () => {
    expect(positiveNumber(null)).toBe(null);
    expect(positiveNumber(undefined)).toBe(null);
  });
});

describe("positiveInt", () => {
  it("returns integer for valid positive integer", () => {
    expect(positiveInt(5)).toBe(5);
    expect(positiveInt("10")).toBe(10);
  });

  it("returns null for float", () => {
    expect(positiveInt(3.14)).toBe(null);
  });

  it("returns null for zero", () => {
    expect(positiveInt(0)).toBe(null);
  });

  it("returns null for negative", () => {
    expect(positiveInt(-1)).toBe(null);
  });
});
