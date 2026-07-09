const SETTINGS_ID = 1;

type SettingsClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: number) => {
        maybeSingle: () => Promise<{
          data: { maintenance_mode: boolean } | null;
          error: { message: string } | null;
        }>;
      };
    };
    upsert: (
      row: { id: number; maintenance_mode: boolean; updated_at: string },
      options: { onConflict: string },
    ) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: { maintenance_mode: boolean } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export async function readMaintenanceMode(client: SettingsClient): Promise<boolean> {
  const { data, error } = await client
    .from("site_settings")
    .select("maintenance_mode")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.error("[maintenance] Failed to read site_settings", error);
    return false;
  }

  return Boolean(data?.maintenance_mode);
}

export async function writeMaintenanceMode(
  client: SettingsClient,
  enabled: boolean,
): Promise<boolean> {
  const { data, error } = await client
    .from("site_settings")
    .upsert(
      {
        id: SETTINGS_ID,
        maintenance_mode: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("maintenance_mode")
    .single();

  if (error) {
    console.error("[maintenance] Failed to update site_settings", error);
    throw error;
  }

  return Boolean(data?.maintenance_mode);
}