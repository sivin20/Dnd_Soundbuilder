import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Howl } from 'howler';
import type { Sound } from '../types';

// Runtime map of active Howl instances (not persisted)
const howlMap = new Map<string, Howl>();

function createHowl(sound: Sound): Howl {
  return new Howl({
    src: [sound.url],
    loop: sound.type === 'ambient',
    volume: sound.volume / 100,
    html5: true,
    onloaderror: (_id, err) => console.warn(`Failed to load sound "${sound.name}":`, err),
  });
}

function getOrCreateHowl(sound: Sound): Howl {
  if (!howlMap.has(sound.id)) {
    howlMap.set(sound.id, createHowl(sound));
  }
  return howlMap.get(sound.id)!;
}

function destroyHowl(id: string) {
  const h = howlMap.get(id);
  if (h) {
    h.stop();
    h.unload();
    howlMap.delete(id);
  }
}

interface SoundState {
  sounds: Sound[];

  addSound: (sound: Omit<Sound, 'id' | 'isActive'>) => void;
  removeSound: (id: string) => void;
  renameSound: (id: string, name: string) => void;
  setVolume: (id: string, volume: number) => void;
  toggleAmbient: (id: string) => void;
  triggerOneShot: (id: string) => void;
  stopAllAmbient: () => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      sounds: [],

      addSound: (sound) =>
        set((state) => ({
          sounds: [
            ...state.sounds,
            { ...sound, id: uuidv4(), isActive: false },
          ],
        })),

      removeSound: (id) => {
        destroyHowl(id);
        set((state) => ({
          sounds: state.sounds.filter((s) => s.id !== id),
        }));
      },

      renameSound: (id, name) =>
        set((state) => ({
          sounds: state.sounds.map((s) => (s.id === id ? { ...s, name } : s)),
        })),

      setVolume: (id, volume) => {
        const howl = howlMap.get(id);
        if (howl) howl.volume(volume / 100);
        set((state) => ({
          sounds: state.sounds.map((s) => (s.id === id ? { ...s, volume } : s)),
        }));
      },

      toggleAmbient: (id) => {
        const state = get();
        const sound = state.sounds.find((s) => s.id === id);
        if (!sound || sound.type !== 'ambient') return;

        const nowActive = !sound.isActive;
        const howl = getOrCreateHowl(sound);

        if (nowActive) {
          howl.volume(sound.volume / 100);
          if (!howl.playing()) howl.play();
        } else {
          howl.stop();
        }

        set((s) => ({
          sounds: s.sounds.map((x) =>
            x.id === id ? { ...x, isActive: nowActive } : x
          ),
        }));
      },

      triggerOneShot: (id) => {
        const state = get();
        const sound = state.sounds.find((s) => s.id === id);
        if (!sound || sound.type !== 'oneshot') return;
        // Always create a fresh Howl for one-shots so multiple can overlap
        const howl = new Howl({
          src: [sound.url],
          loop: false,
          volume: sound.volume / 100,
          html5: true,
        });
        howl.play();
      },

      stopAllAmbient: () => {
        const state = get();
        state.sounds
          .filter((s) => s.type === 'ambient' && s.isActive)
          .forEach((s) => {
            const h = howlMap.get(s.id);
            if (h) h.stop();
          });
        set((s) => ({
          sounds: s.sounds.map((x) =>
            x.type === 'ambient' ? { ...x, isActive: false } : x
          ),
        }));
      },
    }),
    {
      name: 'dnd-sound-store',
      // Don't persist isActive — ambient sounds should start stopped on reload
      partialize: (state) => ({
        sounds: state.sounds.map((s) => ({ ...s, isActive: false })),
      }),
    }
  )
);
