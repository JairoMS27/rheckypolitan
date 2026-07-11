/**
 * First-party cookie / privacy consent for Rheckypolitan.
 * Essential always on; analytics & marketing require opt-in (RGPD-style).
 */

export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_STORAGE_KEY = "rhecky_cookie_consent_v1";
export const COOKIE_CONSENT_COOKIE = "rhecky_consent";
export const COOKIE_VISITOR_ID = "rhecky_vid";
export const OPEN_COOKIE_SETTINGS_EVENT = "rhecky:open-cookie-settings";

export type CookieConsent = {
  version: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export function defaultConsent(partial?: Partial<CookieConsent>): CookieConsent {
  return {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    analytics: Boolean(partial?.analytics),
    marketing: Boolean(partial?.marketing),
    decidedAt:
      typeof partial?.decidedAt === "string" ? partial.decidedAt : new Date().toISOString(),
  };
}

export function parseConsent(raw: string | null | undefined): CookieConsent | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof data !== "object" || data == null) return null;
    if (data.version !== COOKIE_CONSENT_VERSION) return null;
    return defaultConsent({
      analytics: Boolean(data.analytics),
      marketing: Boolean(data.marketing),
      decidedAt: typeof data.decidedAt === "string" ? data.decidedAt : new Date().toISOString(),
    });
  } catch {
    return null;
  }
}

export function readConsentFromStorage(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((c) => c.trim());
  for (const p of parts) {
    if (p.startsWith(`${name}=`)) {
      return decodeURIComponent(p.slice(name.length + 1));
    }
  }
  return null;
}

export function saveConsent(consent: CookieConsent): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(consent);
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, payload);
  } catch {
    /* ignore quota */
  }
  // 13 months — common analytics consent horizon
  writeCookie(COOKIE_CONSENT_COOKIE, payload, 60 * 60 * 24 * 395);
  applyConsentSideEffects(consent);
  window.dispatchEvent(new CustomEvent("rhecky:consent-changed", { detail: consent }));
}

export function openCookieSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Ensure a first-party visitor id when analytics is allowed. */
export function ensureVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  const consent = readConsentFromStorage();
  if (!consent?.analytics) return null;

  let id = readCookie(COOKIE_VISITOR_ID);
  if (!id) {
    try {
      id = window.localStorage.getItem(COOKIE_VISITOR_ID);
    } catch {
      id = null;
    }
  }
  if (!id) id = randomId();

  writeCookie(COOKIE_VISITOR_ID, id, 60 * 60 * 24 * 365);
  try {
    window.localStorage.setItem(COOKIE_VISITOR_ID, id);
  } catch {
    /* ignore */
  }
  return id;
}

function clearVisitorId() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_VISITOR_ID}=; Path=/; Max-Age=0; SameSite=Lax`;
  try {
    window.localStorage.removeItem(COOKIE_VISITOR_ID);
  } catch {
    /* ignore */
  }
}

let lastHitKey = "";
let lastHitAt = 0;

/**
 * Record a page view when analytics consent is on:
 * - local buffer (debug / offline)
 * - POST /api/analytics/hit → Supabase (admin dashboard)
 */
export function trackPageView(path?: string): void {
  if (typeof window === "undefined") return;
  const consent = readConsentFromStorage();
  if (!consent?.analytics) return;

  const vid = ensureVisitorId();
  if (!vid) return;

  const p = path ?? window.location.pathname;
  const r = document.referrer || null;
  const now = Date.now();
  const dedupeKey = `${vid}:${p}`;
  // Avoid double-firing on remount / consent apply (same path within 4s)
  if (dedupeKey === lastHitKey && now - lastHitAt < 4000) return;
  lastHitKey = dedupeKey;
  lastHitAt = now;

  const entry = { t: now, p, r };

  try {
    const key = "rhecky_hits_v1";
    const prev = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown[];
    const next = Array.isArray(prev) ? [...prev.slice(-99), entry] : [entry];
    window.localStorage.setItem(key, JSON.stringify(next));
    window.localStorage.setItem(
      "rhecky_last_seen",
      JSON.stringify({ at: entry.t, path: entry.p, vid }),
    );
  } catch {
    /* ignore */
  }

  // Fire-and-forget server record
  void fetch("/api/analytics/hit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: vid,
      path: p,
      referrer: r,
      consentAnalytics: true,
    }),
    keepalive: true,
  }).catch(() => {
    /* network offline — local buffer remains */
  });
}

export function applyConsentSideEffects(consent: CookieConsent): void {
  if (consent.analytics) {
    ensureVisitorId();
    trackPageView();
  } else {
    clearVisitorId();
    try {
      window.localStorage.removeItem("rhecky_hits_v1");
      window.localStorage.removeItem("rhecky_last_seen");
    } catch {
      /* ignore */
    }
  }
  // marketing reserved for future ads / attribution pixels
}

export function consentSummary(c: CookieConsent): string {
  if (c.analytics && c.marketing) return "Todas";
  if (c.analytics) return "Esenciales + analítica";
  return "Solo esenciales";
}
