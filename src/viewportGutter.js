/*
 * Bottom-gutter measurement for the mobile lobby nav.
 *
 * THE PROBLEM
 * -----------
 * On Reddit mobile web the game runs inside a cross-origin iframe. Reddit sizes
 * that iframe taller than the visible screen, so the bottom strip of our layout
 * (the .bnav row) is rendered *behind* the phone's gesture/nav bar. Measured on
 * device: nav.bottom === window.innerHeight === visualViewport.height === 919,
 * i.e. the layout is perfectly correct INSIDE the iframe. Nothing internal is
 * overflowing, so there is no CSS-only fix.
 *
 * env(safe-area-inset-bottom) reads 0 here: the iframe is not the viewport-edge
 * element, so viewport-fit=cover has nothing to report to the child document.
 * @devvit/client exposes no safe-area / dimensions API either, so there is no
 * official channel for the parent to tell us the occluded height.
 *
 * WHAT WE CAN STILL MEASURE
 * -------------------------
 * window.screen is readable across origins. screen.availHeight excludes OS
 * chrome (the gesture bar) on the platforms that report it, so
 *
 *     innerHeight - screen.availHeight
 *
 * is a real measurement of how far our viewport extends past the usable screen,
 * not a guess.
 *
 * WHEN BOTH MEASUREMENTS READ ZERO
 * --------------------------------
 * Measured on a Pixel-class Android Chrome inside Reddit: env=0, and
 * screen.availHeight (960) === screen.height (960), so the delta term is 0 too
 * -- Chrome reports no OS chrome at all. innerHeight (919) is actually SHORTER
 * than the screen, so the occlusion is happening in the parent's layout where a
 * cross-origin child has no visibility. Both automatic signals are blind.
 *
 * For that specific shape -- cross-origin iframe, coarse pointer, real touch,
 * phone-sized viewport -- we fall back to a fixed MOBILE_IFRAME_FALLBACK. This
 * is a heuristic, not a measurement, and it is deliberately gated so it cannot
 * fire on desktop, in Farnsworth's preview (Electron reports pointer:fine and
 * maxTouchPoints 0), or in any non-iframed context. Those hosts keep computing
 * 0 and stay byte-identical to the pre-gutter behaviour.
 *
 * RESULT
 * ------
 * We publish the value as --fw-bottom-gutter on <html>. lobby.css consumes it
 * with an env() fallback, so if this module never runs the previous behaviour is
 * unchanged. `gutter <px>` / `gutter auto` overrides everything below.
 */

const STORAGE_KEY = 'fw_bottom_gutter';
const CSS_VAR = '--fw-bottom-gutter';
const MAX_GUTTER = 200;

/*
 * Confirmed on-device: 24 and 48 still clipped the nav, 72 cleared it. 72 is
 * therefore the smallest *tested* value that works, not a proven minimum -- the
 * true occlusion is somewhere in (48, 72]. Erring high only floats the nav a
 * little higher on devices that need less; erring low reproduces the bug.
 */
const MOBILE_IFRAME_FALLBACK = 72;
const PHONE_MAX_WIDTH = 900;

/** Measure env(safe-area-inset-bottom) by laying out a real element. */
function readEnvInset() {
  try {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;left:-9999px;bottom:0;width:1px;' +
      'height:env(safe-area-inset-bottom,0px);pointer-events:none;';
    document.body.appendChild(probe);
    const h = probe.getBoundingClientRect().height;
    probe.remove();
    return Number.isFinite(h) ? h : 0;
  } catch {
    return 0;
  }
}

/** How far our viewport extends past the OS-usable screen area. */
function readScreenDelta() {
  try {
    const avail = window.screen && window.screen.availHeight;
    if (!avail || !Number.isFinite(avail)) return 0;
    return Math.max(0, window.innerHeight - avail);
  } catch {
    return 0;
  }
}

/** True when we're rendered inside a frame we can't see out of. */
function isIframed() {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access threw -- which itself means we're framed.
    return true;
  }
}

/**
 * Phone-shaped touch device, as opposed to desktop Chrome or Farnsworth's
 * Electron preview (pointer:fine, maxTouchPoints 0).
 */
function isTouchPhone() {
  try {
    const coarse =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    const touch = (navigator.maxTouchPoints ?? 0) > 0;
    const narrow = window.innerWidth <= PHONE_MAX_WIDTH;
    return coarse && touch && narrow;
  } catch {
    return false;
  }
}

/**
 * The heuristic of last resort. Only consulted when both real measurements
 * come back 0 AND we're in the exact context where they're known to be blind.
 */
function readFallback() {
  return isIframed() && isTouchPhone() ? MOBILE_IFRAME_FALLBACK : 0;
}

/** Manual override, persisted so it survives reloads during on-device tuning. */
export function readOverride() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null || raw === '' || raw === 'auto') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Set the override. Pass null/'auto' to clear it and return to measurement.
 * Returns the newly applied gutter so callers can log it.
 */
export function setOverride(px) {
  try {
    if (px == null || px === 'auto') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(px));
  } catch {
    /* storage blocked (private mode) -- the in-memory apply below still works */
  }
  return applyGutter();
}

/** Everything that fed the current decision, for the `version` admin command. */
export function describeGutter() {
  const envInset = readEnvInset();
  const screenDelta = readScreenDelta();
  const measured = Math.max(envInset, screenDelta);
  const fallback = measured > 0 ? 0 : readFallback();
  const override = readOverride();
  return {
    envInset,
    screenDelta,
    fallback,
    iframed: isIframed(),
    touchPhone: isTouchPhone(),
    override,
    source:
      override != null ? 'override' : measured > 0 ? 'measured' : fallback > 0 ? 'fallback' : 'none',
    applied: override != null ? clamp(override) : clamp(Math.max(measured, fallback)),
    innerHeight: window.innerHeight,
    availHeight: (window.screen && window.screen.availHeight) ?? null,
    screenHeight: (window.screen && window.screen.height) ?? null,
  };
}

function clamp(n) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_GUTTER);
}

/** Compute + publish the gutter. Returns the applied px value. */
export function applyGutter() {
  const { applied } = describeGutter();
  try {
    document.documentElement.style.setProperty(CSS_VAR, `${applied}px`);
  } catch {
    /* non-DOM host */
  }
  return applied;
}

/**
 * Install listeners so the gutter tracks orientation changes and any late
 * iframe resize from the Reddit host. Safe to call more than once.
 */
export function initViewportGutter() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  applyGutter();

  const recompute = () => applyGutter();
  window.addEventListener('resize', recompute, { passive: true });
  window.addEventListener('orientationchange', recompute, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', recompute, { passive: true });
  }
  // Reddit sometimes settles the iframe height a tick after first paint.
  setTimeout(recompute, 300);
  setTimeout(recompute, 1200);
}
