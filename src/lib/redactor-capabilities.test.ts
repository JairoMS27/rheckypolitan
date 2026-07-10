import { describe, expect, test } from "bun:test";
import { redactorCapabilities } from "./admin-users.functions";
import { filterAdminNavForRole, getAdminNavGroups } from "./admin-nav";
import { canPublishArticles } from "./dashboard-paths";

describe("redactorCapabilities", () => {
  test("redactor may publish articles and images but not magazines", () => {
    const caps = redactorCapabilities();
    expect(caps.canPublishArticles).toBe(true);
    expect(caps.canUploadArticleImages).toBe(true);
    expect(caps.canManageMagazines).toBe(false);
    expect(caps.canAccessAdminRevistas).toBe(false);
  });

  test("any authenticated account can publish articles (includes redactor)", () => {
    expect(canPublishArticles(true)).toBe(true);
  });

  test("admin nav for redactor exposes newspaper + articles, not revista CRUD", () => {
    const hrefs = filterAdminNavForRole(getAdminNavGroups(), {
      isAdmin: false,
      isStaff: true,
    }).flatMap((g) => g.items.map((i) => i.href));

    expect(hrefs).toContain("/admin/newspaper");
    expect(hrefs).toContain("/publicar");
    expect(hrefs).not.toContain("/admin/new");
    expect(hrefs).not.toContain("/admin/users");
    // Archive /admin is admin-only for revistas list
    expect(hrefs).not.toContain("/admin");
  });
});
