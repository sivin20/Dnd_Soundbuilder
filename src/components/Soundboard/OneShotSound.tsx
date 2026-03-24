import { useState } from 'react';
import type { Sound } from '../../types';
import { useSoundStore } from '../../store/soundStore';
import VolumeSlider from '../shared/VolumeSlider';

interface Props {
  sound: Sound;
}

export default function OneShotSound({ sound }: Props) {
  const { triggerOneShot, setVolume, removeSound, renameSound } = useSoundStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(sound.name);
  const [fired, setFired] = useState(false);

  const handleTrigger = () => {
    triggerOneShot(sound.id);
    setFired(true);
    setTimeout(() => setFired(false), 300);
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
        className={`w-full h-16 rounded-lg mb-3 flex items-center justify-center text-3xl transition-all duration-150 ${
          fired
            ? 'bg-amber-700 scale-95'
            : 'bg-stone-800 hover:bg-stone-700 active:bg-amber-800 active:scale-95'
        }`}
        title={`Play: ${sound.name}`}
      >
        {sound.emoji}
      </button>

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
