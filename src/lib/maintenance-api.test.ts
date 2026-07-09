import { describe, expect, test, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

const requireAdminFromRequest = mock(
  async (_request: NextRequest) => null as { supabase: unknown; userId: string } | null,
);
const getMaintenanceMode = mock(async () => false);
const setMaintenanceMode = mock(async (enabled: boolean) => enabled);

mock.module("@/lib/maintenance-admin", () => ({
  requireAdminFromRequest,
}));

mock.module("@/lib/maintenance-server", () => ({
  getMaintenanceMode,
  setMaintenanceMode,
}));

const { GET, POST } = await import("../../app/api/admin/maintenance/route");

function adminRequest(method: string, body?: object) {
  return new NextRequest("http://localhost/api/admin/maintenance", {
    method,
    headers: { Authorization: "Bearer test-token" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/admin/maintenance access control", () => {
  beforeEach(() => {
    requireAdminFromRequest.mockReset();
    getMaintenanceMode.mockReset();
    setMaintenanceMode.mockReset();
    requireAdminFromRequest.mockImplementation(async () => null);
    getMaintenanceMode.mockImplementation(async () => false);
    setMaintenanceMode.mockImplementation(async (enabled: boolean) => enabled);
  });

  test("GET returns 403 without admin", async () => {
    const res = await GET(adminRequest("GET"));
    expect(res.status).toBe(403);
  });

  test("POST returns 403 without admin", async () => {
    const res = await POST(adminRequest("POST", { enabled: true }));
    expect(res.status).toBe(403);
  });

  test("GET returns persisted flag for admin", async () => {
    requireAdminFromRequest.mockImplementation(async () => ({
      supabase: {},
      userId: "admin-1",
    }));
    getMaintenanceMode.mockImplementation(async () => true);

    const res = await GET(adminRequest("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ maintenance_mode: true });
    expect(getMaintenanceMode).toHaveBeenCalled();
  });

  test("POST toggles maintenance for admin", async () => {
    requireAdminFromRequest.mockImplementation(async () => ({
      supabase: {},
      userId: "admin-1",
    }));
    setMaintenanceMode.mockImplementation(async (enabled: boolean) => enabled);

    const on = await POST(adminRequest("POST", { enabled: true }));
    expect(on.status).toBe(200);
    expect(await on.json()).toEqual({ maintenance_mode: true });
    expect(setMaintenanceMode).toHaveBeenCalledWith(true);

    const off = await POST(adminRequest("POST", { enabled: false }));
    expect(off.status).toBe(200);
    expect(await off.json()).toEqual({ maintenance_mode: false });
    expect(setMaintenanceMode).toHaveBeenCalledWith(false);
  });
});