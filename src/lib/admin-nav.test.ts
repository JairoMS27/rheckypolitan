import { describe, expect, test } from "bun:test";
import {
  adminSectionKicker,
  filterAdminNavForRole,
  getAdminNavGroups,
  isAdminNavItemActive,
} from "./admin-nav";
import { authorPostsListPath, authorPostNewPath } from "./dashboard-paths";

describe("getAdminNavGroups IA", () => {
  test("separates revistas from artículos author surface", () => {
    const groups = getAdminNavGroups();
    const ids = groups.map((g) => g.id);
    expect(ids).toContain("revistas");
    expect(ids).toContain("escritura");
    expect(ids).toContain("sitio");
    expect(ids).toContain("equipo");

    const escritura = groups.find((g) => g.id === "escritura")!;
    expect(escritura.items.every((i) => i.isAuthorSurface)).toBe(true);
    expect(escritura.items.map((i) => i.href)).toContain(authorPostsListPath());
    expect(escritura.items.map((i) => i.href)).toContain(authorPostNewPath());

    const revistas = groups.find((g) => g.id === "revistas")!;
    expect(revistas.items.every((i) => !i.isAuthorSurface)).toBe(true);
    expect(revistas.items.some((i) => i.href === "/admin")).toBe(true);
    expect(revistas.items.some((i) => i.href.includes("/newspaper"))).toBe(true);
    // Never treat /admin/posts as primary article path
    expect(revistas.items.every((i) => !i.href.includes("/admin/posts"))).toBe(true);
  });

  test("filterAdminNavForRole hides admin-only items from non-admin staff", () => {
    const all = getAdminNavGroups();
    const staff = filterAdminNavForRole(all, { isAdmin: false, isStaff: true });
    const hrefs = staff.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/admin/newspaper");
    expect(hrefs).toContain(authorPostsListPath());
    expect(hrefs).not.toContain("/admin/users");
    expect(hrefs).not.toContain("/admin/subscribers");
    expect(hrefs).not.toContain("/admin/new");
  });

  test("filterAdminNavForRole gives admin full IA", () => {
    const admin = filterAdminNavForRole(getAdminNavGroups(), {
      isAdmin: true,
      isStaff: true,
    });
    const hrefs = admin.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/admin");
    expect(hrefs).toContain("/admin/users");
    expect(hrefs).toContain("/admin/subscribers");
    expect(hrefs).toContain(authorPostsListPath());
  });
});

describe("isAdminNavItemActive", () => {
  test("marks issue edit under archivo", () => {
    const issues = getAdminNavGroups()
      .flatMap((g) => g.items)
      .find((i) => i.id === "issues")!;
    expect(isAdminNavItemActive("/admin", issues)).toBe(true);
    expect(isAdminNavItemActive("/admin/uuid/edit", issues)).toBe(true);
    expect(isAdminNavItemActive("/admin/newspaper", issues)).toBe(false);
  });

  test("author surface active on /publicar", () => {
    const articles = getAdminNavGroups()
      .flatMap((g) => g.items)
      .find((i) => i.id === "articles")!;
    expect(isAdminNavItemActive("/publicar", articles)).toBe(true);
    expect(isAdminNavItemActive("/publicar/nuevo", articles)).toBe(true);
    expect(isAdminNavItemActive("/admin", articles)).toBe(false);
  });
});

describe("adminSectionKicker", () => {
  test("labels sections with brand IA copy", () => {
    expect(adminSectionKicker("/admin")).toContain("Revistas");
    expect(adminSectionKicker("/admin/subscribers")).toContain("Sitio");
    expect(adminSectionKicker("/admin/users")).toContain("Equipo");
    expect(adminSectionKicker("/admin/newspaper")).toContain("Periódico");
  });
});
