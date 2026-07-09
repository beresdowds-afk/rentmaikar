import type { Country, RegionMode } from "@/contexts/RegionContext";

const COUNTRY_COOKIE = "preferred-country";
const MODE_COOKIE = "region-mode";
const ONE_YEAR = 60 * 60 * 24 * 365;

const isBrowser = () => typeof document !== "undefined";

const readCookie = (name: string): string | null => {
  if (!isBrowser()) return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
};

const writeCookie = (name: string, value: string) => {
  if (!isBrowser()) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax${secure}`;
};

export const getStoredCountry = (): Country | null => {
  const fromLocal =
    isBrowser() ? window.localStorage.getItem(COUNTRY_COOKIE) : null;
  const fromCookie = readCookie(COUNTRY_COOKIE);
  const value = fromLocal || fromCookie;
  return value === "USA" || value === "Nigeria" ? value : null;
};

export const getStoredMode = (): RegionMode | null => {
  const fromLocal =
    isBrowser() ? window.localStorage.getItem(MODE_COOKIE) : null;
  const fromCookie = readCookie(MODE_COOKIE);
  const value = fromLocal || fromCookie;
  return value === "auto" || value === "manual" ? value : null;
};

export const persistCountry = (country: Country) => {
  if (isBrowser()) window.localStorage.setItem(COUNTRY_COOKIE, country);
  writeCookie(COUNTRY_COOKIE, country);
};

export const persistMode = (mode: RegionMode) => {
  if (isBrowser()) window.localStorage.setItem(MODE_COOKIE, mode);
  writeCookie(MODE_COOKIE, mode);
};
