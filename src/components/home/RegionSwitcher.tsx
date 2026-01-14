import { useRegion, Country } from "@/contexts/RegionContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const RegionSwitcher = () => {
  const { country, setCountry } = useRegion();

  const regions: { value: Country; label: string; flag: string }[] = [
    { value: "USA", label: "United States", flag: "🇺🇸" },
    { value: "Nigeria", label: "Nigeria", flag: "🇳🇬" },
  ];

  const currentRegion = regions.find((r) => r.value === country);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-sm">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentRegion?.flag} {currentRegion?.label}</span>
          <span className="sm:hidden">{currentRegion?.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {regions.map((region) => (
          <DropdownMenuItem
            key={region.value}
            onClick={() => setCountry(region.value)}
            className={country === region.value ? "bg-accent/10" : ""}
          >
            <span className="mr-2">{region.flag}</span>
            {region.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RegionSwitcher;
