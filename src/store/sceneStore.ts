import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from './fileStorage';
import { v4 as uuidv4 } from 'uuid';
import type { Scene } from '../types';
import { useMusicStore } from './musicStore';
import { useSoundStore } from './soundStore';

interface SceneState {
  scenes: Scene[];
  activeSceneId: string | null; // last applied scene (visual hint only)

  /** Snapshot the current board (music + ambient mix) under a name.
   *  Returns the new scene's id so callers can bind it (e.g. to a guide cue). */
  saveCurrentAsScene: (name: string) => string;
  applyScene: (id: string) => void;
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
          music.stopPlayback();
        }

        useSoundStore.getState().applyAmbientMix(scene.ambients);
        set({ activeSceneId: id });
      },

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
