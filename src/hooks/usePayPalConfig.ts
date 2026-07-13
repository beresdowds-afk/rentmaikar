import { useMemo } from "react";
import { useRegion } from "@/contexts/RegionContext";

export interface PayPalConfig {
  clientId: string | null;
  environment: "sandbox" | "live";
  currency: "USD";
  enabled: boolean;
}

export function usePayPalConfig(): PayPalConfig {
  const { country, currency } = useRegion();

  return useMemo(() => {
    const isUS = country === "USA" && currency === "USD";
    const env = (import.meta.env.VITE_PAYPAL_MODE ?? "sandbox") as "sandbox" | "live";
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID ?? null;

    return {
      clientId,
      environment: env,
      currency: "USD",
      enabled: isUS && !!clientId,
    };
  }, [country, currency]);
}
