import { describe, expect, test } from "bun:test";
import { readMaintenanceMode, writeMaintenanceMode } from "./maintenance-store";

function createMemoryClient() {
  let row: { maintenance_mode: boolean } | null = { maintenance_mode: false };

  return {
    from(_table: string) {
      return {
        select(_columns: string) {
          return {
            eq(_column: string, _value: number) {
              return {
                async maybeSingle() {
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        upsert(
          next: { id: number; maintenance_mode: boolean; updated_at: string },
          _options: { onConflict: string },
        ) {
          return {
            select(_columns: string) {
              return {
                async single() {
                  row = { maintenance_mode: next.maintenance_mode };
                  return { data: row, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe("maintenance store persistence", () => {
  test("reads false by default", async () => {
    const client = createMemoryClient();
    expect(await readMaintenanceMode(client)).toBe(false);
  });

  test("toggles false → true → false via writeMaintenanceMode", async () => {
    const client = createMemoryClient();

    expect(await writeMaintenanceMode(client, true)).toBe(true);
    expect(await readMaintenanceMode(client)).toBe(true);

    expect(await writeMaintenanceMode(client, false)).toBe(false);
    expect(await readMaintenanceMode(client)).toBe(false);
  });
});