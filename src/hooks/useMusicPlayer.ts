import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import { useMusicStore } from '../store/musicStore';

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Module-level singleton so the Howl outlives component re-renders
let howl: Howl | null = null;
let loadedTrackId: string | null = null;

export function useMusicPlayer() {
  const { tracks, currentTrackId, isPlaying, volume, setIsPlaying } = useMusicStore();

  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const rafRef = useRef<number>(0);

  const currentTrack = tracks.find((t) => t.id === currentTrackId) ?? null;

  // Stable tick via ref so it can reference itself recursively
  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
    if (!howl || !howl.playing()) return;
    const seek = howl.seek() as number;
    setElapsed(seek);
    rafRef.current = requestAnimationFrame(tickRef.current);
  };

  // Load new track when currentTrackId changes
  useEffect(() => {
    if (!currentTrack) {
      howl?.stop();
      howl?.unload();
      howl = null;
      loadedTrackId = null;
      cancelAnimationFrame(rafRef.current);
      setElapsed(0);
      setDuration(0);
      return;
    }

    // Same track already loaded — don't reload
    if (currentTrackId === loadedTrackId && howl) return;

    // Swap track
    cancelAnimationFrame(rafRef.current);
    howl?.stop();
    howl?.unload();
    setElapsed(0);
    setDuration(0);

    const h = new Howl({
      src: [`/music/${currentTrack.filename}`],
      html5: true, // stream large files instead of buffering all at once
      loop: false,
      volume: volume / 100,
      onload: () => setDuration(h.duration()),
      onplay: () => { rafRef.current = requestAnimationFrame(tickRef.current); },
      onpause: () => cancelAnimationFrame(rafRef.current),
      onstop: () => {
        cancelAnimationFrame(rafRef.current);
        setElapsed(0);
      },
      onend: () => {
        cancelAnimationFrame(rafRef.current);
        setIsPlaying(false);
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

  // Volume
  useEffect(() => {
    howl?.volume(volume / 100);
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const seekTo = (pct: number) => {
    if (!howl) return;
    howl.seek((howl.duration() * pct) / 100);
    setElapsed((howl.duration() * pct) / 100);
  };

  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  return { elapsed, duration, progress, seekTo, formatTime };
}
