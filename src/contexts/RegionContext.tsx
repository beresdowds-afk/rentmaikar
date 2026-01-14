import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Country = "USA" | "Nigeria";

interface RegionContextType {
  country: Country;
  setCountry: (country: Country) => void;
  currency: string;
  currencySymbol: string;
  phonePrefix: string;
  whatsappNumber: string;
  smsNumber: string;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const regionConfig = {
  USA: {
    currency: "USD",
    currencySymbol: "$",
    phonePrefix: "+1",
    whatsappNumber: "12025550123",
    smsNumber: "12025550123",
  },
  Nigeria: {
    currency: "NGN",
    currencySymbol: "₦",
    phonePrefix: "+234",
    whatsappNumber: "2348012345678",
    smsNumber: "2348012345678",
  },
};

// Detect country from timezone or browser language
const detectCountry = (): Country => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.startsWith("Africa/Lagos") || timezone.startsWith("Africa/")) {
      return "Nigeria";
    }
    
    const language = navigator.language || navigator.languages?.[0] || "";
    if (language.includes("NG") || language.includes("ng")) {
      return "Nigeria";
    }
    
    return "USA";
  } catch {
    return "USA";
  }
};

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [country, setCountry] = useState<Country>(() => {
    const saved = localStorage.getItem("preferred-country");
    if (saved === "USA" || saved === "Nigeria") return saved;
    return detectCountry();
  });

  useEffect(() => {
    localStorage.setItem("preferred-country", country);
  }, [country]);

  const config = regionConfig[country];

  return (
    <RegionContext.Provider
      value={{
        country,
        setCountry,
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
