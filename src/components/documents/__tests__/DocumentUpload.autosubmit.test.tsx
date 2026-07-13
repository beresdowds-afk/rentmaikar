// Component-level regression test for the DocumentUpload auto-submit flow.
//
// Verifies the observable state machine:
//   completionPercent === 100  →  submitState 'submitting' → 'submitted' | 'error'
//
// We render `DocumentUpload` inside a QueryClientProvider with mocked auth +
// region contexts and stub the two Supabase calls it makes.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// --- mocks (must be before the SUT import) ------------------------------
const invokeMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: any[]) => fromMock(...a),
    functions: { invoke: (...a: any[]) => invokeMock(...a) },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }) },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-uuid", email: "d@example.com" } }),
}));

vi.mock("@/contexts/RegionContext", () => ({
  useRegion: () => ({ country: "USA" }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

// After mocks:
import { DocumentUpload } from "@/components/documents/DocumentUpload";

function docsForRequiredUS() {
  return [
    "driver_license", "national_id", "rideshare_approval",
  ].map((t, i) => ({
    id: `doc-${i}`,
    user_id: "test-user-uuid",
    document_type: t,
    document_category: "identification",
    file_path: `path/${t}`,
    file_name: `${t}.pdf`,
    file_size: 1024,
    mime_type: "application/pdf",
    status: "pending",
    rejection_reason: null,
    vehicle_id: null,
    expires_at: null,
    created_at: new Date().toISOString(),
  }));
}

function buildFromMock(docs: any[]) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(async () => ({ data: docs, error: null })),
  };
  return chain;
}

function renderComponent() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DocumentUpload userType="driver" />
    </QueryClientProvider>,
  );
}

describe("DocumentUpload auto-submit", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    fromMock.mockReset();
  });

  it("transitions submitting → submitted when required docs are 100%", async () => {
    fromMock.mockReturnValue(buildFromMock(docsForRequiredUS()));
    let resolveInvoke!: (v: any) => void;
    invokeMock.mockReturnValue(new Promise((r) => { resolveInvoke = r; }));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("auto-submit-status")).toBeInTheDocument();
    });
    expect(screen.getByText(/Submitting your application/i)).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith("auto-submit-for-review", { body: {} });

    resolveInvoke({ data: { ok: true, already_submitted: false, status: "under_review" }, error: null });

    await waitFor(() => {
      expect(screen.getByText(/verification report has been submitted/i)).toBeInTheDocument();
    });
  });

  it("shows error alert + Retry when auto-submit-for-review fails", async () => {
    fromMock.mockReturnValue(buildFromMock(docsForRequiredUS()));
    invokeMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Auto-submit failed: boom/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });

  it("does NOT auto-submit when required docs are incomplete", async () => {
    // Only 1 of 3 required docs
    fromMock.mockReturnValue(buildFromMock(docsForRequiredUS().slice(0, 1)));
    invokeMock.mockResolvedValue({ data: {}, error: null });

    renderComponent();

    // Wait for the card to finish loading (Loader disappears)
    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).toBeInTheDocument();
    });
    // Auto-submit alert should never appear.
    expect(screen.queryByTestId("auto-submit-status")).not.toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalledWith("auto-submit-for-review", expect.anything());
  });
});
