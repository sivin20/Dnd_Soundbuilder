import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import type { Sound } from '../../types';
import { useSoundStore } from '../../store/soundStore';
import VolumeSlider from '../shared/VolumeSlider';

interface Props {
  sound: Sound;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function OneShotSound({ sound }: Props) {
  const { setVolume, removeSound, renameSound } = useSoundStore();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(sound.name);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);   // 0–100
  const [elapsed, setElapsed] = useState(0);      // seconds
  const [duration, setDuration] = useState(0);    // seconds

  const howlRef = useRef<Howl | null>(null);
  const rafRef  = useRef<number>(0);

  // Preload on mount to grab duration
  useEffect(() => {
    const h = new Howl({
      src: [sound.url],
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
  }, [sound.url]);

  // Keep volume in sync without reloading
  useEffect(() => {
    if (howlRef.current && !playing) {
      howlRef.current.volume(sound.volume / 100);
    }
  }, [sound.volume, playing]);

  const tick = () => {
    const h = howlRef.current;
    if (!h || !h.playing()) return;
    const seek = h.seek() as number;
    const dur  = h.duration();
    setElapsed(seek);
    setProgress(dur > 0 ? (seek / dur) * 100 : 0);
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleTrigger = () => {
    cancelAnimationFrame(rafRef.current);

    // Rebuild Howl so clicking again restarts cleanly
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
    }

    const h = new Howl({
      src: [sound.url],
      loop: false,
      volume: sound.volume / 100,
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

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    howlRef.current?.stop();
  };

  const handleRename = () => {
    if (editName.trim()) renameSound(sound.id, editName.trim());
    setEditing(false);
  };

  return (
    <div className="group bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl p-4 transition-all">

      {/* Trigger button */}
      <button
        onClick={handleTrigger}
        className={`relative w-full h-16 rounded-lg mb-2 flex items-center justify-center text-3xl transition-all duration-150 overflow-hidden ${
          playing
            ? 'bg-amber-900/40 border border-amber-700/50'
            : 'bg-stone-800 hover:bg-stone-700 active:bg-amber-800 active:scale-95'
        }`}
        title={playing ? 'Click to restart' : `Play: ${sound.name}`}
      >
        {/* Progress fill */}
        {playing && (
          <div
            className="absolute inset-0 bg-amber-700/20 transition-none origin-left"
            style={{ transform: `scaleX(${progress / 100})`, transformOrigin: 'left' }}
          />
        )}
        <span className="relative z-10">{sound.emoji}</span>

        {/* Stop button — appears while playing */}
        {playing && (
          <span
            onClick={handleStop}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-xs bg-stone-900/80 hover:bg-red-900/60 text-stone-400 hover:text-red-400 rounded px-1.5 py-0.5 font-sans transition-all"
            title="Stop"
          >
            ⏹
          </span>
        )}
      </button>

      {/* Progress bar */}
      <div className="w-full h-1 bg-stone-800 rounded-full mb-2 overflow-hidden">
        <div
          className="h-full bg-amber-600 rounded-full transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between items-center mb-2 font-sans tabular-nums">
        <span className="text-xs text-stone-500">{formatTime(elapsed)}</span>
        <span className="text-xs text-stone-600">{duration > 0 ? formatTime(duration) : '—'}</span>
      </div>

      {/* Name */}
      {editing ? (
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') { setEditName(sound.name); setEditing(false); }
          }}
          className="w-full bg-stone-800 border border-amber-700 text-parchment rounded px-2 py-1 text-xs font-serif focus:outline-none mb-2"
        />
      ) : (
        <p className="text-parchment font-serif text-sm text-center truncate mb-2">
          {sound.name}
        </p>
      )}

      <VolumeSlider
        value={sound.volume}
        onChange={(v) => setVolume(sound.id, v)}
        label={`${sound.name} volume`}
      />

      {/* Actions */}
      <div className="flex gap-1 mt-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => { setEditName(sound.name); setEditing(true); }}
          className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-500 hover:text-stone-300 text-xs font-sans transition-all"
        >
          ✏️ Rename
        </button>
        <button
          onClick={() => removeSound(sound.id)}
          className="px-2 py-1 rounded bg-stone-800 hover:bg-red-900/60 text-stone-500 hover:text-red-400 text-xs font-sans transition-all"
        >
          🗑 Remove
        </button>
      </div>
    </div>
  );
}
