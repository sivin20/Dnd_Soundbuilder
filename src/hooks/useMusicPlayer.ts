import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Howl } from 'howler';
import { useMusicStore } from '../store/musicStore';
import { registerDuckApplier, getDuckFactor } from '../audio/duckBus';

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const FADE_MS = 4000;      // fade-in duration on loop restart
const CROSSFADE_MS = 3000; // crossfade between tracks

// Module-level singletons: one Howl engine shared across the app.
// MusicEngine (mounted once in App) drives it; useMusicPlayer() reads it.
let howl: Howl | null = null;
let loadedTrackId: string | null = null;
let loopEnabled = false;

// Progress snapshot for useSyncExternalStore (replaced immutably on change)
let progress = { elapsed: 0, duration: 0 };
const listeners = new Set<() => void>();

function emit(next: Partial<typeof progress>) {
  progress = { ...progress, ...next };
  listeners.forEach((l) => l());
}

function subscribeProgress(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getProgressSnapshot() {
  return progress;
}

function targetVolume(): number {
  return (useMusicStore.getState().volume / 100) * getDuckFactor();
}

// Duck the music along with everything else (one-shots, combat mode)
registerDuckApplier(() => {
  if (howl && howl.playing()) {
    howl.fade(howl.volume() as number, targetVolume(), 300);
  }
});

/** Fade the outgoing howl to silence, then release it. */
function fadeOutAndUnload(h: Howl) {
  if (h.playing()) {
    h.fade(h.volume() as number, 0, CROSSFADE_MS);
    h.once('fade', () => {
      h.stop();
      h.unload();
    });
  } else {
    h.stop();
    h.unload();
  }
}

/**
 * Fade the current track out over `ms` and release it.
 *
 * Exported for the panic path, which needs its own duration and needs the engine
 * torn down *before* the store is cleared — otherwise the store change would kick
 * off the engine's own 3-second crossfade instead.
 */
export function fadeOutMusic(ms: number) {
  const h = howl;
  howl = null;
  loadedTrackId = null;
  emit({ elapsed: 0, duration: 0 });
  if (!h) return;
  if (!h.playing()) { h.stop(); h.unload(); return; }
  h.fade(h.volume() as number, 0, ms);
  h.once('fade', () => { h.stop(); h.unload(); });
}

export function seekTo(pct: number) {
  if (!howl) return;
  const pos = (howl.duration() * pct) / 100;
  howl.seek(pos);
  emit({ elapsed: pos });
}

/**
 * Headless engine component — mount exactly ONCE (in App). Owns the Howl
 * lifecycle so playback follows the music store from any view.
 */
export function MusicEngine() {
  const { tracks, currentTrackId, isPlaying, volume, loop, setIsPlaying } = useMusicStore();
  const rafRef = useRef<number>(0);

  const currentTrack = tracks.find((t) => t.id === currentTrackId) ?? null;

  // Stable tick via ref so it can reference itself recursively
  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
    if (!howl || !howl.playing()) return;
    emit({ elapsed: howl.seek() as number });
    rafRef.current = requestAnimationFrame(tickRef.current);
  };

  // Load new track when currentTrackId changes
  useEffect(() => {
    if (!currentTrack) {
      if (howl) fadeOutAndUnload(howl);
      howl = null;
      loadedTrackId = null;
      cancelAnimationFrame(rafRef.current);
      emit({ elapsed: 0, duration: 0 });
      return;
    }

    // Same track already loaded — don't reload
    if (currentTrackId === loadedTrackId && howl) return;

    // Swap track: crossfade the old one out while the new one fades in
    cancelAnimationFrame(rafRef.current);
    const outgoing = howl;
    const crossfading = outgoing !== null && outgoing.playing();
    if (outgoing) fadeOutAndUnload(outgoing);
    emit({ elapsed: 0, duration: 0 });

    const h = new Howl({
      src: [`/music/${currentTrack.filename}`],
      html5: true, // stream large files instead of buffering all at once
      loop: false,
      volume: crossfading ? 0 : targetVolume(),
      onload: () => emit({ duration: h.duration() }),
      onplay: () => {
        rafRef.current = requestAnimationFrame(tickRef.current);
        if (crossfading) h.fade(0, targetVolume(), CROSSFADE_MS);
      },
      onpause: () => cancelAnimationFrame(rafRef.current),
      onstop: () => {
        cancelAnimationFrame(rafRef.current);
        emit({ elapsed: 0 });
      },
      onend: () => {
        cancelAnimationFrame(rafRef.current);
        const { playlistMood, tracks: allTracks, currentTrackId: nowId, playTrack } =
          useMusicStore.getState();
        if (loopEnabled) {
          // Restart from silence and fade in.
          // html5 audio nodes must be stop()ed before replaying — a bare
          // seek(0) + play() leaves the element in its "ended" state.
          h.stop();
          h.volume(0);
          h.play();
          h.fade(0, targetVolume(), FADE_MS);
        } else if (playlistMood) {
          // Mood playlist: advance to a random other track with this mood
          const pool = allTracks.filter(
            (t) => t.moods?.includes(playlistMood) && t.id !== nowId
          );
          if (pool.length > 0) {
            playTrack(pool[Math.floor(Math.random() * pool.length)].id);
          } else {
            setIsPlaying(false);
          }
        } else {
          setIsPlaying(false);
        }
      },
    });

    howl = h;
    loadedTrackId = currentTrackId;

    if (isPlaying) h.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackId]);

  // Play / pause
  useEffect(() => {
    if (!howl || loadedTrackId !== currentTrackId) return;
    if (isPlaying) {
      if (!howl.playing()) howl.play();
    } else {
      howl.pause();
    }
  }, [isPlaying, currentTrackId]);

  // Keep module-level loop flag in sync
  useEffect(() => {
    loopEnabled = loop;
  }, [loop]);

  // Volume
  useEffect(() => {
    howl?.volume(targetVolume());
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Dev-only inspection handle (harmless in prod builds)
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__music = () => ({
      loadedTrackId,
      state: howl?.state(),
      playing: howl?.playing(),
      seek: howl?.seek(),
      volume: howl?.volume(),
    });
  }

  return null;
}

/** Read-only progress view of the engine for UI components. */
export function useMusicPlayer() {
  const snap = useSyncExternalStore(subscribeProgress, getProgressSnapshot);
  const pct = snap.duration > 0 ? (snap.elapsed / snap.duration) * 100 : 0;
  return {
    elapsed: snap.elapsed,
    duration: snap.duration,
    progress: pct,
    seekTo,
    formatTime,
  };
}
