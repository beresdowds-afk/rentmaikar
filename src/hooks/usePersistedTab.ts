import { useCallback, useEffect, useMemo, useRef } from 'react';
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

  // Mirrors the params we have written this tick. Two `setTab` calls in one
  // event handler (portal + tab) must merge instead of clobbering each other,
  // and `location.search` has not re-rendered yet at that point.
  const paramsRef = useRef<URLSearchParams>(new URLSearchParams(location.search));
  paramsRef.current = new URLSearchParams(location.search);

  const writeUrl = useCallback(
    (next: string, replace: boolean) => {
      const params = paramsRef.current;
      if (params.get(paramKey) === next) return;
      params.set(paramKey, next);
      pendingRef.current = new URLSearchParams(params);
      navigate(
        { pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash },
        { replace },
      );
    },
    [navigate, location.pathname, location.hash, paramKey],
  );

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
