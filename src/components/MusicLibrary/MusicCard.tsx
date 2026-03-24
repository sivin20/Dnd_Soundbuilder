import { useState } from 'react';
import type { Track } from '../../types';
import { getThumbnailUrl } from '../../utils/youtube';
import { useMusicStore } from '../../store/musicStore';

interface Props {
  track: Track;
}

export default function MusicCard({ track }: Props) {
  const { currentTrackId, isPlaying, playTrack, setIsPlaying, removeTrack, renameTrack } =
    useMusicStore();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(track.customName || track.title);

  const isActive = currentTrackId === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  const displayName = track.customName || track.title;

  const handlePlay = () => {
    if (isActive) {
      setIsPlaying(!isPlaying);
    } else {
      playTrack(track.id);
    }
  };

  const handleRename = () => {
    if (editName.trim()) {
      renameTrack(track.id, editName.trim());
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setEditName(track.customName || track.title);
      setEditing(false);
    }
  };

  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all card-hover ${
        isActive
          ? 'bg-amber-900/20 border-amber-700/50'
          : 'bg-stone-900 border-stone-800 hover:border-stone-700'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0">
        <img
          src={getThumbnailUrl(track.videoId)}
          alt={displayName}
          className="w-20 h-13 object-cover rounded-lg border border-stone-700"
          style={{ height: '52px' }}
        />
        {isActive && (
          <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
            {isCurrentlyPlaying && (
              <div className="flex gap-0.5 items-end h-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-amber-400 rounded-sm playing-pulse"
                    style={{ height: `${40 + i * 20}%`, animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="w-full bg-stone-800 border border-amber-700 text-parchment rounded px-2 py-1 text-sm font-serif focus:outline-none"
          />
        ) : (
          <div>
            <p
              className={`font-serif truncate text-sm font-semibold leading-tight ${
                isActive ? 'text-amber-300' : 'text-parchment'
              }`}
            >
              {displayName}
            </p>
            {track.customName && track.customName !== track.title && (
              <p className="text-stone-600 text-xs font-sans truncate mt-0.5">
                {track.title}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Play/Pause */}
        <button
          onClick={handlePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all text-sm ${
            isCurrentlyPlaying
              ? 'bg-amber-700 text-white'
              : 'bg-stone-800 text-stone-300 hover:bg-amber-800 hover:text-white'
          }`}
          title={isCurrentlyPlaying ? 'Pause' : 'Play'}
        >
          {isCurrentlyPlaying ? '⏸' : '▶'}
        </button>

        {/* Rename */}
        <button
          onClick={() => {
            setEditName(track.customName || track.title);
            setEditing(true);
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-800 text-stone-500 hover:bg-stone-700 hover:text-stone-300 transition-all opacity-0 group-hover:opacity-100 text-xs"
          title="Rename"
        >
          ✏️
        </button>

        {/* Delete */}
        <button
          onClick={() => removeTrack(track.id)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-800 text-stone-500 hover:bg-red-900/60 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 text-xs"
          title="Remove"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
