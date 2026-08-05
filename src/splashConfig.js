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
// ── Which one ships ──────────────────────────────────────────────────────────
// DEFAULT_SPLASH is the build-time answer: what every ordinary player gets.
// Change this one string to change what ships.
//
// On top of that there is a DEVICE-LOCAL override (localStorage), driven by the
// `splash` debug command and the Admin panel → Config tab. That override is for
// comparing the two views on a real device without a rebuild; it affects only
// the browser it was set in and never other players.
//
// WHY DEVICE-LOCAL AND NOT A SERVER FEATURE FLAG: the inline splash mounts on
// every feed impression, for everyone scrolling past. A server flag would mean a
// trpc round trip per impression, and because that answer arrives after first
// paint the feed would visibly render one splash and then swap to the other.
// localStorage is readable synchronously, so the correct splash is the first
// thing painted and the cost stays zero. (Same reason viewportGutter.js persists
// its override locally.) If a global no-redeploy switch is wanted later, the
// place for it is core/featureFlags.ts + a value baked into the post payload at
// submit time, NOT a fetch on the render path.

export const SPLASH_VARIANTS = ['classic', 'court'];

/** What ships to ordinary players. */
export const DEFAULT_SPLASH = 'court';

const STORAGE_KEY = 'fw_inline_splash';
// Fired on the *same* document when the override changes. The native 'storage'
// event only reaches OTHER documents on the origin, so without this the tab that
// made the change would be the one tab that didn't react.
const LOCAL_EVENT = 'fw-inline-splash-change';

const isValid = (v) => typeof v === 'string' && SPLASH_VARIANTS.includes(v);

/** The device-local override, or null when following DEFAULT_SPLASH. */
export function readSplashOverride() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isValid(raw) ? raw : null;
  } catch {
    // Storage blocked (private mode / partitioned third-party frame).
    return null;
  }
}

/**
 * Set the override. Pass null to clear it and return to DEFAULT_SPLASH.
 * Returns the variant now in effect. Throws on an unknown name so a typo in
 * the debug console reports itself instead of silently doing nothing.
 */
export function setSplashOverride(variant) {
  if (variant != null && !isValid(variant)) {
    throw new Error(`unknown splash "${variant}" — expected ${SPLASH_VARIANTS.join(' | ')}`);
  }
  try {
    if (variant == null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, variant);
  } catch {
    /* storage blocked — the notify below still updates this document */
  }
  try {
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
  } catch {
    /* non-DOM host */
  }
  return getInlineSplash();
}

/** The variant to render right now: override if set, else the shipped default. */
export function getInlineSplash() {
  return readSplashOverride() ?? DEFAULT_SPLASH;
}

/** Everything behind the current decision, for the `splash` command's report. */
export function describeSplash() {
  const override = readSplashOverride();
  return {
    applied: override ?? DEFAULT_SPLASH,
    override,
    default: DEFAULT_SPLASH,
    source: override ? 'override (this device)' : 'default (build)',
  };
}

/**
 * Subscribe to override changes. Fires for changes made in this document AND in
 * any other document on the origin — which is what makes toggling from the
 * expanded game view update an already-open inline/post view live, instead of
 * waiting for the next feed impression.
 *
 * Returns an unsubscribe function.
 */
export function subscribeSplash(onChange) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    // Ignore unrelated keys so we don't re-render on every localStorage write
    // the app makes (audio prefs, gutter, ...).
    if (e && e.type === 'storage' && e.key && e.key !== STORAGE_KEY) return;
    onChange(getInlineSplash());
  };
  window.addEventListener('storage', handler);
  window.addEventListener(LOCAL_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(LOCAL_EVENT, handler);
  };
}
