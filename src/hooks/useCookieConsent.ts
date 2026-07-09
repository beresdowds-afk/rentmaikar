import { useCallback, useEffect, useState } from "react";

export type CookieCategory = "necessary" | "analytics" | "marketing" | "preferences";

export type CookiePreferences = Record<CookieCategory, boolean>;

export interface CookieConsentRecord {
  preferences: CookiePreferences;
  timestamp: string;
  version: number;
}

const STORAGE_KEY = "rentmaikar_cookie_consent_v2";
const LEGACY_KEY = "rentmaikar_cookie_consent";
const CURRENT_VERSION = 1;

export const DEFAULT_PREFS: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

const ALL_PREFS: CookiePreferences = {
  necessary: true,
  analytics: true,
  marketing: true,
  preferences: true,
};

function readStorage(): CookieConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CookieConsentRecord;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated: CookieConsentRecord = {
        preferences: legacy === "accepted" ? ALL_PREFS : DEFAULT_PREFS,
        timestamp: new Date().toISOString(),
        version: CURRENT_VERSION,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function writeStorage(prefs: CookiePreferences): CookieConsentRecord {
  const record: CookieConsentRecord = {
    preferences: { ...prefs, necessary: true },
    timestamp: new Date().toISOString(),
    version: CURRENT_VERSION,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: record }));
  return record;
}

export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent("cookie-consent-open"));
}

export function useCookieConsent() {
  const [record, setRecord] = useState<CookieConsentRecord | null>(() => readStorage());

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsentRecord>).detail;
      if (detail) setRecord(detail);
    };
    window.addEventListener("cookie-consent-changed", onChange);
    return () => window.removeEventListener("cookie-consent-changed", onChange);
  }, []);

  const update = useCallback((prefs: Partial<CookiePreferences>) => {
    const next: CookiePreferences = { ...(record?.preferences ?? DEFAULT_PREFS), ...prefs, necessary: true };
    setRecord(writeStorage(next));
  }, [record]);

  const acceptAll = useCallback(() => setRecord(writeStorage(ALL_PREFS)), []);
  const rejectAll = useCallback(() => setRecord(writeStorage(DEFAULT_PREFS)), []);
  const revoke = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    setRecord(null);
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: null }));
  }, []);

  return {
    consent: record?.preferences ?? DEFAULT_PREFS,
    record,
    hasConsented: !!record,
    update,
    acceptAll,
    rejectAll,
    revoke,
    openPreferences: openCookiePreferences,
  };
}
