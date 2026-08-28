import { useMemo } from "react";
import { useRegion } from "@/contexts/RegionContext";
import { regionSampleData, type RegionSamples } from "@/lib/sample-data";

/**
 * Region-aware sample names, phone numbers, addresses, and locations for
 * placeholders, hints, validation examples, and docs. Recomputes whenever
 * the selected region changes.
 */
export function useRegionSamples(): RegionSamples {
  const { country, availableRegions, phonePrefix } = useRegion();
  return useMemo(() => {
    const selected =
      availableRegions.find((r) => r.value === country) ??
      // Before the region list loads, still honor the resolved prefix so we
      // never flash a "+1" sample for a non-US region.
      ({
        value: country,
        label: country,
        flag: "",
        countryCode: "",
        currency: "USD",
        currencySymbol: "$",
        phonePrefix,
        builtIn: false,
      } as const);
    return regionSampleData(selected);
  }, [country, availableRegions, phonePrefix]);
}
