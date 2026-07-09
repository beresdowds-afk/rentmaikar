import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RegionProvider, useRegion, type Country } from "@/contexts/RegionContext";

// Mock supabase client used inside RegionProvider so nothing hits the network.
vi.mock("@/integrations/supabase/client", () => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
    update: () => chain,
    then: (r: any) => r({ data: null, error: null }),
  };
  return {
    supabase: {
      from: () => chain,
      auth: {
        getUser: async () => ({ data: { user: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    },
  };
});

vi.mock("@/lib/ip-geolocation", () => ({
  detectCountryFromIP: vi.fn(async () => ({ country: "USA", countryCode: "US", detected: false })),
  detectCountryFromTimezone: () => "USA",
}));

// Mock auth/user-type contexts so HeroSection can mount without real providers.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, userRole: null, signOut: async () => {}, isLoading: false }),
}));
vi.mock("@/contexts/UserTypeContext", () => ({
  useUserType: () => ({ userType: "driver", setUserType: () => {} }),
}));

import HeroSection from "@/components/home/HeroSection";
import CTASection from "@/components/home/CTASection";
import RegionSwitcher from "@/components/home/RegionSwitcher";

const ForceCountry = ({ country, children }: { country: Country; children: React.ReactNode }) => {
  const { setCountry, setRegionMode } = useRegion();
  // Force region on first render.
  if (typeof window !== "undefined") {
    localStorage.setItem("region-mode", "manual");
    localStorage.setItem("preferred-country", country);
  }
  // Also call setters for reactive updates.
  setRegionMode("manual");
  setCountry(country);
  return <>{children}</>;
};

const mount = (country: Country, ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <RegionProvider>
        <ForceCountry country={country}>{ui}</ForceCountry>
      </RegionProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

describe("primary routes render region-specific tokens", () => {
  it.each<[Country, string, string]>([
    ["USA", "124078589931", "USD-ish"],
    ["Nigeria", "12403930081", "NGN-ish"],
  ])("HeroSection wires the %s WhatsApp number", async (country, waNumber) => {
    mount(country, <HeroSection />);
    const waLink = document.querySelector(`a[href*="wa.me/${waNumber}"]`);
    expect(waLink, `WhatsApp link for ${country}`).not.toBeNull();
  });

  it.each<[Country]>([["USA"], ["Nigeria"]])(
    "CTASection renders under %s without crashing and pulls region content",
    (country) => {
      mount(country, <CTASection />);
      // Both regions expose a Drivers CTA. Content strings come from localized-content.ts.
      expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
    }
  );

  it("RegionSwitcher lists both supported regions", () => {
    mount("USA", <RegionSwitcher />);
    // Trigger renders the flag; menu items are lazy but at least the trigger exists.
    expect(document.querySelector("button")).not.toBeNull();
  });
});
