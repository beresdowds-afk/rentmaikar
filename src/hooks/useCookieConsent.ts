import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Persist consent server-side so the banner is shown once per user account
 * (lifetime), not once per browser/session.
 */
async function persistRemote(prefs: CookiePreferences) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.rpc("save_my_cookie_consent" as never, {
      _prefs: { ...prefs, necessary: true },
    } as never);
  } catch {
    // non-blocking: local consent still applies
  }
}

async function fetchRemote(): Promise<CookieConsentRecord | null> {
  try {
    const { data, error } = await supabase.rpc("get_my_cookie_consent" as never);
    if (error || !data) return null;
    const payload = data as unknown as { preferences: CookiePreferences; timestamp: string };
    if (!payload?.preferences) return null;
    return {
      preferences: { ...DEFAULT_PREFS, ...payload.preferences, necessary: true },
      timestamp: payload.timestamp ?? new Date().toISOString(),
      version: CURRENT_VERSION,
    };
  } catch {
    return null;
  }
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

  // Sync with the signed-in user's stored consent: remote wins, and a local
  // pre-login choice is uploaded once so it never has to be asked again.
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const remote = await fetchRemote();
      if (cancelled) return;
      if (remote) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        setRecord(remote);
        window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: remote }));
      } else {
        const local = readStorage();
        if (local) await persistRemote(local.preferences);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void sync();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        setTimeout(() => { void sync(); }, 0);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const update = useCallback((prefs: Partial<CookiePreferences>) => {
    const next: CookiePreferences = { ...(record?.preferences ?? DEFAULT_PREFS), ...prefs, necessary: true };
    setRecord(writeStorage(next));
    void persistRemote(next);
  }, [record]);

  const acceptAll = useCallback(() => {
    setRecord(writeStorage(ALL_PREFS));
    void persistRemote(ALL_PREFS);
  }, []);
  const rejectAll = useCallback(() => {
    setRecord(writeStorage(DEFAULT_PREFS));
    void persistRemote(DEFAULT_PREFS);
  }, []);
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
