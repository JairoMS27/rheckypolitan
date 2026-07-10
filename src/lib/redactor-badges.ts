/** Client helper: resolve which author ids should show the Redactor badge. */
export async function fetchRedactorIdSet(authorIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(authorIds.filter(Boolean))];
  if (unique.length === 0) return new Set();

  const res = await fetch(
    `/api/authors/badges?ids=${encodeURIComponent(unique.join(","))}`,
    { cache: "no-store" },
  );
  if (!res.ok) return new Set();
  const json = (await res.json()) as { redactorIds?: string[] };
  return new Set(json.redactorIds ?? []);
}
