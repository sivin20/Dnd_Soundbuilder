import { useState } from 'react';
import { useSoundStore } from '../../store/soundStore';
import type { SoundType } from '../../types';

const EMOJI_OPTIONS = [
  '🌬️', '🌧️', '🔥', '🌊', '⚡', '🐺', '🦇', '🦅', '🐉',
  '🌲', '🍃', '🌌', '⚔️', '🔔', '🥁', '🪕', '🎺', '🎻',
  '💥', '🪄', '🗡️', '🛡️', '🏰', '🌕', '👣', '🐎', '🧙',
];

interface Props {
  defaultType?: SoundType;
}

export default function AddSoundForm({ defaultType = 'ambient' }: Props) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<SoundType>(defaultType);
  const [emoji, setEmoji] = useState('🌬️');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState('');

  const addSound = useSoundStore((s) => s.addSound);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!url.trim()) { setError('Audio URL is required.'); return; }
    addSound({ name: name.trim(), url: url.trim(), type, emoji, volume: 80 });
    setName('');
    setUrl('');
  };

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 shadow-lg">
      <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-4">
        Add Sound
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Type selector */}
        <div className="flex gap-2">
          {(['ambient', 'oneshot'] as SoundType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-sans transition-all ${
                type === t
                  ? 'bg-amber-800/60 text-amber-300 border border-amber-700/60'
                  : 'bg-stone-800 text-stone-500 border border-stone-700 hover:text-stone-300'
              }`}
            >
              {t === 'ambient' ? '🔁 Ambient Loop' : '▶ One-Shot SFX'}
            </button>
          ))}
        </div>

        {/* Name + emoji */}
        <div className="flex gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-11 h-11 bg-stone-800 border border-stone-700 rounded-lg text-xl hover:border-amber-700 transition-colors flex items-center justify-center"
            >
              {emoji}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-12 left-0 z-50 bg-stone-800 border border-stone-700 rounded-xl p-2 shadow-xl grid grid-cols-7 gap-1 w-60">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => { setEmoji(em); setShowEmojiPicker(false); }}
                    className="w-8 h-8 text-lg hover:bg-stone-700 rounded transition-colors flex items-center justify-center"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sound name (e.g. Rain)"
            className="flex-1 bg-stone-800 border border-stone-700 text-parchment placeholder-stone-600 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:border-amber-700 transition-colors"
          />
        </div>

        {/* URL */}
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="Direct audio file URL (.mp3, .ogg, .wav)"
            className="flex-1 bg-stone-800 border border-stone-700 text-parchment placeholder-stone-600 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:border-amber-700 transition-colors"
          />
          <button
            type="submit"
            disabled={!name.trim() || !url.trim()}
            className="px-5 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-parchment rounded-lg font-sans text-sm font-medium transition-all"
          >
            + Add
          </button>
        </div>

        {error && <p className="text-red-400 text-xs font-sans">{error}</p>}

        <p className="text-stone-600 text-xs font-sans">
          Use direct links to .mp3/.ogg/.wav files. Try freesound.org, Pixabay, or Zapsplat for free DnD sounds.
        </p>
      </form>
    </div>
  );
}
