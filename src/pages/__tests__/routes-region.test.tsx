import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useEffect } from "react";
import { RegionProvider, useRegion, type Country } from "@/contexts/RegionContext";

// -----------------------------------------------------------------------------
// Mock Supabase
// -----------------------------------------------------------------------------
vi.mock("@/integrations/supabase/client", () => {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: null, error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    then: (resolve: any) =>
      resolve({ data: null, error: null }),
  };

  const realtimeChannel: any = {
    on: vi.fn(() => realtimeChannel),
    subscribe: vi.fn(() => realtimeChannel),
    unsubscribe: vi.fn(),
  };

  return {
    supabase: {
      from: vi.fn(() => chain),
      rpc: vi.fn(async () => ({ data: null, error: null })),
      functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },

      // ----- Realtime -----
      channel: vi.fn(() => realtimeChannel),
      removeChannel: vi.fn(),
      removeAllChannels: vi.fn(),

      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null },
          error: null,
        })),

        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        })),
      },
    },
  };
});

// -----------------------------------------------------------------------------
// Mock geolocation
// -----------------------------------------------------------------------------
vi.mock("@/lib/ip-geolocation", () => ({
  detectCountryFromIP: vi.fn(async () => ({
    country: "USA",
    countryCode: "US",
    detected: false,
  })),
  detectCountryFromTimezone: vi.fn(() => "USA"),
}));

// -----------------------------------------------------------------------------
// Mock contexts
// -----------------------------------------------------------------------------
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    userRole: null,
    signOut: async () => {},
    isLoading: false,
  }),
}));

vi.mock("@/contexts/UserTypeContext", () => ({
  useUserType: () => ({
    userType: "driver",
    setUserType: vi.fn(),
  }),
}));

import HeroSection from "@/components/home/HeroSection";
import CTASection from "@/components/home/CTASection";
import RegionSwitcher from "@/components/home/RegionSwitcher";
import { TestProviders } from "@/test/providers";

// -----------------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------------
const ForceCountry = ({
  country,
  children,
}: {
  country: Country;
  children: React.ReactNode;
}) => {
  const { setCountry, setRegionMode } = useRegion();

  useEffect(() => {
    localStorage.setItem("region-mode", "manual");
    localStorage.setItem("preferred-country", country);

    setRegionMode("manual");
    setCountry(country);
  }, [country, setCountry, setRegionMode]);

  return <>{children}</>;
};

const mount = (
  country: Country,
  ui: React.ReactNode
) =>
  render(
    <TestProviders>
    <MemoryRouter>
      <RegionProvider>
        <ForceCountry country={country}>
          {ui}
        </ForceCountry>
      </RegionProvider>
    </MemoryRouter>
    </TestProviders>
  );

beforeEach(() => {
  localStorage.clear();
  cleanup();
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------
describe("primary routes render region-specific tokens", () => {
  it.each<[Country, string]>([
    ["USA", "124078589931"],
    ["Nigeria", "12403930081"],
  ])(
    "HeroSection wires the %s WhatsApp number",
    (country, waNumber) => {
      mount(country, <HeroSection />);

      const waLink = document.querySelector(
        `a[href*="wa.me/${waNumber}"]`
      );

      expect(waLink).not.toBeNull();
    }
  );

  it.each<[Country]>([
    ["USA"],
    ["Nigeria"],
  ])(
    "CTASection renders correctly for %s",
    (country) => {
      mount(country, <CTASection />);

      expect(
        screen.getAllByRole("link").length
      ).toBeGreaterThan(0);
    }
  );

  it("RegionSwitcher renders", () => {
    mount("USA", <RegionSwitcher />);

    expect(
      screen.getByRole("button")
    ).toBeInTheDocument();
  });
});
