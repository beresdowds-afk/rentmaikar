/**
 * Per-region audio preferences for the real-time sync worker.
 *
 * Installed PWAs are the main consumer: the app can sit in the background for
 * hours, so an audible cue on a new payment/message is genuinely useful — but
 * only when the user opted in. Defaults are deliberately conservative:
 *
 *   * sound is OFF until the user enables it (no surprise noise on install)
 *   * if the browser has *blocked* notifications we stay off and say why
 *   * volume is per region, because an operator can run US and NG desks side
 *     by side and wants a different loudness for each
 */

export interface RegionSoundPref {
  /** Play a chime when live updates arrive for this region. */
  enabled: boolean;
  /** 0 – 1. */
  volume: number;
}

export interface SoundSettings {
  /** Master switch — off disables every region at once. */
  workerEnabled: boolean;
  /** Suppress sound while the app tab is focused (avoids double-signalling). */
  muteWhenFocused: boolean;
  /** Stay silent outside each region's local contact hours. */
  respectQuietHours: boolean;
  byRegion: Record<string, RegionSoundPref>;
}

/**
 * Region-aware chime behaviour.
 *
 * Each region gets its own two-note motif, default loudness and local contact
 * window, so an operator running more than one desk can tell by ear which
 * region just fired — and so a Lagos alert never rings at 3am Lagos time while
 * the browser happens to sit in New York.
 */
export interface RegionSoundProfile {
  /** Two-note motif (Hz) used for the chime. */
  tones: [number, number];
  defaultVolume: number;
  /** IANA zone the alert hours are evaluated in. */
  timeZone: string;
  /** Local hour the region starts accepting audible alerts (inclusive). */
  startHour: number;
  /** Local hour audible alerts stop (exclusive). */
  endHour: number;
}

export const FALLBACK_SOUND_PROFILE: RegionSoundProfile = {
  tones: [880, 1174.66],
  defaultVolume: 0.5,
  timeZone: "UTC",
  startHour: 8,
  endHour: 21,
};

export const REGION_SOUND_PROFILES: Record<string, RegionSoundProfile> = {
  // Bright, higher motif — matches the 9am–9pm ET contact window.
  USA: {
    tones: [880, 1174.66],
    defaultVolume: 0.5,
    timeZone: "America/New_York",
    startHour: 9,
    endHour: 21,
  },
  // Warmer, lower motif — 8am–8pm WAT contact window.
  Nigeria: {
    tones: [659.25, 880],
    defaultVolume: 0.65,
    timeZone: "Africa/Lagos",
    startHour: 8,
    endHour: 20,
  },
};

export function regionSoundProfile(region: string): RegionSoundProfile {
  return REGION_SOUND_PROFILES[region] ?? FALLBACK_SOUND_PROFILE;
}

const STORAGE_KEY = "rentmaikar.sound-settings.v1";

export const DEFAULT_REGION_PREF: RegionSoundPref = { enabled: false, volume: 0.5 };

/** Starting preference for a region the user has not tuned yet. */
export function regionDefaultPref(region: string): RegionSoundPref {
  return { enabled: false, volume: regionSoundProfile(region).defaultVolume };
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  workerEnabled: false,
  muteWhenFocused: true,
  respectQuietHours: true,
  byRegion: {},
};

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

const clampVolume = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return DEFAULT_REGION_PREF.volume;
  return Math.min(1, Math.max(0, n));
};

/** Current hour (0–23) in the region's own time zone. */
export function regionLocalHour(region: string, now: Date = new Date()): number {
  const { timeZone } = regionSoundProfile(region);
  try {
    const hour = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    }).format(now);
    const parsed = Number(hour);
    return Number.isFinite(parsed) ? parsed % 24 : now.getHours();
  } catch {
    // Unknown zone on an old engine — fall back to device time rather than mute.
    return now.getHours();
  }
}

/** True while the region is inside its local audible-alert window. */
export function isWithinRegionAlertHours(region: string, now: Date = new Date()): boolean {
  const { startHour, endHour } = regionSoundProfile(region);
  const hour = regionLocalHour(region, now);
  // Windows never wrap midnight today, but handle it defensively.
  return startHour <= endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour;
}


export function readSoundSettings(): SoundSettings {
  if (!isBrowser()) return { ...DEFAULT_SOUND_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SOUND_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    const byRegion: Record<string, RegionSoundPref> = {};
    for (const [region, pref] of Object.entries(parsed.byRegion ?? {})) {
      byRegion[region] = {
        enabled: !!(pref as RegionSoundPref)?.enabled,
        volume: clampVolume((pref as RegionSoundPref)?.volume),
      };
    }
    return {
      workerEnabled: !!parsed.workerEnabled,
      muteWhenFocused: parsed.muteWhenFocused !== false,
      respectQuietHours: parsed.respectQuietHours !== false,
      byRegion,
    };

  } catch {
    return { ...DEFAULT_SOUND_SETTINGS };
  }
}

export function writeSoundSettings(settings: SoundSettings): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* private mode / quota — preferences are best-effort */
  }
}

export function regionPref(settings: SoundSettings, region: string): RegionSoundPref {
  return settings.byRegion[region] ?? regionDefaultPref(region);
}


export function setRegionPref(
  settings: SoundSettings,
  region: string,
  patch: Partial<RegionSoundPref>,
): SoundSettings {
  const current = regionPref(settings, region);
  return {
    ...settings,
    byRegion: {
      ...settings.byRegion,
      [region]: {
        enabled: patch.enabled ?? current.enabled,
        volume: clampVolume(patch.volume ?? current.volume),
      },
    },
  };
}

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

/** Read the notification permission without ever prompting. */
export function readNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

/**
 * Whether audio may play right now for a region.
 *
 * Blocked notifications are treated as an explicit "do not disturb": we keep
 * the worker silent rather than routing around the user's browser-level choice.
 * Alerts are also held outside the region's own local contact window, so the
 * device's time zone never decides when a Lagos or US desk gets rung.
 */
export function canPlaySound(
  settings: SoundSettings,
  region: string,
  permission: NotificationPermissionState = readNotificationPermission(),
  now: Date = new Date(),
): boolean {
  if (!settings.workerEnabled) return false;
  if (permission === "denied") return false;
  if (settings.respectQuietHours && !isWithinRegionAlertHours(region, now)) return false;
  return regionPref(settings, region).enabled;
}


/** Effective volume, already gated by {@link canPlaySound}. */
export function effectiveVolume(settings: SoundSettings, region: string): number {
  return clampVolume(regionPref(settings, region).volume);
}
