import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Howl, Howler } from 'howler';
import type { Sound } from '../types';
import soundsConfig   from '../data/soundsConfig.json';
import ambienceConfig from '../data/ambienceConfig.json';
import { registerDuckApplier, getDuckFactor, duckTransient } from '../audio/duckBus';

// ---------------------------------------------------------------------------
// Runtime Howl map (never persisted)
// ---------------------------------------------------------------------------
const howlMap = new Map<string, Howl>();
const FADE_MS = 1000;

function activeLevelUrl(sound: Sound): string {
  if (sound.levels && sound.levels.length > 0) {
    return sound.levels[sound.currentLevel ?? 0] ?? sound.url;
  }
  return sound.url;
}

/** Ambient target volume with ducking applied. */
function ambientTarget(sound: Sound): number {
  return (sound.volume / 100) * getDuckFactor();
}

function createHowl(sound: Sound): Howl {
  const url = activeLevelUrl(sound);
  return new Howl({
    src: [url],
    loop: sound.type === 'ambient',
    volume: ambientTarget(sound),
    html5: true,
    onloaderror: (_id, err) => console.error(`[Howl] Load error "${sound.name}":`, err),
    onplayerror: (_id, err) => {
      console.error(`[Howl] Play error "${sound.name}":`, err);
      Howler.ctx?.resume().then(() => { howlMap.get(sound.id)?.play(); });
    },
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
  if (h) { h.stop(); h.unload(); howlMap.delete(id); }
}

// ---------------------------------------------------------------------------
// Sprinkles — random low-volume one-shots layered onto an active ambient
// ---------------------------------------------------------------------------
const sprinkleTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SPRINKLE_MIN_MS = 30_000;
const SPRINKLE_MAX_MS = 120_000;
const SPRINKLE_VOLUME = 0.6; // relative to the ambient's own volume

function scheduleSprinkle(id: string) {
  cancelSprinkle(id);
  const delay = SPRINKLE_MIN_MS + Math.random() * (SPRINKLE_MAX_MS - SPRINKLE_MIN_MS);
  const timer = setTimeout(() => {
    const s = useSoundStore.getState().sounds.find((x) => x.id === id);
    if (!s || !s.isActive || !s.sprinkles?.length) return;
    const url = s.sprinkles[Math.floor(Math.random() * s.sprinkles.length)];
    new Howl({ src: [url], volume: ambientTarget(s) * SPRINKLE_VOLUME }).play();
    scheduleSprinkle(id);
  }, delay);
  sprinkleTimers.set(id, timer);
}

function cancelSprinkle(id: string) {
  const t = sprinkleTimers.get(id);
  if (t) { clearTimeout(t); sprinkleTimers.delete(id); }
}

// ---------------------------------------------------------------------------
// Config → default Sound objects
// soundsConfig.json is the source of truth for what sounds exist.
// Drop a file in public/sounds/ → Vite plugin auto-registers it in the JSON.
// Edit the JSON to set type, emoji, name, levels, sprinkles, etc.
// ---------------------------------------------------------------------------
// Merge both configs — oneshots from soundsConfig, ambient from ambienceConfig
const CONFIG_SOUNDS: Sound[] = [
  ...(soundsConfig   as Sound[]),
  ...(ambienceConfig as Sound[]),
].map((s) => ({
  ...s,
  isActive: false,
  currentLevel: s.currentLevel ?? 0,
}));

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export interface AmbientMixTarget { id: string; level: number; volume: number }

interface SoundState {
  sounds: Sound[];
  renameSound:     (id: string, name: string) => void;
  setVolume:       (id: string, volume: number) => void;
  toggleAmbient:   (id: string) => void;
  setAmbientLevel: (id: string, level: number) => void;
  triggerOneShot:  (id: string) => void;
  stopAllAmbient:  () => void;
  /** Reconcile all ambient loops against a scene's mix (fade in/out/adjust). */
  applyAmbientMix: (targets: AmbientMixTarget[]) => void;
}

function fadeInAmbient(sound: Sound) {
  if (Howler.ctx?.state === 'suspended') Howler.ctx.resume();
  const howl = getOrCreateHowl(sound);
  howl.volume(0);
  if (!howl.playing()) howl.play();
  howl.fade(0, ambientTarget(sound), FADE_MS);
  if (sound.sprinkles?.length) scheduleSprinkle(sound.id);
}

function fadeOutAmbient(sound: Sound) {
  cancelSprinkle(sound.id);
  const howl = howlMap.get(sound.id);
  if (howl) {
    howl.fade(howl.volume() as number, 0, FADE_MS);
    howl.once('fade', () => {
      howl.stop();
      howl.volume(ambientTarget(sound)); // restore for next play
    });
  }
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      sounds: CONFIG_SOUNDS,

      renameSound: (id, name) =>
        set((s) => ({ sounds: s.sounds.map((x) => (x.id === id ? { ...x, name } : x)) })),

      setVolume: (id, volume) => {
        const sound = get().sounds.find((s) => s.id === id);
        if (sound) howlMap.get(id)?.volume((volume / 100) * getDuckFactor());
        set((s) => ({ sounds: s.sounds.map((x) => (x.id === id ? { ...x, volume } : x)) }));
      },

      toggleAmbient: (id) => {
        const sound = get().sounds.find((s) => s.id === id);
        if (!sound || sound.type !== 'ambient') return;
        const nowActive = !sound.isActive;

        if (nowActive) fadeInAmbient(sound);
        else fadeOutAmbient(sound);

        set((s) => ({ sounds: s.sounds.map((x) => (x.id === id ? { ...x, isActive: nowActive } : x)) }));
      },

      setAmbientLevel: (id, level) => {
        const sound = get().sounds.find((s) => s.id === id);
        if (!sound || sound.type !== 'ambient') return;
        const wasActive = sound.isActive;

        if (wasActive) {
          // Pull old howl out of the map immediately so getOrCreateHowl makes a fresh one
          const oldHowl = howlMap.get(id);
          howlMap.delete(id);
          if (oldHowl) {
            oldHowl.fade(oldHowl.volume() as number, 0, FADE_MS);
            oldHowl.once('fade', () => { oldHowl.stop(); oldHowl.unload(); });
          }

          // Update state to new level, then spin up new howl and crossfade in
          set((s) => ({ sounds: s.sounds.map((x) => (x.id === id ? { ...x, currentLevel: level } : x)) }));
          const updated = get().sounds.find((s) => s.id === id);
          if (!updated) return;
          if (Howler.ctx?.state === 'suspended') Howler.ctx.resume();
          const newHowl = getOrCreateHowl(updated);
          newHowl.volume(0);
          newHowl.play();
          newHowl.fade(0, ambientTarget(updated), FADE_MS);
        } else {
          // Not playing — just swap silently
          destroyHowl(id);
          set((s) => ({ sounds: s.sounds.map((x) => (x.id === id ? { ...x, currentLevel: level } : x)) }));
        }
      },

      triggerOneShot: (id) => {
        const sound = get().sounds.find((s) => s.id === id);
        if (!sound || sound.type !== 'oneshot') return;
        const h = new Howl({
          src: [sound.url],
          loop: false,
          volume: sound.volume / 100,
          onplay: () => duckTransient(0.4, Math.min(h.duration(), 5) * 1000),
        });
        h.play();
      },

      stopAllAmbient: () => {
        get().sounds.filter((s) => s.type === 'ambient' && s.isActive).forEach(fadeOutAmbient);
        set((s) => ({ sounds: s.sounds.map((x) => x.type === 'ambient' ? { ...x, isActive: false } : x) }));
      },

      applyAmbientMix: (targets) => {
        const byId = new Map(targets.map((t) => [t.id, t]));
        const { sounds, setAmbientLevel, setVolume } = get();

        sounds.filter((s) => s.type === 'ambient').forEach((s) => {
          const target = byId.get(s.id);

          if (!target) {
            if (s.isActive) fadeOutAmbient(s);
            return;
          }

          // Volume first so fades land on the right target
          if (s.volume !== target.volume) setVolume(s.id, target.volume);

          if (s.isActive) {
            // Already playing: level change crossfades via setAmbientLevel
            if ((s.currentLevel ?? 0) !== target.level) setAmbientLevel(s.id, target.level);
          } else {
            const fresh = get().sounds.find((x) => x.id === s.id)!;
            if ((fresh.currentLevel ?? 0) !== target.level) {
              destroyHowl(s.id);
            }
            const toStart = { ...fresh, currentLevel: target.level };
            set((st) => ({
              sounds: st.sounds.map((x) =>
                x.id === s.id ? { ...x, currentLevel: target.level } : x
              ),
            }));
            fadeInAmbient(toStart);
          }
        });

        set((st) => ({
          sounds: st.sounds.map((x) =>
            x.type === 'ambient' ? { ...x, isActive: byId.has(x.id) } : x
          ),
        }));
      },
    }),
    {
      name: 'dnd-sound-store',
      // Persist only runtime state (volume, currentLevel) — not isActive
      partialize: (state) => ({
        sounds: state.sounds.map((s) => ({ id: s.id, volume: s.volume, currentLevel: s.currentLevel ?? 0, isActive: false })),
      }),
      // Merge: always use the config as the base; overlay saved volume/level on top
      merge: (persisted, current) => {
        const saved = persisted as { sounds: { id: string; volume: number; currentLevel: number }[] };
        const savedMap = new Map((saved?.sounds ?? []).map((s) => [s.id, s]));
        return {
          ...current,
          sounds: CONFIG_SOUNDS.map((s) => {
            const overrides = savedMap.get(s.id);
            return overrides
              ? { ...s, volume: overrides.volume, currentLevel: overrides.currentLevel ?? 0 }
              : s;
          }),
        };
      },
    }
  )
);

// Apply duck factor changes to every active ambient loop.
// Registered after store creation — the applier runs once immediately.
registerDuckApplier(() => {
  useSoundStore
    .getState()
    .sounds.filter((s) => s.type === 'ambient' && s.isActive)
    .forEach((s) => {
      const h = howlMap.get(s.id);
      if (h && h.playing()) h.fade(h.volume() as number, ambientTarget(s), 300);
    });
});
