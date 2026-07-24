import { useEffect, useState } from 'react';
import type { Country } from 'react-phone-number-input';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { supabase } from '@/integrations/supabase/client';
import { useRegion } from '@/contexts/RegionContext';

const REGION_TO_ISO: Record<string, Country> = {
  USA: 'US',
  Nigeria: 'NG',
};

/**
 * Region-aware default ISO country for phone inputs.
 *
 * Resolution priority (highest first):
 *   1. Country encoded in the user's stored E.164 phone number
 *   2. `profiles.preferred_country`
 *   3. Current `RegionContext.country`
 *
 * Guarantees every phone input across web, iOS and Android (Capacitor webview)
 * initializes to the same country and stays consistent as the user updates
 * their profile or switches region.
 */
export function useDefaultPhoneCountry(): Country {
  const { country } = useRegion();
  const fallback: Country = REGION_TO_ISO[country] ?? 'US';
  const [iso, setIso] = useState<Country>(fallback);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        if (!cancelled) setIso(fallback);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('phone, preferred_country')
        .eq('id', uid)
        .maybeSingle();
      if (cancelled) return;
      const parsed = data?.phone ? parsePhoneNumberFromString(data.phone) : null;
      if (parsed?.country) return setIso(parsed.country as Country);
      if (data?.preferred_country && REGION_TO_ISO[data.preferred_country]) {
        return setIso(REGION_TO_ISO[data.preferred_country]);
      }
      setIso(fallback);
    })();
    return () => {
      cancelled = true;
    };
  }, [fallback]);

  return iso;
}
