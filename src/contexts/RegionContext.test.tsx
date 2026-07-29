  import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { RegionProvider, useRegion, type Country } from "@/contexts/RegionContext";

// -----------------------------------------------------------------------------
// Mock Supabase
// -----------------------------------------------------------------------------
vi.mock("@/integrations/supabase/client", () => {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: null, error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    then: (resolve: any) =>
      resolve({ data: null, error: null }),
  };

  const realtimeChannel = {
    on: vi.fn(() => realtimeChannel),
    subscribe: vi.fn(() => realtimeChannel),
    unsubscribe: vi.fn(),
  };

  return {
    supabase: {
      from: vi.fn(() => chain),

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
// Mock IP detection
// -----------------------------------------------------------------------------
vi.mock("@/lib/ip-geolocation", () => ({
  detectCountryFromIP: vi.fn(async () => ({
    country: "USA" as Country,
    countryCode: "US",
    detected: true,
  })),
  detectCountryFromTimezone: vi.fn(() => "USA" as Country),
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

      <button onClick={() => r.setRegionMode("manual")}>
        manual
      </button>

      <button onClick={() => r.setCountry("Nigeria")}>
        ng
      </button>

      <button onClick={() => r.setCountry("USA")}>
        us
      </button>
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
    .forEach((cookie) => {
      document.cookie =
        cookie.trim().split("=")[0] +
        "=; Max-Age=0; Path=/";
    });

  vi.clearAllMocks();
});

describe("RegionContext", () => {
  it("renders US region tokens on default detection", async () => {
    vi.mocked(geo.detectCountryFromIP).mockResolvedValueOnce({
      country: "USA",
      countryCode: "US",
      detected: true,
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId("country")).toHaveTextContent("USA");
      expect(screen.getByTestId("currency")).toHaveTextContent("USD");
      expect(screen.getByTestId("symbol")).toHaveTextContent("$");
      expect(screen.getByTestId("phone")).toHaveTextContent("+1");
    });
  });

  it("auto-detects Nigeria and renders NGN tokens consistently", async () => {
    vi.mocked(geo.detectCountryFromIP).mockResolvedValueOnce({
      country: "Nigeria",
      countryCode: "NG",
      detected: true,
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId("country")).toHaveTextContent("Nigeria");
      expect(screen.getByTestId("currency")).toHaveTextContent("NGN");
      expect(screen.getByTestId("symbol")).toHaveTextContent("₦");
      expect(screen.getByTestId("phone")).toHaveTextContent("+234");
    });
  });

  it("persists manual country selection across mounts", async () => {
    vi.mocked(geo.detectCountryFromIP).mockResolvedValueOnce({
      country: "USA",
      countryCode: "US",
      detected: true,
    });

    const { unmount } = renderApp();

    await waitFor(() =>
      expect(screen.getByTestId("country")).toHaveTextContent("USA")
    );

    await act(async () => {
      screen.getByText("manual").click();
      screen.getByText("ng").click();
    });

    expect(localStorage.getItem("preferred-country")).toBe("Nigeria");
    expect(document.cookie).toContain("preferred-country=Nigeria");

    unmount();

    vi.mocked(geo.detectCountryFromIP).mockResolvedValueOnce({
      country: "USA",
      countryCode: "US",
      detected: true,
    });

    renderApp();

    expect(localStorage.getItem("region-mode")).toBe("manual");

    await waitFor(() =>
      expect(screen.getByTestId("country")).toHaveTextContent("Nigeria")
    );
  });

  it("falls back safely when IP detection fails", async () => {
    vi.mocked(geo.detectCountryFromIP).mockRejectedValueOnce(
      new Error("offline")
    );

    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId("country")).toHaveTextContent("USA");
    });
  });
});
