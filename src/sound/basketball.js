import gameMusicSrc    from './game.mp3';
import titleMusicSrc   from './title.mp3';
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
import blockSound      from './block.wav';

function makeSound(src, volume = 0.8) {
  const proto = new Audio(src);
  proto.preload = 'auto';
  return () => {
    const a = proto.cloneNode();
    a.volume = volume;
    a.play().catch(() => {});
  };
}

// Looping dribble sound with a gap between bounces — call start()/stop() to control.
const _bounce = new Audio(bounceSound);
_bounce.volume = 0.6;
let _bounceActive = false;
let _bounceTimer  = null;
_bounce.addEventListener('ended', () => {
  if (!_bounceActive) return;
  _bounceTimer = setTimeout(() => {
    if (!_bounceActive) return;
    _bounce.currentTime = 0;
    _bounce.play().catch(() => {});
  }, 180);
});
export const bounceBall = {
  start() {
    if (_bounceActive) return;
    _bounceActive = true;
    _bounce.currentTime = 0;
    _bounce.play().catch(() => {});
  },
  stop() {
    _bounceActive = false;
    clearTimeout(_bounceTimer);
    _bounce.pause();
    _bounce.currentTime = 0;
  },
};

const _bgMusic = new Audio(gameMusicSrc);
_bgMusic.loop = true;
_bgMusic.volume = 0.35;
export const bgMusic = {
  start() { _bgMusic.play().catch(() => {}); },
  stop()  { _bgMusic.pause(); _bgMusic.currentTime = 0; },
};

const _titleMusic = new Audio(titleMusicSrc);
_titleMusic.loop = true;
_titleMusic.volume = 0.40;
let _titlePending = false;
export const titleMusic = {
  start() {
    if (!_titleMusic.paused) return;
    _titleMusic.currentTime = 0;
    _titleMusic.play().catch(() => {
      if (_titlePending) return;
      _titlePending = true;
      const resume = () => {
        _titlePending = false;
        _titleMusic.play().catch(() => {});
        document.removeEventListener('click',      resume);
        document.removeEventListener('touchstart', resume);
      };
      document.addEventListener('click',      resume, { once: true });
      document.addEventListener('touchstart', resume, { once: true });
    });
  },
  stop() {
    _titlePending = false;
    _titleMusic.pause();
    _titleMusic.currentTime = 0;
  },
};

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
export const playBlock      = makeSound(blockSound,      0.8);
