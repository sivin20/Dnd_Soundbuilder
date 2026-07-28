import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Track } from '../types';
import defaultTracksJson from '../data/defaultTracks.json';
import { setBaseDuck } from '../audio/duckBus';
import { playVictoryFanfare } from '../audio/fanfare';

const DEFAULT_TRACKS: Track[] = defaultTracksJson as Track[];

interface MusicState {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  volume: number;
  loop: boolean;

  // Mood playlist: when set (and loop off), track end auto-advances to a
  // random other track with this mood.
  playlistMood: string | null;

  // Combat mode
  combatActive: boolean;
  combatTrackId: string | null;      // last used combat track (persisted)
  preCombat: { trackId: string | null; isPlaying: boolean; loop: boolean } | null;

  addTrack: (track: Omit<Track, 'id' | 'addedAt'>) => void;
  removeTrack: (id: string) => void;
  renameTrack: (id: string, name: string) => void;
  setCurrentTrack: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  toggleLoop: () => void;
  playTrack: (id: string) => void;
  stopPlayback: () => void;
  setPlaylistMood: (mood: string | null) => void;
  playMood: (mood: string) => void;
  enterCombat: (trackId: string) => void;
  exitCombat: () => void;
}

const AMBIENT_COMBAT_DUCK = 0.5;

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      tracks: DEFAULT_TRACKS,
      currentTrackId: null,
      isPlaying: false,
      volume: 80,
      loop: false,
      playlistMood: null,
      combatActive: false,
      combatTrackId: null,
      preCombat: null,

      addTrack: (track) =>
        set((state) => ({
          tracks: [...state.tracks, { ...track, id: uuidv4(), addedAt: Date.now() }],
        })),

      removeTrack: (id) =>
        set((state) => ({
          tracks: state.tracks.filter((t) => t.id !== id),
          currentTrackId: state.currentTrackId === id ? null : state.currentTrackId,
          isPlaying: state.currentTrackId === id ? false : state.isPlaying,
        })),

      renameTrack: (id, name) =>
        set((state) => ({
          tracks: state.tracks.map((t) => (t.id === id ? { ...t, customName: name } : t)),
        })),

      setCurrentTrack: (id) => set({ currentTrackId: id }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setVolume: (volume) => set({ volume }),
      toggleLoop: () => set((s) => ({ loop: !s.loop })),
      playTrack: (id) => set({ currentTrackId: id, isPlaying: true }),
      stopPlayback: () => set({ isPlaying: false }),

      setPlaylistMood: (mood) => set({ playlistMood: mood }),

      playMood: (mood) => {
        const { tracks, currentTrackId } = get();
        const pool = tracks.filter((t) => t.moods?.includes(mood) && t.id !== currentTrackId);
        if (pool.length === 0) return;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        set({ playlistMood: mood, loop: false, currentTrackId: pick.id, isPlaying: true });
      },

      enterCombat: (trackId) => {
        const { currentTrackId, isPlaying, loop, combatActive } = get();
        if (combatActive) return;
        setBaseDuck(AMBIENT_COMBAT_DUCK);
        set({
          combatActive: true,
          combatTrackId: trackId,
          preCombat: { trackId: currentTrackId, isPlaying, loop },
          currentTrackId: trackId,
          isPlaying: true,
          loop: true,
          playlistMood: null,
        });
      },

      exitCombat: () => {
        const { preCombat, combatActive, volume } = get();
        if (!combatActive) return;
        setBaseDuck(1);
        playVictoryFanfare(0.45 * (volume / 100));
        set({
          combatActive: false,
          preCombat: null,
          currentTrackId: preCombat?.trackId ?? null,
          isPlaying: preCombat ? preCombat.isPlaying : false,
          loop: preCombat?.loop ?? false,
        });
      },
    }),
    {
      name: 'dnd-music-store',
      partialize: (state) => ({
        tracks: state.tracks,
        currentTrackId: state.currentTrackId,
        volume: state.volume,
        loop: state.loop,
        playlistMood: state.playlistMood,
        combatTrackId: state.combatTrackId,
        // combatActive / isPlaying / preCombat intentionally not persisted
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<MusicState>;
        // defaultTracks.json is the source of truth for default tracks
        // (title, section, moods). Persisted copies only contribute the
        // user's customName. User-added tracks (files not in the defaults)
        // are kept as-is.
        const persistedById = new Map((p.tracks ?? []).map((t) => [t.id, t]));
        const defaultFilenames = new Set(DEFAULT_TRACKS.map((d) => d.filename));
        const userTracks = (p.tracks ?? []).filter((t) => !defaultFilenames.has(t.filename));
        return {
          ...current,
          ...p,
          isPlaying: false,
          combatActive: false,
          preCombat: null,
          tracks: [
            ...DEFAULT_TRACKS.map((d) => {
              const saved = persistedById.get(d.id);
              return saved && saved.customName !== saved.title
                ? { ...d, customName: saved.customName }
                : d;
            }),
            ...userTracks,
          ],
        };
      },
    }
  )
);
