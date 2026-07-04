import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { detectCountryFromIP, detectCountryFromTimezone } from "@/lib/ip-geolocation";

export type Country = "USA" | "Nigeria";
export type RegionMode = "auto" | "manual";
export type Currency = "USD" | "NGN";

interface RegionContextType {
  country: Country;
  setCountry: (country: Country) => void;
  regionMode: RegionMode;
  setRegionMode: (mode: RegionMode) => void;
  isDetecting: boolean;
  currency: Currency;
  currencySymbol: string;
  // NEW: helper to get icon component
  getCurrencyIcon: (className?: string) => React.ReactNode;
  // NEW: full config for other uses
  config: RegionConfig;
}

interface RegionConfig {
  currency: Currency;
  currencySymbol: string;
  phonePrefix: string;
  whatsappNumber: string;
  smsNumber: string;
}

const regionConfig: Record<Country, RegionConfig> = {
  USA: {
    currency: "USD",
    currencySymbol: "<CurrencyIcon /> ",
    phonePrefix: "+1",
    whatsappNumber: "124078589931",
    smsNumber: "124078589931",
  },
  Nigeria: {
    currency: "NGN",
    currencySymbol: "<CurrencyIcon /> ",
    phonePrefix: "+234",
    whatsappNumber: "12403930081",
    smsNumber: "12403930081",
  },
};

// Import your icon components – adjust paths as needed
import { DollarSign, NairaIcon } from "@/components/icons"; // or from 'lucide-react'

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const STORAGE_KEY = "region_preference";

export const RegionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [country, setCountry] = useState<Country>("USA");
  const [regionMode, setRegionMode] = useState<RegionMode>("auto");
  const [isDetecting, setIsDetecting] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.country && parsed.mode) {
          setCountry(parsed.country);
          setRegionMode(parsed.mode);
          setIsDetecting(false);
          return; // skip auto-detection if manual override exists
        }
      } catch {}
    }
    // Otherwise auto-detect
    detect();
  }, []);

  const detect = async () => {
    setIsDetecting(true);
    try {
      // Try IP first, then timezone as fallback
      let detected = await detectCountryFromIP();
      if (!detected) detected = detectCountryFromTimezone();
      if (detected && (detected === "USA" || detected === "Nigeria")) {
        setCountry(detected);
        // Save the auto-detected result so next time it's fast
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ country: detected, mode: "auto" }));
      }
    } catch (error) {
      console.warn("Region detection failed, using default (USA)");
      setCountry("USA");
    } finally {
      setIsDetecting(false);
    }
  };

  // When user manually changes country, save it
  const handleSetCountry = (newCountry: Country) => {
    setCountry(newCountry);
    setRegionMode("manual");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ country: newCountry, mode: "manual" }));
  };

  const config = regionConfig[country];
  const currencySymbol = config.currencySymbol;
  const currency = config.currency;

  const getCurrencyIcon = (className = "h-4 w-4") => {
    // You can use any icon library – here's an example
    return currency === "NGN" 
      ? <NairaIcon className={className} /> 
      : <DollarSign className={className} />;
  };

  return (
    <RegionContext.Provider
      value={{
        country,
        setCountry: handleSetCountry,
        regionMode,
        setRegionMode: (mode) => {
          setRegionMode(mode);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ country, mode }));
        },
        isDetecting,
        currency,
        currencySymbol,
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
export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [regionMode, setRegionMode] = useState<RegionMode>(() => {
    const saved = localStorage.getItem("region-mode");
    if (saved === "auto" || saved === "manual") return saved;
    return "auto";
  });
  
  const [country, setCountry] = useState<Country>(() => {
    const saved = localStorage.getItem("preferred-country");
    if (saved === "USA" || saved === "Nigeria") return saved;
    // Initial fallback to timezone while IP detection runs
    return detectCountryFromTimezone();
  });

  // IP-based detection on mount when in auto mode
  useEffect(() => {
    const detectRegion = async () => {
      if (regionMode === "auto") {
        setIsDetecting(true);
        try {
          const result = await detectCountryFromIP();
          if (result.detected) {
            setCountry(result.country);
            localStorage.setItem("preferred-country", result.country);
          }
        } catch (error) {
          console.warn("IP detection failed:", error);
        } finally {
          setIsDetecting(false);
        }
      }
    };

    detectRegion();
  }, [regionMode]);

  // Save region mode preference
  useEffect(() => {
    localStorage.setItem("region-mode", regionMode);
  }, [regionMode]);

  // Save country preference only in manual mode
  useEffect(() => {
    if (regionMode === "manual") {
      localStorage.setItem("preferred-country", country);
    }
  }, [country, regionMode]);

  const config = regionConfig[country];

  return (
    <RegionContext.Provider
      value={{
        country,
        setCountry,
        regionMode,
        setRegionMode,
        isDetecting,
        ...config,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error("useRegion must be used within a RegionProvider");
  }
  return context;
};
