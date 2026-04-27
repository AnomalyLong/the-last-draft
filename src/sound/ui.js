import slideSound  from './ui/slide.mp3';
import cursorSound from './ui/cursor.mp3';
import selectSound from './ui/select.mp3';
import cancelSound from './ui/cancel.mp3';
import flipSound      from './ui/flip.wav';
import menuMove3Sound   from './ui/sfx_menu_move3.wav';
import menuSelect2Sound from './ui/sfx_menu_select2.wav';

// Pre-loads the audio file at module init time so the browser decodes it
// immediately. Each play clones the pre-loaded node — fast and overlap-safe.
function makeSound(src, volume = 0.7) {
  const proto = new Audio(src);
  proto.preload = 'auto';
  return () => {
    const a = proto.cloneNode();
    a.volume = volume;
    a.play().catch(() => {});
  };
}

export const playSlide  = makeSound(slideSound,  0.6);
export const playCursor = makeSound(cursorSound, 0.5);
export const playSelect = makeSound(selectSound, 0.7);
export const playCancel = makeSound(cancelSound, 0.6);
export const playFlip       = makeSound(flipSound,      0.7);
export const playMenuMove3   = makeSound(menuMove3Sound,   0.5);
export const playMenuSelect2 = makeSound(menuSelect2Sound, 0.7);
