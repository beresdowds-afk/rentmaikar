import { useRegion } from "@/contexts/RegionContext";
import { cn } from "@/lib/utils";

interface CurrencyIconProps extends React.SVGProps<SVGSVGElement> {
  // optionally override currency code (for rare cases)
  currencyCode?: "USD" | "NGN";
}
const getCurrencyIcon = (className = "h-4 w-4") => {
  return country === "Nigeria" 
    ? <NairaIcon className={className} />
    : <DollarSign className={className} />;
};
export const CurrencyIcon = ({ currencyCode, className, ...props }: CurrencyIconProps) => {
  const { getCurrencyIcon, currency } = useRegion();
  const code = currencyCode || currency;
  // If you need to support multiple codes, use a switch or map
  const icon = code === "NGN" ? <NairaIcon /> : <DollarSign />;
  // Or reuse the context helper:
  // const icon = getCurrencyIcon(className);
  return <span className={cn("inline-flex", className)}>{icon}</span>;
};
import { CurrencyIcon } from "@/components/ui/CurrencyIcon";

// Instead of hardcoded $ or ₦:
<CurrencyIcon className="h-5 w-5" />

// For price displays:
<span>
  <CurrencyIcon /> {price}
</span>
