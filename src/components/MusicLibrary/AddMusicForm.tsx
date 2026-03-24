import { useState } from 'react';
import { extractVideoId, fetchVideoTitle } from '../../utils/youtube';
import { useMusicStore } from '../../store/musicStore';

export default function AddMusicForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const addTrack = useMusicStore((s) => s.addTrack);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      setError('Invalid YouTube URL. Paste a full YouTube link or video ID.');
      return;
    }
    setLoading(true);
    try {
      const title = await fetchVideoTitle(url.trim());
      addTrack({ url: url.trim(), videoId, title, customName: title });
      setUrl('');
    } catch {
      setError('Failed to fetch video info. Check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 shadow-lg">
      <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-3">
        Add Track from YouTube
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError('');
            }}
            placeholder="Paste YouTube URL here…"
            className="flex-1 bg-stone-800 border border-stone-700 text-parchment placeholder-stone-600 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:border-amber-700 transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-5 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-parchment rounded-lg font-sans text-sm font-medium transition-all"
          >
            {loading ? '⏳' : '+ Add'}
          </button>
        </div>
        {error && (
          <p className="text-red-400 text-xs font-sans">{error}</p>
        )}
        <p className="text-stone-600 text-xs font-sans">
          Supports youtube.com/watch?v=, youtu.be/, and youtube.com/shorts/ links
        </p>
      </form>
    </div>
  );
}
