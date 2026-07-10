import { describe, expect, test } from "bun:test";
import {
  ADMIN_POSTS_PATH,
  adminSectionKicker,
  filterAdminNavForRole,
  getAdminNavGroups,
  isAdminNavItemActive,
} from "./admin-nav";
import { authorPostNewPath } from "./dashboard-paths";

describe("getAdminNavGroups IA", () => {
  test("separates revistas from artículos admin catalog", () => {
    const groups = getAdminNavGroups();
    const ids = groups.map((g) => g.id);
    expect(ids).toContain("revistas");
    expect(ids).toContain("escritura");
    expect(ids).toContain("sitio");
    expect(ids).toContain("equipo");

    const escritura = groups.find((g) => g.id === "escritura")!;
    const articles = escritura.items.find((i) => i.id === "articles")!;
    expect(articles.href).toBe(ADMIN_POSTS_PATH);
    expect(articles.access).toBe("admin");
    expect(articles.isAuthorSurface).toBeUndefined();

    const newArticle = escritura.items.find((i) => i.id === "new-article")!;
    expect(newArticle.href).toBe(authorPostNewPath());
    expect(newArticle.isAuthorSurface).toBe(true);

    const revistas = groups.find((g) => g.id === "revistas")!;
    expect(revistas.items.every((i) => !i.isAuthorSurface)).toBe(true);
    expect(revistas.items.some((i) => i.href === "/admin")).toBe(true);
    expect(revistas.items.some((i) => i.href.includes("/newspaper"))).toBe(true);
  });

  test("filterAdminNavForRole hides admin-only items from non-admin staff", () => {
    const all = getAdminNavGroups();
    const staff = filterAdminNavForRole(all, { isAdmin: false, isStaff: true });
    const hrefs = staff.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/admin/newspaper");
    expect(hrefs).toContain(authorPostNewPath());
    expect(hrefs).not.toContain(ADMIN_POSTS_PATH);
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
    expect(hrefs).toContain(ADMIN_POSTS_PATH);
    const usersItem = getAdminNavGroups()
      .flatMap((g) => g.items)
      .find((i) => i.id === "users");
    expect(usersItem?.label).toBe("Usuarios");
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

  test("admin articles catalog active on /admin/posts", () => {
    const articles = getAdminNavGroups()
      .flatMap((g) => g.items)
      .find((i) => i.id === "articles")!;
    expect(isAdminNavItemActive("/admin/posts", articles)).toBe(true);
    expect(isAdminNavItemActive("/admin/posts/", articles)).toBe(true);
    expect(isAdminNavItemActive("/publicar", articles)).toBe(false);
    expect(isAdminNavItemActive("/admin", articles)).toBe(false);
  });
});

describe("adminSectionKicker", () => {
  test("labels sections with brand IA copy", () => {
    expect(adminSectionKicker("/admin")).toContain("Revistas");
    expect(adminSectionKicker("/admin/subscribers")).toContain("Sitio");
    expect(adminSectionKicker("/admin/users")).toContain("Usuarios");
    expect(adminSectionKicker("/admin/newspaper")).toContain("Periódico");
    expect(adminSectionKicker("/admin/posts")).toContain("Artículos");
  });
});
