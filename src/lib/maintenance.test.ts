import { describe, expect, test } from "bun:test";
import {
  isMaintenanceExemptPath,
  shouldShowMaintenanceScreen,
  MAINTENANCE_TEST_ID,
} from "./maintenance";

describe("isMaintenanceExemptPath", () => {
  test("login and admin routes are exempt", () => {
    expect(isMaintenanceExemptPath("/login")).toBe(true);
    expect(isMaintenanceExemptPath("/admin")).toBe(true);
    expect(isMaintenanceExemptPath("/admin/posts")).toBe(true);
    expect(isMaintenanceExemptPath("/admin/users")).toBe(true);
  });

  test("public routes are not exempt", () => {
    expect(isMaintenanceExemptPath("/")).toBe(false);
    expect(isMaintenanceExemptPath("/actualidad")).toBe(false);
    expect(isMaintenanceExemptPath("/revista/1")).toBe(false);
    expect(isMaintenanceExemptPath("/profile")).toBe(false);
  });

  test("maintenance status APIs stay reachable", () => {
    expect(isMaintenanceExemptPath("/api/maintenance/status")).toBe(true);
    expect(isMaintenanceExemptPath("/api/admin/maintenance")).toBe(true);
  });
});

describe("shouldShowMaintenanceScreen", () => {
  test("off: never shows maintenance", () => {
    expect(shouldShowMaintenanceScreen("/", false)).toBe(false);
    expect(shouldShowMaintenanceScreen("/actualidad", false)).toBe(false);
  });

  test("on: blocks public pages", () => {
    expect(shouldShowMaintenanceScreen("/", true)).toBe(true);
    expect(shouldShowMaintenanceScreen("/noticia/foo/bar", true)).toBe(true);
  });

  test("on: allows staff entry points", () => {
    expect(shouldShowMaintenanceScreen("/login", true)).toBe(false);
    expect(shouldShowMaintenanceScreen("/admin", true)).toBe(false);
    expect(shouldShowMaintenanceScreen("/admin/posts/new", true)).toBe(false);
  });

  test("on: blocks logged-in user destinations", () => {
    expect(shouldShowMaintenanceScreen("/profile", true)).toBe(true);
    expect(shouldShowMaintenanceScreen("/", true)).toBe(true);
  });
});

describe("maintenance screen marker", () => {
  test("uses stable test id", () => {
    expect(MAINTENANCE_TEST_ID).toBe("maintenance-screen");
  });
});