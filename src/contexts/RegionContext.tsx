import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { DollarSign } from "lucide-react";
import { detectCountryFromIP, detectCountryFromTimezone } from "@/lib/ip-geolocation";
import { supabase } from "@/integrations/supabase/client";
import {
  getStoredCountry,
  getStoredMode,
  persistCountry,
  persistMode,
} from "@/lib/region-cookie";

export type Country = "USA" | "Nigeria";
export type RegionMode = "auto" | "manual";
export type Currency = "USD" | "NGN";

export interface CompanyInfo {
  companyName: string;
  phone: string;
  phoneRaw: string;
  email: string;
  fullAddress: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface RegionConfig {
  currency: Currency;
  currencySymbol: string;
  phonePrefix: string;
  whatsappNumber: string;
  smsNumber: string;
  supportEmail: string;
}

interface RegionContextType {
  country: Country;
  setCountry: (country: Country) => void;
  regionMode: RegionMode;
  setRegionMode: (mode: RegionMode) => void;
  isDetecting: boolean;
  currency: Currency;
  currencySymbol: string;
  phonePrefix: string;
  whatsappNumber: string;
  smsNumber: string;
  supportEmail: string;
  companyInfo: CompanyInfo | null;
  getCurrencyIcon: (className?: string) => React.ReactNode;
  config: RegionConfig;
}

// Base config (currency + phone prefix only). Contact channels — WhatsApp, SMS,
// and support email — are loaded from the admin-managed Regional Contact
// Channels table (public.contact_settings). Empty strings here mean
// "not yet loaded"; consumers should render conditionally.
const regionConfig: Record<Country, RegionConfig> = {
  USA: {
    currency: "USD",
    currencySymbol: "$",
    phonePrefix: "+1",
    whatsappNumber: "",
    smsNumber: "",
    supportEmail: "",
  },
  Nigeria: {
    currency: "NGN",
    currencySymbol: "₦",
    phonePrefix: "+234",
    whatsappNumber: "",
    smsNumber: "",
    supportEmail: "",
  },
};

const stripPhone = (v: string) => (v || "").replace(/[^\d]/g, "");

const NairaIcon = ({ className }: { className?: string }) => (
  <span className={className} aria-hidden>₦</span>
);

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const SAFE_DEFAULT: Country = "USA";

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [isDetecting, setIsDetecting] = useState(false);

  const [regionMode, setRegionModeState] = useState<RegionMode>(
    () => getStoredMode() ?? "auto"
  );

  const [country, setCountryState] = useState<Country>(() => {
    const stored = getStoredCountry();
    if (stored) return stored;
    try {
      return detectCountryFromTimezone();
    } catch {
      return SAFE_DEFAULT;
    }
  });

  const setCountry = (next: Country) => {
    setCountryState(next);
    persistCountry(next);
  };

  const setRegionMode = (next: RegionMode) => {
    setRegionModeState(next);
    persistMode(next);
  };

  // First-load auto detection (IP -> timezone -> safe default)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (regionMode !== "auto") return;
      setIsDetecting(true);
      try {
        const result = await detectCountryFromIP();
        if (!cancelled && result.detected) {
          setCountryState(result.country);
          persistCountry(result.country);
        }
      } catch {
        // keep timezone/stored/default fallback
      } finally {
        if (!cancelled) setIsDetecting(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [regionMode]);

  // Sync with the signed-in user's profile preference.
  useEffect(() => {
    let cancelled = false;
    const syncProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("preferred_country, region_mode")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled || !data) return;
        const pc = data.preferred_country as Country | null;
        const rm = data.region_mode as RegionMode | null;
        if (rm === "auto" || rm === "manual") {
          setRegionModeState(rm);
          persistMode(rm);
        }
        if (pc === "USA" || pc === "Nigeria") {
          setCountryState(pc);
          persistCountry(pc);
        }
      } catch {
        /* ignore */
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) syncProfile(data.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) syncProfile(session.user.id);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Persist manual selections back to profile if signed in.
  useEffect(() => {
    if (regionMode !== "manual") return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("profiles")
        .update({ preferred_country: country, region_mode: "manual" })
        .eq("user_id", data.user.id)
        .then(() => {});
    });
  }, [country, regionMode]);

  // Load region-specific WhatsApp / SMS / email from the admin-managed
  // "Regional Contact Channels" table. Falls back to base regionConfig when
  // no active row exists for a channel.
  const [contactOverrides, setContactOverrides] = useState<
    Record<Country, Partial<Pick<RegionConfig, "whatsappNumber" | "smsNumber" | "supportEmail">>>
  >({ USA: {}, Nigeria: {} });

  const [companyInfoMap, setCompanyInfoMap] = useState<Record<Country, CompanyInfo | null>>({
    USA: null,
    Nigeria: null,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("contact_settings")
        .select("region, contact_type, contact_value, is_active")
        .eq("is_active", true);
      if (cancelled || error || !data) return;
      const next: typeof contactOverrides = { USA: {}, Nigeria: {} };
      for (const row of data as Array<{ region: string; contact_type: string; contact_value: string }>) {
        const region = row.region === "Nigeria" ? "Nigeria" : "USA";
        const value = row.contact_value?.trim() || "";
        if (!value) continue;
        if (row.contact_type === "whatsapp") next[region].whatsappNumber = stripPhone(value);
        else if (row.contact_type === "sms") next[region].smsNumber = stripPhone(value);
        else if (row.contact_type === "email") next[region].supportEmail = value;
      }
      setContactOverrides(next);
    };
    load();
    const channel = supabase
      .channel("contact_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_settings" },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Load per-region company info (drives landing footer + admin panel)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("platform_company_info")
        .select("*")
        .eq("is_active", true);
      if (cancelled || error || !data) return;
      const next: Record<Country, CompanyInfo | null> = { USA: null, Nigeria: null };
      for (const row of data as Array<Record<string, unknown>>) {
        const region = row.region === "Nigeria" ? "Nigeria" : "USA";
        next[region] = {
          companyName: String(row.company_name ?? ""),
          phone: String(row.phone ?? ""),
          phoneRaw: String(row.phone_raw ?? ""),
          email: String(row.email ?? ""),
          fullAddress: String(row.full_address ?? ""),
          address: String(row.address_line ?? ""),
          city: String(row.city ?? ""),
          state: String(row.state ?? ""),
          country: String(row.country_name ?? ""),
          postalCode: String(row.postal_code ?? ""),
        };
      }
      setCompanyInfoMap(next);
    };
    load();
    const channel = supabase
      .channel("platform_company_info_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_company_info" },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const baseConfig = regionConfig[country];
  const overrides = contactOverrides[country];
  const config: RegionConfig = {
    ...baseConfig,
    whatsappNumber: overrides.whatsappNumber || baseConfig.whatsappNumber,
    smsNumber: overrides.smsNumber || baseConfig.smsNumber,
    supportEmail: overrides.supportEmail || baseConfig.supportEmail,
  };

  const getCurrencyIcon = (className = "h-4 w-4") =>
    config.currency === "NGN" ? (
      <NairaIcon className={className} />
    ) : (
      <DollarSign className={className} />
    );

  return (
    <RegionContext.Provider
      value={{
        country,
        setCountry,
        regionMode,
        setRegionMode,
        isDetecting,
        ...config,
        companyInfo: companyInfoMap[country],
        getCurrencyIcon,
        config,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) throw new Error("useRegion must be used within a RegionProvider");
  return context;
};
