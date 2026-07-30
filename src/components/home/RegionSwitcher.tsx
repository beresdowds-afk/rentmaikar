import { useRegion } from "@/contexts/RegionContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Loader2 } from "lucide-react";

const RegionSwitcher = () => {
  const { country, setCountry, availableRegions, regionsLoading } = useRegion();

  const currentRegion =
    availableRegions.find((r) => r.value === country) ?? availableRegions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-sm">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">
            {currentRegion?.flag} {currentRegion?.label ?? country}
          </span>
          <span className="sm:hidden">{currentRegion?.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {availableRegions.map((region) => (
          <DropdownMenuItem
            key={region.value}
            onClick={() => setCountry(region.value)}
            className={country === region.value ? "bg-accent/10" : ""}
          >
            <span className="mr-2">{region.flag}</span>
            {region.label}
          </DropdownMenuItem>
        ))}
        {regionsLoading && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Loading regions…
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RegionSwitcher;
