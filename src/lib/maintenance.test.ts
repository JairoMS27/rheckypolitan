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
  });

  test("maintenance status APIs stay reachable", () => {
    expect(isMaintenanceExemptPath("/api/maintenance/status")).toBe(true);
    expect(isMaintenanceExemptPath("/api/admin/maintenance")).toBe(true);
  });

  test("author publish surface stays reachable", () => {
    expect(isMaintenanceExemptPath("/publicar")).toBe(true);
    expect(isMaintenanceExemptPath("/publicar/nuevo")).toBe(true);
    expect(isMaintenanceExemptPath("/publicar/abc/edit")).toBe(true);
    expect(isMaintenanceExemptPath("/profile")).toBe(true);
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

  test("on: allows staff and author entry points", () => {
    expect(shouldShowMaintenanceScreen("/login", true)).toBe(false);
    expect(shouldShowMaintenanceScreen("/admin", true)).toBe(false);
    expect(shouldShowMaintenanceScreen("/admin/posts/new", true)).toBe(false);
    expect(shouldShowMaintenanceScreen("/publicar", true)).toBe(false);
    expect(shouldShowMaintenanceScreen("/publicar/nuevo", true)).toBe(false);
  });

  test("on: blocks public destinations but not author account surface", () => {
    expect(shouldShowMaintenanceScreen("/", true)).toBe(true);
    expect(shouldShowMaintenanceScreen("/actualidad", true)).toBe(true);
    expect(shouldShowMaintenanceScreen("/profile", true)).toBe(false);
  });
});

describe("maintenance screen marker", () => {
  test("uses stable test id", () => {
    expect(MAINTENANCE_TEST_ID).toBe("maintenance-screen");
  });
});