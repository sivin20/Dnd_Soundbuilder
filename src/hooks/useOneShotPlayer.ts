import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function useOneShotPlayer(url: string, volume: number) {
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);   // 0–100
  const [elapsed, setElapsed]   = useState(0);   // seconds
  const [duration, setDuration] = useState(0);   // seconds

  const howlRef = useRef<Howl | null>(null);
  const rafRef  = useRef<number>(0);

  // Preload on mount to get duration early
  useEffect(() => {
    const h = new Howl({
      src: [url],
      loop: false,
      preload: true,
      onload: () => setDuration(h.duration()),
    });
    howlRef.current = h;
    return () => {
      cancelAnimationFrame(rafRef.current);
      h.stop();
      h.unload();
    };
  }, [url]);

  // Sync volume when it changes (only while not playing)
  useEffect(() => {
    if (howlRef.current && !playing) {
      howlRef.current.volume(volume / 100);
    }
  }, [volume, playing]);

  const tick = () => {
    const h = howlRef.current;
    if (!h || !h.playing()) return;
    const seek = h.seek() as number;
    const dur  = h.duration();
    setElapsed(seek);
    setProgress(dur > 0 ? (seek / dur) * 100 : 0);
    rafRef.current = requestAnimationFrame(tick);
  };

  const trigger = () => {
    cancelAnimationFrame(rafRef.current);
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
    }

    const h = new Howl({
      src: [url],
      loop: false,
      volume: volume / 100,
      onload: () => setDuration(h.duration()),
      onplay: () => {
        setPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
      },
      onend: () => {
        setPlaying(false);
        setProgress(100);
        setElapsed(h.duration());
        cancelAnimationFrame(rafRef.current);
      },
      onstop: () => {
        setPlaying(false);
        setProgress(0);
        setElapsed(0);
        cancelAnimationFrame(rafRef.current);
      },
    });

    howlRef.current = h;
    h.play();
  };

  const stop = () => howlRef.current?.stop();

  return { playing, progress, elapsed, duration, trigger, stop };
}
