// Global volume multipliers applied to all sounds (0..1).
// Mutate these values; audio functions read them at play time.
// `muted` is a global override: when true the effective volume is 0 for
// every channel, regardless of the music/sfx targets (so unmuting restores
// whatever the Options sliders were set to). Read effective volume via the
// helpers below — never `audioSettings.sfx` directly — so mute is respected.
export const audioSettings = { music: 1.0, sfx: 1.0, muted: false };

export const musicVolume = () => (audioSettings.muted ? 0 : audioSettings.music);
export const sfxVolume   = () => (audioSettings.muted ? 0 : audioSettings.sfx);

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
