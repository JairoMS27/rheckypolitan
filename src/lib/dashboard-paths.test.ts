import { describe, expect, test } from "bun:test";
import {
  authorPostEditPath,
  authorPostNewPath,
  authorPostsListPath,
  authorPublishBasePath,
  isAdminRole,
  isAuthorPublishPath,
  isStaffRole,
  legacyAdminPostsToAuthorPath,
  postLoginDestination,
  ADMIN_DASHBOARD_PATH,
  HOME_PATH,
} from "./dashboard-paths";

describe("postLoginDestination", () => {
  test("always returns home for admin, redactor, and plain user", () => {
    expect(postLoginDestination(["admin"])).toBe(HOME_PATH);
    expect(postLoginDestination(["redactor"])).toBe(HOME_PATH);
    expect(postLoginDestination(["admin", "redactor"])).toBe(HOME_PATH);
    expect(postLoginDestination([])).toBe(HOME_PATH);
    expect(postLoginDestination()).toBe("/");
  });

  test("never returns admin routes", () => {
    for (const roles of [["admin"], ["redactor"], []] as const) {
      const dest = postLoginDestination(roles);
      expect(dest.startsWith("/admin")).toBe(false);
      expect(dest).not.toBe("/admin/posts");
    }
  });
});

describe("author publish paths", () => {
  test("base and subpaths under /publicar", () => {
    expect(authorPublishBasePath()).toBe("/publicar");
    expect(authorPostsListPath()).toBe("/publicar");
    expect(authorPostNewPath()).toBe("/publicar/nuevo");
    expect(authorPostEditPath("abc-123")).toBe("/publicar/abc-123/edit");
  });

  test("isAuthorPublishPath detects author surface", () => {
    expect(isAuthorPublishPath("/publicar")).toBe(true);
    expect(isAuthorPublishPath("/publicar/nuevo")).toBe(true);
    expect(isAuthorPublishPath("/publicar/x/edit")).toBe(true);
    expect(isAuthorPublishPath("/admin/posts")).toBe(false);
    expect(isAuthorPublishPath("/admin")).toBe(false);
  });
});

describe("staff helpers", () => {
  test("isStaffRole / isAdminRole", () => {
    expect(isStaffRole(["admin"])).toBe(true);
    expect(isStaffRole(["redactor"])).toBe(true);
    expect(isStaffRole([])).toBe(false);
    expect(isAdminRole(["admin"])).toBe(true);
    expect(isAdminRole(["redactor"])).toBe(false);
  });

  test("admin dashboard path is separate from author publish", () => {
    expect(ADMIN_DASHBOARD_PATH).toBe("/admin");
    expect(ADMIN_DASHBOARD_PATH).not.toBe(authorPublishBasePath());
  });
});

describe("legacyAdminPostsToAuthorPath", () => {
  test("maps admin posts URLs to /publicar", () => {
    expect(legacyAdminPostsToAuthorPath("/admin/posts")).toBe("/publicar");
    expect(legacyAdminPostsToAuthorPath("/admin/posts/")).toBe("/publicar");
    expect(legacyAdminPostsToAuthorPath("/admin/posts/new")).toBe("/publicar/nuevo");
    expect(legacyAdminPostsToAuthorPath("/admin/posts/uuid-1/edit")).toBe("/publicar/uuid-1/edit");
    expect(legacyAdminPostsToAuthorPath("/admin/articulos")).toBe("/publicar/nuevo");
  });

  test("leaves non-legacy paths alone", () => {
    expect(legacyAdminPostsToAuthorPath("/admin")).toBeNull();
    expect(legacyAdminPostsToAuthorPath("/admin/users")).toBeNull();
    expect(legacyAdminPostsToAuthorPath("/publicar")).toBeNull();
  });
});
