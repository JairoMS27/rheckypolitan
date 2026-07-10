/** Client-side password rules for registration UX. */

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "Al menos 8 caracteres",
    test: (p) => p.length >= 8,
  },
  {
    id: "lower",
    label: "Una letra minúscula",
    test: (p) => /[a-záéíóúüñ]/.test(p),
  },
  {
    id: "upper",
    label: "Una letra mayúscula",
    test: (p) => /[A-ZÁÉÍÓÚÜÑ]/.test(p),
  },
  {
    id: "number",
    label: "Un número",
    test: (p) => /\d/.test(p),
  },
  {
    id: "special",
    label: "Un carácter especial (!@#$…)",
    test: (p) => /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s]/.test(p),
  },
];

export function passwordMeetsAllRules(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}

export function evaluatePassword(password: string): {
  id: string;
  label: string;
  ok: boolean;
}[] {
  return PASSWORD_RULES.map((r) => ({
    id: r.id,
    label: r.label,
    ok: r.test(password),
  }));
}
