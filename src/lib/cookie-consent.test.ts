import { describe, expect, test } from "bun:test";
import {
  COOKIE_CONSENT_VERSION,
  defaultConsent,
  parseConsent,
  consentSummary,
} from "./cookie-consent";

describe("cookie consent", () => {
  test("defaultConsent always marks essential and current version", () => {
    const c = defaultConsent({ analytics: true, marketing: true, version: 99 });
    expect(c.essential).toBe(true);
    expect(c.version).toBe(COOKIE_CONSENT_VERSION);
    expect(c.analytics).toBe(true);
    expect(c.marketing).toBe(true);
  });

  test("parseConsent rejects invalid or old versions", () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("nope")).toBeNull();
    expect(parseConsent(JSON.stringify({ version: 0, analytics: true }))).toBeNull();
  });

  test("parseConsent accepts valid payload", () => {
    const raw = JSON.stringify({
      version: COOKIE_CONSENT_VERSION,
      analytics: true,
      marketing: false,
      decidedAt: "2026-07-11T00:00:00.000Z",
    });
    const c = parseConsent(raw);
    expect(c).not.toBeNull();
    expect(c!.analytics).toBe(true);
    expect(c!.marketing).toBe(false);
    expect(c!.essential).toBe(true);
  });

  test("consentSummary labels", () => {
    expect(consentSummary(defaultConsent({ analytics: true, marketing: true }))).toBe(
      "Todas",
    );
    expect(consentSummary(defaultConsent({ analytics: true }))).toContain("analítica");
    expect(consentSummary(defaultConsent())).toContain("esenciales");
  });
});
