/**
 * RentMaikar backend client.
 *
 * Single place the frontend uses to *call* and *listen to* the backend API
 * (https://staging.rentmaikar.com by default). Every request is JSON, carries
 * the current Supabase access token as a Bearer credential, is abortable and
 * time-boxed, and surfaces a normalised { data, error } result so callers never
 * have to unwrap fetch/Response themselves.
 *
 * This is the seam for the eventual frontend/backend separation: today some
 * features still go through edge functions (`invokeEdge`), tomorrow they can be
 * repointed here without touching component code.
 */
import { supabase } from "@/integrations/supabase/client";
import { API_BASE_URL } from "@/lib/api-config";

export interface BackendResult<T> {
  data: T | null;
  error: { message: string; status?: number } | null;
}

export interface BackendRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Extra headers merged over the defaults. */
  headers?: Record<string, string>;
  /** Abort after this many ms (default 20s). */
  timeoutMs?: number;
  /** Skip attaching the Supabase bearer token (public endpoints). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export const backendUrl = (path: string) =>
  `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

async function authHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** Perform a JSON request against the backend API. Never throws. */
export async function backendRequest<T = unknown>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<BackendResult<T>> {
  const {
    method = "GET",
    body,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    anonymous = false,
    signal,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const res = await fetch(backendUrl(path), {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(anonymous ? {} : await authHeader()),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "omit",
      signal: controller.signal,
    });

    const raw = await res.text();
    let parsed: unknown = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }

    if (!res.ok) {
      const message =
        (parsed && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error?: unknown }).error)
          : null) ??
        (typeof parsed === "string" && parsed.trim() ? parsed : null) ??
        `Backend request failed (${res.status})`;
      return { data: null, error: { message, status: res.status } };
    }

    return { data: parsed as T, error: null };
  } catch (err) {
    const aborted = (err as Error)?.name === "AbortError";
    return {
      data: null,
      error: {
        message: aborted
          ? `Backend request timed out after ${timeoutMs}ms`
          : (err as Error)?.message || "Backend unreachable",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export const backendGet = <T = unknown>(path: string, options?: BackendRequestOptions) =>
  backendRequest<T>(path, { ...options, method: "GET" });

export const backendPost = <T = unknown>(
  path: string,
  body?: unknown,
  options?: BackendRequestOptions,
) => backendRequest<T>(path, { ...options, method: "POST", body });

// ── Known backend endpoints ────────────────────────────────────────────────

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
  uptime_seconds: number;
  timestamp: string;
  environment: string;
}

export interface BackendDomains {
  frontend: string;
  backend: string;
  incoming_mail: string;
  outgoing_mail: string;
}

export const getBackendHealth = () =>
  backendGet<BackendHealth>("/api/health", { anonymous: true, timeoutMs: 8000 });

export const getBackendDiagnostics = () =>
  backendGet<Record<string, unknown>>("/api/health/diagnostics", { timeoutMs: 10_000 });

export const getBackendDomains = () =>
  backendGet<BackendDomains>("/api/domains", { anonymous: true, timeoutMs: 8000 });
