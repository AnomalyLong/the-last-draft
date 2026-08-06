import gameMusicSrc    from './game.mp3';
import titleMusicSrc   from './title.mp3';
import coinSound       from './coin.wav';
import shotSound       from './basketball/shot.wav';
import missSound       from './basketball/miss.wav';
import dunkSound       from './basketball/dunk.wav';
import jumpballSound   from './basketball/jumpball.wav';
import passSound       from './basketball/pass.wav';
import leapSound       from './basketball/leap.wav';
import bounceSound     from './basketball/dribble.wav';
import rareSound       from './basketball/rare.wav';
import rare2Sound      from './basketball/rare2.wav';
import rare3Sound      from './basketball/rare3.wav';
import quarterSound    from './basketball/quarter.wav';
import swishSound      from './basketball/swish.wav';
import levelUpSound    from './levelup.wav';
import fanfareSound    from './fanfare.wav';
import blockSound      from './block.wav';
import pickSound       from './basketball/pick.wav';
import {
  audioSettings, musicVolume, sfxVolume, notifyAudioSettingsChanged,
} from './audioSettings.js';

// Every Audio() below is constructed LAZILY (on first actual play/start),
// not at module-import time. This module is statically imported by App.jsx
// (needed for game/lobby playback) AND by SplashCourt.jsx (needed only for
// the mute icon's setMuted/isMuted) — and App.jsx itself loads on the inline
// (feed post) view too, since post view and expanded/game view share one
// bundle. Eagerly `new Audio(src)`-ing ~7.5MB of game+title music and SFX
// used to mean the feed post fetched all of it before a user ever tapped in,
// even though nothing in the inline view ever calls play(). Deferring
// construction to first use means importing this module costs nothing; the
// fetch only happens when a sound is actually going to play. (Aug 5)
function makeSound(src, baseVol = 0.8) {
  let proto = null;
  return () => {
    if (!proto) {
      proto = new Audio(src);
      proto.preload = 'auto';
    }
    const a = proto.cloneNode();
    a.volume = baseVol * sfxVolume();
    a.play().catch(() => {});
  };
}

// Looping dribble sound with a gap between bounces — call start()/stop() to control.
const BOUNCE_BASE = 0.6;
let _bounce = null;
let _bounceActive = false;
let _bounceTimer  = null;
function getBounce() {
  if (_bounce) return _bounce;
  _bounce = new Audio(bounceSound);
  _bounce.volume = BOUNCE_BASE;
  _bounce.addEventListener('ended', () => {
    if (!_bounceActive) return;
    _bounceTimer = setTimeout(() => {
      if (!_bounceActive) return;
      _bounce.currentTime = 0;
      _bounce.play().catch(() => {});
    }, 180);
  });
  return _bounce;
}
export const bounceBall = {
  start() {
    if (_bounceActive) return;
    const b = getBounce();
    _bounceActive = true;
    b.currentTime = 0;
    b.play().catch(() => {});
  },
  stop() {
    _bounceActive = false;
    clearTimeout(_bounceTimer);
    if (_bounce) { _bounce.pause(); _bounce.currentTime = 0; }
  },
  applyVolume() { if (_bounce) _bounce.volume = BOUNCE_BASE * sfxVolume(); },
};

const BG_BASE = 0.35;
let _bgMusic = null;
function getBgMusic() {
  if (_bgMusic) return _bgMusic;
  _bgMusic = new Audio(gameMusicSrc);
  _bgMusic.loop = true;
  _bgMusic.volume = BG_BASE;
  return _bgMusic;
}
export const bgMusic = {
  start() { getBgMusic().play().catch(() => {}); },
  stop()  { if (_bgMusic) { _bgMusic.pause(); _bgMusic.currentTime = 0; } },
  applyVolume() { if (_bgMusic) _bgMusic.volume = BG_BASE * musicVolume(); },
};

const TITLE_BASE = 0.40;
let _titleMusic = null;
let _titlePending = false;
function getTitleMusic() {
  if (_titleMusic) return _titleMusic;
  _titleMusic = new Audio(titleMusicSrc);
  _titleMusic.loop = true;
  _titleMusic.volume = TITLE_BASE;
  return _titleMusic;
}
export const titleMusic = {
  start() {
    const t = getTitleMusic();
    if (!t.paused) return;
    t.currentTime = 0;
    t.play().catch(() => {
      if (_titlePending) return;
      _titlePending = true;
      const resume = () => {
        const wasPending = _titlePending;
        _titlePending = false;
        document.removeEventListener('click',      resume);
        document.removeEventListener('touchstart', resume);
        if (!wasPending) return; // stop() canceled us before the user interacted
        t.play().catch(() => {});
      };
      document.addEventListener('click',      resume, { once: true });
      document.addEventListener('touchstart', resume, { once: true });
    });
  },
  stop() {
    _titlePending = false;
    if (_titleMusic) { _titleMusic.pause(); _titleMusic.currentTime = 0; }
  },
  applyVolume() { if (_titleMusic) _titleMusic.volume = TITLE_BASE * musicVolume(); },
};

// ── Global mute ──────────────────────────────────────────────────────────
// Flips audioSettings.muted (the effective-volume override read by every
// sound at play time) and re-applies the looping channels immediately so
// already-playing music goes silent/returns without waiting for a restart.
// One-shot SFX pick up the new state on their next play. Session-only — no
// browser storage in the Devvit iframe.
// Re-applies every live channel owned by this module, then notifies external
// subscribers (FTUE typing loop, intro video, ...) so they re-read too. Call
// this after any mutation of audioSettings. Guarded with null-checks because
// a channel may never have been constructed yet (e.g. mute tapped from the
// inline splash, before anything has played) — nothing to re-apply to, and
// nothing should be force-constructed just to flip a flag.
export function applyAllVolumes() {
  if (_bounce)     _bounce.volume     = BOUNCE_BASE * sfxVolume();
  if (_bgMusic)    _bgMusic.volume    = BG_BASE     * musicVolume();
  if (_titleMusic) _titleMusic.volume = TITLE_BASE  * musicVolume();
  notifyAudioSettingsChanged();
}

export function setMuted(m) {
  audioSettings.muted = !!m;
  applyAllVolumes();
  return audioSettings.muted;
}
export function toggleMute() { return setMuted(!audioSettings.muted); }
export function isMuted() { return audioSettings.muted; }

export const playShot       = makeSound(shotSound, 0.8);
export const playMiss       = makeSound(missSound,       0.7);
export const playDunk       = makeSound(dunkSound,       0.9);
export const playJumpball   = makeSound(jumpballSound,   0.8);
export const playPass       = makeSound(passSound,       0.7);
export const playLeap       = makeSound(leapSound,       0.7);
export const playRare       = makeSound(rareSound,       0.7);
export const playRare2      = makeSound(rare2Sound,      0.8);
export const playRare3      = makeSound(rare3Sound,      0.9);
export const playQuarter    = makeSound(quarterSound,    0.8);
export const playSwish      = makeSound(swishSound,      0.8);
export const playLevelUp    = makeSound(levelUpSound,    0.9);
export const playFanfare    = makeSound(fanfareSound,    0.9);
export const playBlock      = makeSound(blockSound,      0.8);
export const playPick       = makeSound(pickSound,       0.8);
export const playCoin       = makeSound(coinSound,       0.6);
