// Shared idempotency + retry helpers for payment provider webhooks.
// Guarantees that duplicate provider callbacks never re-process a payment,
// never create duplicate receipts, and never re-mark invoices paid.
//
// The DB-level guarantees remain the primary defense:
//   * receipts.idempotency_key + receipts.payment_id  → UNIQUE
//   * invoices.status transitions gated inside auto_generate_receipt_from_payment
//   * payment_webhook_events (provider, external_event_id) → UNIQUE
//
// This helper adds the webhook-layer contract: log every attempt, short-circuit
// obvious duplicates, and give callers a small retry primitive for transient
// downstream failures (network, Supabase rate-limit) so we never leave a
// completed payment without a receipt just because one round-trip flaked.
//
// deno-lint-ignore-file no-explicit-any

export interface IdempotencyRecordInput {
  provider: "paystack" | "paypal" | "opay";
  eventType?: string | null;
  externalEventId?: string | null;
  reference?: string | null;
  signatureValid?: boolean | null;
  paymentId?: string | null;
  invoiceId?: string | null;
  receiptId?: string | null;
  payload: unknown;
}

export interface IdempotencyResult {
  duplicate: boolean;
  eventRowId: string | null;
}

/**
 * Insert the webhook event row and detect duplicates via the
 * (provider, external_event_id) unique index. Duplicates are returned with
 * duplicate=true so the caller can short-circuit processing.
 */
export async function recordWebhookEvent(
  supabase: any,
  input: IdempotencyRecordInput,
): Promise<IdempotencyResult> {
  const row: Record<string, unknown> = {
    provider: input.provider,
    event_type: input.eventType ?? null,
    external_event_id: input.externalEventId ?? null,
    reference: input.reference ?? null,
    status: input.signatureValid === false ? "unverified" : (input.signatureValid ? "verified" : "received"),
    signature_valid: input.signatureValid ?? null,
    payment_id: input.paymentId ?? null,
    invoice_id: input.invoiceId ?? null,
    receipt_id: input.receiptId ?? null,
    payload: input.payload,
  };

  const { data, error } = await supabase
    .from("payment_webhook_events")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (!error && data?.id) return { duplicate: false, eventRowId: data.id };

  // Unique-violation on (provider, external_event_id) → duplicate delivery.
  const code = (error as any)?.code;
  const message = String((error as any)?.message ?? "");
  const isDuplicate =
    !!input.externalEventId &&
    (code === "23505" || /duplicate key value|unique constraint/i.test(message));

  if (isDuplicate) {
    const { data: existing } = await supabase
      .from("payment_webhook_events")
      .select("id")
      .eq("provider", input.provider)
      .eq("external_event_id", input.externalEventId)
      .maybeSingle();
    return { duplicate: true, eventRowId: existing?.id ?? null };
  }

  // Unknown insert error — do not block webhook processing, but flag it.
  console.error(`[webhook-idempotency] insert failed provider=${input.provider}`, error);
  return { duplicate: false, eventRowId: null };
}

/**
 * A payment must only be marked completed once. Setting status=completed on an
 * already-completed row is a no-op at the DB trigger layer, but we also skip
 * the update round-trip when possible.
 */
export async function markPaymentCompletedIdempotent(
  supabase: any,
  paymentId: string,
): Promise<{ alreadyCompleted: boolean }> {
  const { data: current } = await supabase
    .from("payments")
    .select("status")
    .eq("id", paymentId)
    .maybeSingle();
  if (current?.status === "completed") return { alreadyCompleted: true };

  await supabase
    .from("payments")
    .update({ status: "completed", processed_at: new Date().toISOString(), failure_reason: null })
    .eq("id", paymentId)
    .neq("status", "completed"); // conditional guard
  return { alreadyCompleted: false };
}

/**
 * Small retry primitive for downstream calls (email, push, sub-invoke).
 * Never throws — final failure is logged and swallowed so the webhook still
 * returns 200 and the provider does not retry the whole event.
 */
export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T | null> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseDelayMs ?? 250;
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        const wait = base * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  console.error(`[withRetry] gave up after ${attempts} attempts: ${label}`, lastErr);
  return null;
}
