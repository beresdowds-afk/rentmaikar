import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { RegionProvider, useRegion, type Country } from "@/contexts/RegionContext";

// Mock the Supabase client so tests don't hit the network.
vi.mock("@/integrations/supabase/client", () => {
  const chain = {
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
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
    },
  };
});

// Force IP detection to a known value per-test.
vi.mock("@/lib/ip-geolocation", () => ({
  detectCountryFromIP: vi.fn(async () => ({
    country: "USA" as Country,
    countryCode: "US",
    detected: true,
  })),
  detectCountryFromTimezone: () => "USA" as Country,
}));

import * as geo from "@/lib/ip-geolocation";

const Probe = () => {
  const r = useRegion();
  return (
    <div>
      <span data-testid="country">{r.country}</span>
      <span data-testid="currency">{r.currency}</span>
      <span data-testid="symbol">{r.currencySymbol}</span>
      <span data-testid="phone">{r.phonePrefix}</span>
      <button onClick={() => r.setRegionMode("manual")}>manual</button>
      <button onClick={() => r.setCountry("Nigeria")}>ng</button>
      <button onClick={() => r.setCountry("USA")}>us</button>
    </div>
  );
};

const renderApp = () =>
  render(
    <RegionProvider>
      <Probe />
    </RegionProvider>
  );

beforeEach(() => {
  localStorage.clear();
  document.cookie
    .split(";")
    .forEach((c) => (document.cookie = c.trim().split("=")[0] + "=; Max-Age=0; Path=/"));
  vi.clearAllMocks();
});

describe("RegionContext", () => {
  it("renders US region tokens on default detection", async () => {
    (geo.detectCountryFromIP as any).mockResolvedValueOnce({
      country: "USA",
      countryCode: "US",
      detected: true,
    });
    renderApp();
    await waitFor(() => {
      expect(screen.getByTestId("country").textContent).toBe("USA");
      expect(screen.getByTestId("currency").textContent).toBe("USD");
      expect(screen.getByTestId("symbol").textContent).toBe("$");
      expect(screen.getByTestId("phone").textContent).toBe("+1");
    });
  });

  it("auto-detects Nigeria and renders NGN tokens consistently", async () => {
    (geo.detectCountryFromIP as any).mockResolvedValueOnce({
      country: "Nigeria",
      countryCode: "NG",
      detected: true,
    });
    renderApp();
    await waitFor(() => {
      expect(screen.getByTestId("country").textContent).toBe("Nigeria");
      expect(screen.getByTestId("currency").textContent).toBe("NGN");
      expect(screen.getByTestId("symbol").textContent).toBe("₦");
      expect(screen.getByTestId("phone").textContent).toBe("+234");
    });
  });

  it("persists manual country selection to localStorage and cookies across mounts", async () => {
    const { unmount } = renderApp();
    await act(async () => {
      screen.getByText("manual").click();
      screen.getByText("ng").click();
    });
    expect(localStorage.getItem("preferred-country")).toBe("Nigeria");
    expect(document.cookie).toContain("preferred-country=Nigeria");
    unmount();

    // Prevent IP override on re-mount
    (geo.detectCountryFromIP as any).mockResolvedValueOnce({
      country: "USA",
      countryCode: "US",
      detected: false,
    });
    renderApp();
    // Manual mode preserved
    expect(localStorage.getItem("region-mode")).toBe("manual");
    await waitFor(() =>
      expect(screen.getByTestId("country").textContent).toBe("Nigeria")
    );
  });

  it("falls back to safe default when IP detection fails", async () => {
    (geo.detectCountryFromIP as any).mockRejectedValueOnce(new Error("offline"));
    renderApp();
    await waitFor(() => {
      // Timezone mock returns USA, IP failure keeps it
      expect(["USA", "Nigeria"]).toContain(screen.getByTestId("country").textContent);
      expect(screen.getByTestId("country").textContent).toBe("USA");
    });
  });
});
