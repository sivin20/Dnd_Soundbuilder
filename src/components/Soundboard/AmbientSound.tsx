import { useState } from 'react';
import type { Sound } from '../../types';
import { useSoundStore } from '../../store/soundStore';
import VolumeSlider from '../shared/VolumeSlider';

interface Props {
  sound: Sound;
}

export default function AmbientSound({ sound }: Props) {
  const { toggleAmbient, setVolume, removeSound, renameSound } = useSoundStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(sound.name);

  const handleRename = () => {
    if (editName.trim()) renameSound(sound.id, editName.trim());
    setEditing(false);
  };

  return (
    <div
      className={`group rounded-xl border p-4 transition-all ${
        sound.isActive
          ? 'bg-amber-900/20 border-amber-700/50 shadow-lg shadow-amber-900/10'
          : 'bg-stone-900 border-stone-800 hover:border-stone-700'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Toggle button */}
        <button
          onClick={() => toggleAmbient(sound.id)}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all flex-shrink-0 ${
            sound.isActive
              ? 'bg-amber-700 shadow-md shadow-amber-900/50 scale-105'
              : 'bg-stone-800 hover:bg-stone-700'
          }`}
          title={sound.isActive ? 'Stop' : 'Start looping'}
        >
          {sound.emoji}
        </button>

        {/* Name */}
        <div className="flex-1 min-w-0">
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
              className="w-full bg-stone-800 border border-amber-700 text-parchment rounded px-2 py-1 text-sm font-serif focus:outline-none"
            />
          ) : (
            <p className={`font-serif font-semibold truncate ${sound.isActive ? 'text-amber-300' : 'text-parchment'}`}>
              {sound.name}
            </p>
          )}
          {sound.isActive && (
            <p className="text-xs text-amber-600/80 font-sans playing-pulse">● looping</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setEditName(sound.name); setEditing(true); }}
            className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-500 hover:text-stone-300 flex items-center justify-center text-xs transition-all"
            title="Rename"
          >
            ✏️
          </button>
          <button
            onClick={() => removeSound(sound.id)}
            className="w-7 h-7 rounded bg-stone-800 hover:bg-red-900/60 text-stone-500 hover:text-red-400 flex items-center justify-center text-xs transition-all"
            title="Remove"
          >
            🗑
          </button>
        </div>
      </div>

      <VolumeSlider
        value={sound.volume}
        onChange={(v) => setVolume(sound.id, v)}
        label={`${sound.name} volume`}
      />
    </div>
  );
}
