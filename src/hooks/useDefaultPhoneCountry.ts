import { useEffect, useState } from 'react';
import type { Country } from 'react-phone-number-input';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { supabase } from '@/integrations/supabase/client';
import { useRegion } from '@/contexts/RegionContext';

/**
 * Region → default ISO country for the IDD (international dialing code)
 * dropdown. Extend this map as new markets launch — new entries are picked
 * up automatically everywhere PhoneNumberInput is rendered.
 */
export const REGION_TO_ISO: Record<string, Country> = {
  USA: 'US',
  Nigeria: 'NG',
  // Uppercase aliases used in some DB rows / queries.
  US: 'US',
  NG: 'NG',
  NIGERIA: 'NG',
};

/**
 * Resolves the safest ISO country fallback for a given region label.
 * Falls back to `US` only when the region is genuinely unknown.
 */
export function regionToDefaultCountry(region: string | null | undefined): Country {
  if (!region) return 'US';
  return REGION_TO_ISO[region] ?? REGION_TO_ISO[region.toUpperCase()] ?? 'US';
}

/**
 * Region-aware default ISO country for phone inputs.
 *
 * Resolution priority (highest first):
 *   1. Country encoded in the user's stored E.164 phone number
 *   2. `profiles.preferred_country`
 *   3. Current `RegionContext.country` (region-aware fallback)
 *   4. `US` (last-resort default)
 *
 * Guarantees every phone input across web, iOS and Android (Capacitor webview)
 * initializes to the correct dialing code and stays consistent as the user
 * updates their profile or switches region.
 */
export function useDefaultPhoneCountry(): Country {
  const { country } = useRegion();
  const fallback: Country = regionToDefaultCountry(country);
  const [iso, setIso] = useState<Country>(fallback);

  // Keep in sync when the region changes before the async profile lookup
  // resolves — this is what makes the input truly region-aware.
  useEffect(() => {
    setIso(fallback);
  }, [fallback]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      // profiles is keyed by user_id (not id) — matching the auth user.
      const { data } = await supabase
        .from('profiles')
        .select('phone, preferred_country')
        .eq('user_id', uid)
        .maybeSingle();
      if (cancelled) return;
      const parsed = data?.phone ? parsePhoneNumberFromString(data.phone) : null;
      if (parsed?.country) return setIso(parsed.country as Country);
      if (data?.preferred_country) {
        return setIso(regionToDefaultCountry(data.preferred_country));
      }
      // Leave region fallback in place.
    })();
    return () => {
      cancelled = true;
    };
  }, [fallback]);

  return iso;
}
