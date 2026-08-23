import React from "react";
import { it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});
const insert = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: (...a: unknown[]) => insert(...a),
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));
vi.mock("@/lib/user-provisioning", () => ({ ensureAuthUserForApplicant: vi.fn().mockResolvedValue("user-123") }));
vi.mock("@/lib/registration-audit", () => ({ logRegistrationEvent: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, isLoading: false }) }));
vi.mock("@/contexts/RegionContext", () => ({ useRegion: () => ({ region: "usa", currencySymbol: "$", currency: "USD", setRegion: vi.fn(), isLoading: false }) }));
vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));
vi.mock("@/components/home/PricingHintBanner", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

import DriverRegistration from "@/pages/DriverRegistration";

it("debug submit", async () => {
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter><DriverRegistration /></MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
  const type = async (id: string, v: string) => {
    const el = document.getElementById(id) as HTMLInputElement;
    if (!el) throw new Error("missing #" + id);
    await user.clear(el); if (v) await user.type(el, v);
  };
  await type("firstName", "John");
  await type("lastName", "Doe");
  await type("email", "john.driver@example.com");
  await type("password", "SuperSecret123");
  await user.type(screen.getByTestId("driver-phone"), "+12025550123");
  // pick city
  const combos = screen.getAllByRole("combobox");
  await user.click(combos[1]);
  const opt = await screen.findByRole("option", { name: /Washington DC/i });
  await user.click(opt);
  await type("streetAddress", "24 Ademola Street, Ikeja");
  await type("zipCode", "20001");
  await user.click(screen.getByLabelText("Uber"));
  await user.click(screen.getByLabelText(/valid driver'?s? license/i));
  for (const box of screen.getAllByRole("checkbox")) {
    if ((box as HTMLElement).getAttribute("aria-checked") === "true") continue;
    await user.click(box);
  }
  await user.click(screen.getByRole("button", { name: /submit (registration|vehicle for review)/i }));
  await new Promise((r) => setTimeout(r, 1500));
  console.log("INSERT CALLS:", insert.mock.calls.length);
  const errs = Array.from(document.querySelectorAll(".text-destructive")).map((e) => e.textContent);
  console.log("VALIDATION ERRORS:", JSON.stringify(errs));
  const alerts = Array.from(document.querySelectorAll('[role="alert"]')).map((e) => e.textContent);
  console.log("ALERTS:", JSON.stringify(alerts));
}, 30000);
