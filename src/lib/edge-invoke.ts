import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an edge function with in-flight de-duplication and a single retry on
 * cold-start failures (503 / BOOT_ERROR). Several panels poll the same admin
 * functions at once; without coalescing the burst of concurrent invocations can
 * make one worker fail to boot.
 */
const inflight = new Map<string, Promise<EdgeResult<unknown>>>();

const isBootError = (error: unknown) => {
  const msg = String((error as { message?: string } | null)?.message ?? "");
  return /BOOT_ERROR|failed to start|503/i.test(msg);
};

export interface EdgeResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export async function invokeEdge<T = unknown>(
  fn: string,
  body?: Record<string, unknown>,
): Promise<EdgeResult<T>> {
  const key = `${fn}:${JSON.stringify(body ?? {})}`;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<EdgeResult<T>>;

  const run = (async () => {
    let res = await supabase.functions.invoke(fn, { body });
    if (res.error && isBootError(res.error)) {
      await new Promise((r) => setTimeout(r, 1500));
      res = await supabase.functions.invoke(fn, { body });
    }
    return res as EdgeResult<unknown>;
  })().finally(() => inflight.delete(key));

  inflight.set(key, run);
  return run as Promise<EdgeResult<T>>;
}
