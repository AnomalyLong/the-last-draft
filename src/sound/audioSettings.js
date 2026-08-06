// Global volume multipliers applied to all sounds (0..1).
// Mutate these values; audio functions read them at play time.
// `muted` is a global override: when true the effective volume is 0 for
// every channel, regardless of the music/sfx targets (so unmuting restores
// whatever the Options sliders were set to). Read effective volume via the
// helpers below — never `audioSettings.sfx` directly — so mute is respected.
export const audioSettings = { music: 1.0, sfx: 1.0, muted: false };

export const musicVolume = () => (audioSettings.muted ? 0 : audioSettings.music);
export const sfxVolume   = () => (audioSettings.muted ? 0 : audioSettings.sfx);

// ── Suspend (no-audio views) ──────────────────────────────────────────────
// DISTINCT FROM MUTE, and deliberately not stored on audioSettings:
//
//   muted    — a user preference. Volume 0, but the audio element is still
//              constructed, which means the browser still FETCHES the file.
//   suspended— "this view never plays audio at all." Every play/start entry
//              point returns BEFORE `new Audio(src)`, so nothing is fetched.
//
// This exists for the inline (feed post) view. It shares one bundle with the
// expanded game view, and SplashCourt runs a real, silenced sim — which calls
// playLeap/playJumpball/etc. as it plays out. Muting those set volume to 0 but
// still pulled each .wav over the network on first call. Worse, mute could not
// even be relied on: user.init resolves a few hundred ms after mount and calls
// setMuted(savedMuted), unmuting the splash again for anyone whose saved
// preference is unmuted. Suspend is owned by the view, not the user, so init
// can't clobber it.
//
// Module-scoped rather than a field on audioSettings so it can never be
// serialised into a user's saved preferences by accident. (Aug 5)
let _suspended = false;

/** Suspend/resume ALL audio construction+playback. Returns the new state. */
export function setAudioSuspended(s) {
  _suspended = !!s;
  return _suspended;
}

/** True when the current view must not construct or play any audio. */
export function isAudioSuspended() { return _suspended; }

// ── Change notification ───────────────────────────────────────────────────
// One-shot SFX read the helpers above at play time, so they're always
// correct. Anything *already playing* (looping sfx, music, <video>) has a
// volume baked into a live element and needs to be told to re-read. Rather
// than have setMuted() maintain a hard-coded list of every such channel —
// which is how the intro video and the FTUE typing loop ended up ignoring
// mute — channels subscribe here and re-apply themselves.
const _listeners = new Set();

/** Register a callback fired whenever mute/volume changes. Returns an unsubscribe fn. */
export function subscribeAudioSettings(fn) {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

/** Call after mutating audioSettings so live channels re-read their volume. */
export function notifyAudioSettingsChanged() {
  for (const fn of _listeners) {
    // A misbehaving listener must not stop the rest from going silent.
    try { fn(audioSettings); } catch { /* ignore */ }
  }
}
