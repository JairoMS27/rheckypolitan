import { describe, expect, test } from "bun:test";
import {
  evaluatePassword,
  passwordMeetsAllRules,
  PASSWORD_RULES,
} from "./password";

describe("password rules", () => {
  test("rejects short or simple passwords", () => {
    expect(passwordMeetsAllRules("")).toBe(false);
    expect(passwordMeetsAllRules("abc")).toBe(false);
    expect(passwordMeetsAllRules("abcdefgh")).toBe(false);
    expect(passwordMeetsAllRules("Abcdefgh")).toBe(false);
    expect(passwordMeetsAllRules("Abcdefg1")).toBe(false);
  });

  test("accepts strong password", () => {
    expect(passwordMeetsAllRules("Abcdefg1!")).toBe(true);
  });

  test("evaluatePassword marks each rule", () => {
    const checks = evaluatePassword("Abcdefg1!");
    expect(checks).toHaveLength(PASSWORD_RULES.length);
    expect(checks.every((c) => c.ok)).toBe(true);
  });
});
