import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setSoundsEnabled } from '@/lib/sounds/soundEngine';
import type { Settings } from '@/types/domain';

/** localStorage that never throws — falls back to memory in sandboxed iframes. */
const memoryStore = new Map<string, string>();
const safeStorage = {
  getItem: (k: string) => {
    try { return localStorage.getItem(k); } catch { return memoryStore.get(k) ?? null; }
  },
  setItem: (k: string, v: string) => {
    try { localStorage.setItem(k, v); } catch { memoryStore.set(k, v); }
  },
  removeItem: (k: string) => {
    try { localStorage.removeItem(k); } catch { memoryStore.delete(k); }
  },
};

interface SettingsState extends Settings {
  setSoundsEnabled(v: boolean): void;
  setCompletionSoundEnabled(v: boolean): void;
  setReducedMotion(v: boolean): void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      soundsEnabled: true,
      completionSoundEnabled: true,
      reducedMotion:
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      setSoundsEnabled: (v) => {
        setSoundsEnabled(v);
        set({ soundsEnabled: v });
      },
      setCompletionSoundEnabled: (v) => set({ completionSoundEnabled: v }),
      setReducedMotion: (v) => set({ reducedMotion: v }),
    }),
    {
      name: 'sahadhyana.settings.v1',
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        setSoundsEnabled(state?.soundsEnabled ?? true);
      },
    },
  ),
);
