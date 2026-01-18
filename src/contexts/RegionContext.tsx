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
  phonePrefix: string;
  whatsappNumber: string;
  smsNumber: string;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

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
    currencySymbol: "$",
    phonePrefix: "+1",
    whatsappNumber: "12403930081",
    smsNumber: "12403930081",
  },
  Nigeria: {
    currency: "NGN",
    currencySymbol: "₦",
    phonePrefix: "+234",
    whatsappNumber: "12403930081",
    smsNumber: "12403930081",
  },
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
