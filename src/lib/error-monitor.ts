/**
 * Client-side error monitoring and logging service.
 * Captures unhandled errors, promise rejections, and manual reports.
 * Logs to Supabase for centralized tracking.
 */

import { supabase } from "@/integrations/supabase/client";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ErrorReport {
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const ERROR_BUFFER: ErrorReport[] = [];
const FLUSH_INTERVAL_MS = 10_000;
const MAX_BUFFER_SIZE = 20;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function createReport(
  error: Error | string,
  severity: ErrorSeverity = "medium",
  context?: string,
  metadata?: Record<string, unknown>
): ErrorReport {
  const err = typeof error === "string" ? new Error(error) : error;
  return {
    message: err.message || String(error),
    stack: err.stack?.slice(0, 2000),
    severity,
    context,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

async function flushErrors() {
  if (ERROR_BUFFER.length === 0) return;

  const batch = ERROR_BUFFER.splice(0, MAX_BUFFER_SIZE);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const enriched = batch.map((report) => ({
      ...report,
      userId: user?.id || "anonymous",
    }));

    // Log to admin_audit_log for centralized tracking
    for (const report of enriched) {
      await supabase.from("admin_audit_log").insert({
        admin_id: report.userId || "00000000-0000-0000-0000-000000000000",
        action: "client_error",
        target_table: "client_errors",
        details: {
          message: report.message,
          severity: report.severity,
          context: report.context,
          url: report.url,
          stack: report.stack,
          user_agent: report.userAgent,
          metadata: report.metadata,
        } as any,
      });
    }
  } catch {
    // Silently fail — don't cause more errors from error reporting
    console.warn("[ErrorMonitor] Failed to flush error reports");
  }
}

/** Report an error manually */
export function reportError(
  error: Error | string,
  severity: ErrorSeverity = "medium",
  context?: string,
  metadata?: Record<string, unknown>
) {
  const report = createReport(error, severity, context, metadata);
  ERROR_BUFFER.push(report);

  // Console output for development
  if (import.meta.env.DEV) {
    console.group(`[ErrorMonitor] ${severity.toUpperCase()}`);
    console.error(report.message);
    if (report.context) console.info("Context:", report.context);
    if (report.metadata) console.info("Metadata:", report.metadata);
    console.groupEnd();
  }

  // Flush immediately for critical errors
  if (severity === "critical" || ERROR_BUFFER.length >= MAX_BUFFER_SIZE) {
    flushErrors();
  }
}

/** Initialize global error handlers */
export function initErrorMonitoring() {
  // Unhandled errors
  window.addEventListener("error", (event) => {
    reportError(
      event.error || event.message,
      "high",
      "window.onerror",
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    reportError(error, "high", "unhandledrejection");
  });

  // Performance: long tasks (>50ms)
  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 200) {
            reportError(
              `Long task detected: ${Math.round(entry.duration)}ms`,
              "low",
              "performance.longtask",
              { duration: entry.duration, startTime: entry.startTime }
            );
          }
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      // longtask not supported in all browsers
    }
  }

  // Periodic flush
  flushTimer = setInterval(flushErrors, FLUSH_INTERVAL_MS);

  // Flush on page unload
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushErrors();
    }
  });

  console.info("[ErrorMonitor] Initialized");
}

/** Cleanup monitoring (for testing) */
export function destroyErrorMonitoring() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushErrors();
}
