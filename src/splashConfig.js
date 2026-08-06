// ── Inline (feed) splash selector ────────────────────────────────────────────
//
// Which component renders inside the post/feed view (App.jsx, isInline branch).
//
//   'classic' → SplashScreen.jsx  — the original galaxy + bubble-court splash
//   'court'   → SplashCourt.jsx   — the debug-court sandbox (WOLVES vs HAWKS)
//                                   running the real testGamePlay match loop.
//                                   See ATTRACT in that file for live vs static.
//
// Both components render into the same shared <svg viewBox="0 0 ZOOM_W TOTAL_H">
// and both let a tap bubble up to the root tryExpand() handler that loads
// game.html, so they are freely interchangeable.
//
// A verbatim copy of the original splash also lives in backups/ at the repo
// root, in case SplashScreen.jsx itself is ever edited.
//
// ── Resolution order (highest wins) ─────────────────────────────────────────
//   1. DEVICE OVERRIDE   localStorage, set by the `splash` debug command or the
//                        admin panel's "preview on this device" control. Affects
//                        only the browser it was set in. For A/B-ing on a real
//                        device without touching what players see.
//   2. GLOBAL SETTING    server-side, set by an admin (AdminOverlay → Config).
//                        This is what EVERY player gets. Stored in redis
//                        (server/core/inlineSplash.ts) and mirrored into
//                        localStorage here so it can be read synchronously.
//   3. DEFAULT_SPLASH    the build-time answer (shared/splash.ts).
//
// ── Why the global value is cached locally ──────────────────────────────────
// The inline splash mounts on every feed impression, for everyone scrolling
// past. Blocking first paint on a trpc round trip would mean a blank cell in
// the feed, and painting first then applying the answer would visibly swap one
// splash for the other. So: paint the CACHED global answer synchronously (zero
// cost, correct for every impression after the first), fire the query once in
// the background, and write the result back to the cache. The only visible swap
// is the very first impression after an admin changes the setting — which is
// exactly the case where a swap is the honest thing to show.
//
// The fetch itself lives in App.jsx (next to config.getFlags) so this module
// stays free of network imports; it calls applyGlobalSplash() with the answer.

import { SPLASH_VARIANTS, DEFAULT_SPLASH, isSplashVariant } from './shared/splash';

export { SPLASH_VARIANTS, DEFAULT_SPLASH };

const STORAGE_KEY = 'fw_inline_splash';        // layer 1: this device only
const GLOBAL_CACHE_KEY = 'fw_inline_splash_global'; // layer 2: cached server answer
// Fired on the *same* document when anything changes. The native 'storage'
// event only reaches OTHER documents on the origin, so without this the tab that
// made the change would be the one tab that didn't react.
const LOCAL_EVENT = 'fw-inline-splash-change';

const WATCHED_KEYS = [STORAGE_KEY, GLOBAL_CACHE_KEY];

const read = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return isSplashVariant(raw) ? raw : null;
  } catch {
    // Storage blocked (private mode / partitioned third-party frame).
    return null;
  }
};

const write = (key, value) => {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked — the notify below still updates this document */
  }
};

const notify = () => {
  try {
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
  } catch {
    /* non-DOM host */
  }
};

/** Layer 1: the device-local override, or null when not set. */
export function readSplashOverride() {
  return read(STORAGE_KEY);
}

/** Layer 2: last known global setting, or null if never fetched / cleared. */
export function readGlobalSplash() {
  return read(GLOBAL_CACHE_KEY);
}

/**
 * Set the device-local override. Pass null to clear it and fall back to the
 * global setting. Returns the variant now in effect. Throws on an unknown name
 * so a typo in the debug console reports itself instead of silently doing
 * nothing.
 */
export function setSplashOverride(variant) {
  if (variant != null && !isSplashVariant(variant)) {
    throw new Error(`unknown splash "${variant}" — expected ${SPLASH_VARIANTS.join(' | ')}`);
  }
  write(STORAGE_KEY, variant);
  notify();
  return getInlineSplash();
}

/**
 * Record the global setting fetched from (or just written to) the server.
 * Pass null when the server reports no override, so this device stops using a
 * stale cached value and follows DEFAULT_SPLASH again.
 *
 * Called by App.jsx on boot and by the admin panel right after a successful
 * mutation, which is what makes an already-open post view swap live instead of
 * waiting for the next impression.
 */
export function applyGlobalSplash(variant) {
  const next = isSplashVariant(variant) ? variant : null;
  if (next === readGlobalSplash()) return getInlineSplash(); // no-op, no re-render
  write(GLOBAL_CACHE_KEY, next);
  notify();
  return getInlineSplash();
}

/** The variant to render right now. */
export function getInlineSplash() {
  return readSplashOverride() ?? readGlobalSplash() ?? DEFAULT_SPLASH;
}

/** Everything behind the current decision, for the `splash` command's report. */
export function describeSplash() {
  const override = readSplashOverride();
  const global = readGlobalSplash();
  return {
    applied: override ?? global ?? DEFAULT_SPLASH,
    override,
    global,
    default: DEFAULT_SPLASH,
    // A device override MASKS the global setting — the single most confusing
    // state there is ("admin flipped it and nothing happened"), so name it.
    masked: override != null && global != null && override !== global,
    source: override
      ? 'override (this device)'
      : global
        ? 'global (admin)'
        : 'default (build)',
  };
}

/**
 * Subscribe to changes. Fires for changes made in this document AND in any
 * other document on the origin.
 *
 * Returns an unsubscribe function.
 */
export function subscribeSplash(onChange) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    // Ignore unrelated keys so we don't re-render on every localStorage write
    // the app makes (audio prefs, gutter, ...).
    if (e && e.type === 'storage' && e.key && !WATCHED_KEYS.includes(e.key)) return;
    onChange(getInlineSplash());
  };
  window.addEventListener('storage', handler);
  window.addEventListener(LOCAL_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(LOCAL_EVENT, handler);
  };
}
