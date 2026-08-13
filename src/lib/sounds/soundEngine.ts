/**
 * Gentle interaction sounds, synthesized as tiny MP3s in /public/sounds.
 * - never plays before the first user gesture (browser autoplay rules)
 * - global mute via settings store
 * - UI sounds are never mixed with meditation audio: the meditation player
 *    uses its own element; these one-shots are for interface feedback only.
 */
type SoundName = 'tap' | 'wood' | 'bell' | 'bowl';

const urls: Record<SoundName, string> = {
  tap: '/sounds/tap.mp3',
  wood: '/sounds/wood.mp3',
  bell: '/sounds/bell.mp3',
  bowl: '/sounds/bowl.mp3',
};

let enabled = true;
let unlocked = false;
const cache = new Map<SoundName, HTMLAudioElement>();

export function setSoundsEnabled(value: boolean): void {
  enabled = value;
}

/** Call once from the first user gesture (pointerdown) to unlock audio. */
export function unlockSounds(): void {
  if (unlocked) return;
  unlocked = true;
  (Object.keys(urls) as SoundName[]).forEach((name) => {
    const el = new Audio(urls[name]);
    el.preload = 'auto';
    el.volume = 0;
    cache.set(name, el);
  });
}

export function playSound(name: SoundName): void {
  if (!enabled || !unlocked) return;
  try {
    const base = cache.get(name) ?? new Audio(urls[name]);
    cache.set(name, base);
    const el = base.cloneNode() as HTMLAudioElement;
    el.volume = name === 'bowl' ? 0.6 : 0.45;
    void el.play().catch(() => undefined);
  } catch {
    /* sound is decoration; never break the interface for it */
  }
}

export const sounds = {
  tap: () => playSound('tap'),
  wood: () => playSound('wood'),
  bell: () => playSound('bell'),
  bowl: () => playSound('bowl'),
};
