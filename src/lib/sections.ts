export const SECTIONS = [
  { key: "actualidad", label: "Actualidad", path: "/actualidad" },
  { key: "entretenimiento", label: "Entretenimiento", path: "/entretenimiento" },
  { key: "conspiracion", label: "Conspiración", path: "/conspiracion" },
  { key: "gastronomia", label: "Gastronomía", path: "/gastronomia" },
  { key: "entrevistas", label: "Entrevistas", path: "/entrevistas" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

/** Legacy / archived section keys still present in DB posts. */
const LEGACY_SECTION_LABELS: Record<string, string> = {
  pasatiempos: "Pasatiempos",
};

export function sectionLabel(key: string): string {
  return SECTIONS.find((s) => s.key === key)?.label ?? LEGACY_SECTION_LABELS[key] ?? key;
}

export function isActiveSectionKey(key: string): key is SectionKey {
  return SECTIONS.some((s) => s.key === key);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
