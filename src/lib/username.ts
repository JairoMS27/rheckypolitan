/** Username rules shared by settings UI and server-side checks. */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const value = raw.trim();
  if (value.length < USERNAME_MIN) {
    return `Mínimo ${USERNAME_MIN} caracteres.`;
  }
  if (value.length > USERNAME_MAX) {
    return `Máximo ${USERNAME_MAX} caracteres.`;
  }
  if (!USERNAME_PATTERN.test(value)) {
    return "Solo letras, números y guión bajo (_).";
  }
  return null;
}

export function profilePath(username: string | null | undefined): string | null {
  if (!username) return null;
  return `/u/${encodeURIComponent(username)}`;
}
