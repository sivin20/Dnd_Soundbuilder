import { useState } from 'react';
import { useMusicStore } from '../../store/musicStore';

export default function AddMusicForm() {
  const [filename, setFilename] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const addTrack = useMusicStore((s) => s.addTrack);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const file = filename.trim();
    if (!file) { setError('Filename is required.'); return; }
    if (!file.match(/\.(mp3|ogg|wav|flac|m4a)$/i)) {
      setError('File must be an audio file (.mp3, .ogg, .wav, .flac, .m4a)');
      return;
    }
    const name = displayName.trim() || file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    addTrack({ filename: file, title: name, customName: name });
    setFilename('');
    setDisplayName('');
  };

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 shadow-lg">
      <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-3">
        Add Track
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={filename}
            onChange={(e) => { setFilename(e.target.value); setError(''); }}
            placeholder="filename.mp3"
            className="flex-1 bg-stone-800 border border-stone-700 text-parchment placeholder-stone-600 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:border-amber-700 transition-colors"
          />
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name (optional)"
            className="flex-1 bg-stone-800 border border-stone-700 text-parchment placeholder-stone-600 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:border-amber-700 transition-colors"
          />
          <button
            type="submit"
            disabled={!filename.trim()}
            className="px-5 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-parchment rounded-lg font-sans text-sm font-medium transition-all"
          >
            + Add
          </button>
        </div>
        {error && <p className="text-red-400 text-xs font-sans">{error}</p>}
        <p className="text-stone-600 text-xs font-sans">
          Place the audio file in <code className="bg-stone-800 px-1 rounded text-stone-400">public/music/</code>, then enter its filename here.
          Download with: <code className="bg-stone-800 px-1 rounded text-stone-400">yt-dlp --extract-audio --audio-format mp3 --restrict-filenames -o "public/music/%(title)s.%(ext)s" URL</code>
        </p>
      </form>
    </div>
  );
}
