import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Track } from '../types';

interface MusicState {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  volume: number;

  addTrack: (track: Omit<Track, 'id' | 'addedAt'>) => void;
  removeTrack: (id: string) => void;
  renameTrack: (id: string, name: string) => void;
  setCurrentTrack: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  playTrack: (id: string) => void;
  stopPlayback: () => void;
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set) => ({
      tracks: [],
      currentTrackId: null,
      isPlaying: false,
      volume: 80,

      addTrack: (track) =>
        set((state) => ({
          tracks: [
            ...state.tracks,
            { ...track, id: uuidv4(), addedAt: Date.now() },
          ],
        })),

      removeTrack: (id) =>
        set((state) => ({
          tracks: state.tracks.filter((t) => t.id !== id),
          currentTrackId: state.currentTrackId === id ? null : state.currentTrackId,
          isPlaying: state.currentTrackId === id ? false : state.isPlaying,
        })),

      renameTrack: (id, name) =>
        set((state) => ({
          tracks: state.tracks.map((t) =>
            t.id === id ? { ...t, customName: name } : t
          ),
        })),

      setCurrentTrack: (id) => set({ currentTrackId: id }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      setVolume: (volume) => set({ volume }),

      playTrack: (id) =>
        set({ currentTrackId: id, isPlaying: true }),

      stopPlayback: () => set({ isPlaying: false }),
    }),
    {
      name: 'dnd-music-store',
    }
  )
);
