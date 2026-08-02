import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from './fileStorage';
import { v4 as uuidv4 } from 'uuid';
import type { Scene, Track } from '../types';
import type { PresetScene } from '../data/arcScenes';
import { useMusicStore } from './musicStore';
import { useSoundStore } from './soundStore';

const DEFAULT_PRESET_MUSIC_VOLUME = 80;
const DEFAULT_PRESET_AMBIENT_VOLUME = 70;

/** Presets name tracks by title, since ids come from downloaded filenames.
 *  Exact match first, then a loose contains, then give up. */
function resolvePresetTrack(tracks: Track[], titles: string[]): Track | null {
  for (const title of titles) {
    const wanted = title.toLowerCase();
    const exact = tracks.find((t) => t.title.toLowerCase() === wanted);
    if (exact) return exact;
    const loose = tracks.find((t) => t.title.toLowerCase().includes(wanted));
    if (loose) return loose;
  }
  return null;
}

/** Does this preset have a track in the current library? */
export function presetIsPlayable(preset: PresetScene, tracks: Track[]): boolean {
  return resolvePresetTrack(tracks, preset.tracks) !== null;
}

interface SceneState {
  scenes: Scene[];
  activeSceneId: string | null; // last applied scene (visual hint only)

  /** Snapshot the current board (music + ambient mix) under a name.
   *  Returns the new scene's id so callers can bind it (e.g. to a guide cue). */
  saveCurrentAsScene: (name: string) => string;
  applyScene: (id: string) => void;
  /** Apply a ready-made arc scene. Nothing is saved — it just sets the board. */
  applyPreset: (preset: PresetScene) => void;
  /** Forget which scene is showing as active. Audio is stopped by the caller. */
  clearActiveScene: () => void;
  deleteScene: (id: string) => void;
  renameScene: (id: string, name: string) => void;
}

export const useSceneStore = create<SceneState>()(
  persist(
    (set, get) => ({
      scenes: [],
      activeSceneId: null,

      saveCurrentAsScene: (name) => {
        const music = useMusicStore.getState();
        const { sounds } = useSoundStore.getState();
        const scene: Scene = {
          id: uuidv4(),
          name,
          trackId: music.currentTrackId,
          musicVolume: music.volume,
          loop: music.loop,
          ambients: sounds
            .filter((s) => s.type === 'ambient' && s.isActive)
            .map((s) => ({ id: s.id, level: s.currentLevel ?? 0, volume: s.volume })),
        };
        set((st) => ({ scenes: [...st.scenes, scene], activeSceneId: scene.id }));
        return scene.id;
      },

      applyScene: (id) => {
        const scene = get().scenes.find((s) => s.id === id);
        if (!scene) return;

        const music = useMusicStore.getState();
        // Exiting combat first keeps the duck factor and snapshot sane
        if (music.combatActive) music.exitCombat();

        music.setVolume(scene.musicVolume);
        useMusicStore.setState({ loop: scene.loop, playlistMood: null });
        if (scene.trackId && music.tracks.some((t) => t.id === scene.trackId)) {
          music.playTrack(scene.trackId); // crossfade handled by the player
        } else {
          // Clear, not pause: a scene with no music means silence, and the old
          // track has to be released or it resumes mid-phrase later.
          music.clearTrack();
        }

        useSoundStore.getState().applyAmbientMix(scene.ambients);
        set({ activeSceneId: id });
      },

      applyPreset: (preset) => {
        const music = useMusicStore.getState();
        // Exiting combat first keeps the duck factor and snapshot sane
        if (music.combatActive) music.exitCombat();

        const track = resolvePresetTrack(music.tracks, preset.tracks);
        music.setVolume(DEFAULT_PRESET_MUSIC_VOLUME);
        // Arc scenes are meant to sit under a whole location, so they loop
        useMusicStore.setState({ loop: true, playlistMood: null });
        if (track) music.playTrack(track.id);
        else music.clearTrack();

        // applyAmbientMix is a full reconcile: any loop not named by this preset
        // is faded out, so a scene switch never stacks the old scene's layers
        // under the new one.
        useSoundStore.getState().applyAmbientMix(
          preset.ambients.map((a) => ({
            id: a.id,
            level: a.level ?? 0,
            volume: a.volume ?? DEFAULT_PRESET_AMBIENT_VOLUME,
          }))
        );

        // Prefixed so it can never collide with a saved scene's uuid
        set({ activeSceneId: `preset:${preset.id}` });
      },

      clearActiveScene: () => set({ activeSceneId: null }),

      deleteScene: (id) =>
        set((st) => ({
          scenes: st.scenes.filter((s) => s.id !== id),
          activeSceneId: st.activeSceneId === id ? null : st.activeSceneId,
        })),

      renameScene: (id, name) =>
        set((st) => ({
          scenes: st.scenes.map((s) => (s.id === id ? { ...s, name } : s)),
        })),
    }),
    {
      name: 'dnd-scene-store',
      storage: createJSONStorage(() => fileStorage),
      // activeSceneId is a visual hint that changes on every cue fire — keeping
      // it out of the file means playing a scene doesn't dirty the repo.
      partialize: (state) => ({ scenes: state.scenes }),
    }
  )
);
