import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Single source of truth for a page-level tab/feature selection: the URL.
 *
 * The active destination is *derived* from `?tab=...` rather than mirrored into
 * component state. Mirroring it caused a race — a click set local state, an
 * effect then read the not-yet-updated `location.search` and reset the
 * selection back to the previous feature (which is why the dashboard snapped
 * back to the Unified Inbox). Deriving removes the second source of truth, so
 * refresh, deep links and browser back/forward all stay correct.
 *
 * sessionStorage is only a fallback for the very first visit with no param.
 */

/**
 * Search string written during the current tick, before React has re-rendered
 * with the new location. Shared across hook instances so a handler that sets
 * two params (portal + tab) merges them instead of clobbering the first write.
 */
const pendingSearch = new Map<string, string>();

export function usePersistedTab(defaultTab: string, paramKey = 'tab') {
  const location = useLocation();
  const navigate = useNavigate();
  const storageKey = `tab:${location.pathname}:${paramKey}`;

  const fromUrl = useMemo(
    () => new URLSearchParams(location.search).get(paramKey),
    [location.search, paramKey],
  );

  const remembered = useMemo(() => {
    if (fromUrl) return null;
    try {
      return sessionStorage.getItem(storageKey);
    } catch {
      return null;
    }
    // storageKey changes with the route, which is exactly when we want to re-read.
  }, [fromUrl, storageKey]);

  const tab = fromUrl ?? remembered ?? defaultTab;

  const writeUrl = useCallback(
    (next: string, replace: boolean) => {
      const base = pendingSearch.get(location.pathname) ?? location.search;
      const params = new URLSearchParams(base);
      if (params.get(paramKey) === next) return;
      params.set(paramKey, next);
      const search = `?${params.toString()}`;
      pendingSearch.set(location.pathname, search);
      navigate({ pathname: location.pathname, search, hash: location.hash }, { replace });
    },
    [navigate, location.pathname, location.search, location.hash, paramKey],
  );

  // Once the router has applied our write, stop shadowing the real location so
  // browser back/forward and external links stay authoritative.
  useEffect(() => {
    if (pendingSearch.get(location.pathname) === location.search) {
      pendingSearch.delete(location.pathname);
    }
  }, [location.pathname, location.search]);

  // Make the implicit default explicit in the URL (replace: never adds history).
  useEffect(() => {
    if (!fromUrl) writeUrl(tab, true);
  }, [fromUrl, tab, writeUrl]);

  // Remember the last destination for the next visit to this route.
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, tab);
    } catch {
      /* storage unavailable — the URL still carries the state */
    }
  }, [storageKey, tab]);

  // Push, so browser Back walks the feature history instead of leaving the page.
  const setTab = useCallback((next: string) => writeUrl(next, false), [writeUrl]);

  return [tab, setTab] as const;
}
