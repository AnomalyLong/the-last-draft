// Global volume multipliers applied to all sounds (0..1).
// Mutate these values; audio functions read them at play time.
// `muted` is a global override: when true the effective volume is 0 for
// every channel, regardless of the music/sfx targets (so unmuting restores
// whatever the Options sliders were set to). Read effective volume via the
// helpers below — never `audioSettings.sfx` directly — so mute is respected.
export const audioSettings = { music: 1.0, sfx: 1.0, muted: false };

export const musicVolume = () => (audioSettings.muted ? 0 : audioSettings.music);
export const sfxVolume   = () => (audioSettings.muted ? 0 : audioSettings.sfx);
