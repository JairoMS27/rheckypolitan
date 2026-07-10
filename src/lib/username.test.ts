import { describe, expect, test } from "bun:test";
import {
  normalizeUsername,
  profilePath,
  validateUsername,
} from "./username";

describe("validateUsername", () => {
  test("accepts valid usernames", () => {
    expect(validateUsername("john_bourbon")).toBeNull();
    expect(validateUsername("abc")).toBeNull();
    expect(validateUsername("User_123")).toBeNull();
  });

  test("rejects short or long values", () => {
    expect(validateUsername("ab")).toMatch(/Mínimo/);
    expect(validateUsername("a".repeat(31))).toMatch(/Máximo/);
  });

  test("rejects invalid characters", () => {
    expect(validateUsername("john-doe")).toMatch(/Solo letras/);
    expect(validateUsername("john doe")).toMatch(/Solo letras/);
  });
});

describe("normalizeUsername", () => {
  test("trims and lowercases", () => {
    expect(normalizeUsername("  Rhecky ")).toBe("rhecky");
  });
});

describe("profilePath", () => {
  test("builds path or null", () => {
    expect(profilePath("rhecky")).toBe("/u/rhecky");
    expect(profilePath(null)).toBeNull();
    expect(profilePath("")).toBeNull();
  });
});
