import { useState } from 'react';
import type { Track } from '../../types';
import { useMusicStore } from '../../store/musicStore';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';

interface Props {
  track: Track;
}

export default function MusicCard({ track }: Props) {
  const { currentTrackId, isPlaying, playTrack, setIsPlaying, removeTrack, renameTrack } = useMusicStore();
  const { elapsed, duration, progress, seekTo, formatTime } = useMusicPlayer();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(track.customName || track.title);

  const isActive = currentTrackId === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;
  const displayName = track.customName || track.title;

  const handlePlay = () => {
    if (isActive) setIsPlaying(!isPlaying);
    else playTrack(track.id);
  };

  const handleRename = () => {
    if (editName.trim()) renameTrack(track.id, editName.trim());
    setEditing(false);
  };

  return (
    <div className={`group rounded-xl border transition-all card-hover overflow-hidden ${
      isActive ? 'bg-amber-900/20 border-amber-700/50' : 'bg-stone-900 border-stone-800 hover:border-stone-700'
    }`}>
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-lg ${
          isActive ? 'bg-amber-700/50' : 'bg-stone-800'
        }`}>
          {isCurrentlyPlaying ? (
            <div className="flex gap-0.5 items-end h-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-0.5 bg-amber-300 rounded-sm playing-pulse"
                  style={{ height: `${35 + i * 20}%`, animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          ) : (
            <span>🎵</span>
          )}
        </div>

        {/* Name + time */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setEditName(track.customName || track.title); setEditing(false); }
              }}
              className="w-full bg-stone-800 border border-amber-700 text-parchment rounded px-2 py-1 text-sm font-serif focus:outline-none"
            />
          ) : (
            <p className={`font-serif font-semibold truncate text-sm leading-tight ${
              isActive ? 'text-amber-300' : 'text-parchment'
            }`}>
              {displayName}
            </p>
          )}
          <p className="text-stone-600 text-xs font-sans font-mono truncate mt-0.5">
            {isActive && duration > 0
              ? `${formatTime(elapsed)} / ${formatTime(duration)}`
              : track.filename}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handlePlay}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all text-sm ${
              isCurrentlyPlaying
                ? 'bg-amber-700 text-white'
                : 'bg-stone-800 text-stone-300 hover:bg-amber-800 hover:text-white'
            }`}
          >
            {isCurrentlyPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => { setEditName(track.customName || track.title); setEditing(true); }}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-800 text-stone-500 hover:bg-stone-700 hover:text-stone-300 transition-all opacity-0 group-hover:opacity-100 text-xs"
          >
            ✏️
          </button>
          <button
            onClick={() => removeTrack(track.id)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-800 text-stone-500 hover:bg-red-900/60 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 text-xs"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Seekable progress bar — only on active track */}
      {isActive && (
        <div
          className="h-1 bg-stone-800 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo(((e.clientX - rect.left) / rect.width) * 100);
          }}
        >
          <div
            className="h-full bg-amber-700/70 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
