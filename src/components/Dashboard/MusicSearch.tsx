import { useState, useRef, useEffect, useMemo } from 'react';
import { useMusicStore } from '../../store/musicStore';
import { sectionOrder } from '../../data/sections';
import { CAMPAIGN_ARCS, ACTS } from '../../data/campaignArcs';
import type { Track } from '../../types';

const MOOD_CHIPS: { mood: string; label: string }[] = [
  { mood: 'exploration', label: '🧭 Exploration' },
  { mood: 'combat', label: '⚔️ Combat' },
  { mood: 'tavern', label: '🍺 Tavern' },
  { mood: 'creepy', label: '🕯 Creepy' },
  { mood: 'somber', label: '🥀 Somber' },
  { mood: 'epic', label: '🏔 Epic' },
];

export default function MusicSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [arcFilter, setArcFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { tracks, currentTrackId, isPlaying, playTrack, setIsPlaying, playlistMood, playMood, setPlaylistMood } =
    useMusicStore();

  const results = useMemo(() => {
    let list = tracks;
    if (arcFilter) {
      const arc = CAMPAIGN_ARCS.find((a) => a.id === arcFilter);
      if (arc) list = list.filter((t) => t.section && arc.musicSections.includes(t.section));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          (t.customName || t.title).toLowerCase().includes(q) ||
          t.section?.toLowerCase().includes(q) ||
          t.moods?.some((m) => m.includes(q))
      );
    }
    return list;
  }, [tracks, query, arcFilter]);

  // Group results by campaign section, in campaign order
  const grouped = useMemo(() => {
    const map = new Map<string, Track[]>();
    for (const t of results) {
      const key = t.section ?? 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()].sort((a, b) => sectionOrder(a[0]) - sectionOrder(b[0]));
  }, [results]);


  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (id: string) => {
    if (currentTrackId === id) {
      setIsPlaying(!isPlaying);
    } else {
      playTrack(id);
    }
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center gap-2 bg-stone-900 border rounded-xl px-4 py-2.5 transition-colors ${
        open ? 'border-amber-700/60' : 'border-stone-800 hover:border-stone-700'
      }`}>
        <span className="text-stone-500 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search music by name, chapter or mood…"
          className="flex-1 bg-transparent text-parchment placeholder-stone-600 text-sm font-sans focus:outline-none"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="text-stone-600 hover:text-stone-400 text-xs transition-colors"
          >
            ✕
          </button>
        )}
        <select
          value={arcFilter ?? ''}
          onChange={(e) => { setArcFilter(e.target.value || null); setOpen(true); }}
          onClick={(e) => e.stopPropagation()}
          className="bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-400 font-sans px-2 py-1 focus:outline-none focus:border-amber-700/60 max-w-48"
          title="Filter by campaign arc"
        >
          <option value="">Whole campaign</option>
          {ACTS.map((act) => (
            <optgroup key={act} label={act}>
              {CAMPAIGN_ARCS.filter((a) => a.act === act).map((a) => (
                <option key={a.id} value={a.id}>
                  Arc {a.code} — {a.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Mood playlist chips */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className="text-xs text-stone-600 font-sans mr-1">Shuffle:</span>
        {MOOD_CHIPS.map(({ mood, label }) => {
          const active = playlistMood === mood;
          return (
            <button
              key={mood}
              onClick={() => (active ? setPlaylistMood(null) : playMood(mood))}
              className={`text-xs font-sans px-2.5 py-1 rounded-full border transition-all ${
                active
                  ? 'bg-amber-700/50 border-amber-600/60 text-amber-200'
                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-amber-800/50 hover:text-stone-300'
              }`}
              title={
                active
                  ? 'Playlist on — tracks auto-advance within this mood. Click to turn off.'
                  : `Play a random ${mood} track and keep shuffling within the mood`
              }
            >
              {label}
              {active && <span className="ml-1">✕</span>}
            </button>
          );
        })}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {grouped.map(([section, sectionTracks]) => (
            <div key={section}>
              <div className="sticky top-0 bg-stone-950/95 backdrop-blur-sm px-4 py-1.5 border-b border-stone-800">
                <span className="text-[11px] uppercase tracking-widest text-amber-700 font-sans">
                  {section}
                </span>
              </div>
              {sectionTracks.map((track) => {
                const isActive = track.id === currentTrackId;
                const isCurrentlyPlaying = isActive && isPlaying;
                const displayName = track.customName || track.title;

                return (
                  <button
                    key={track.id}
                    onClick={() => handleSelect(track.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-stone-800/60 last:border-0 ${
                      isActive
                        ? 'bg-amber-900/20 hover:bg-amber-900/30'
                        : 'hover:bg-stone-800'
                    }`}
                  >
                    <span className={`text-sm flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-stone-500'}`}>
                      {isCurrentlyPlaying ? '⏸' : '▶'}
                    </span>
                    <span className={`font-serif text-sm truncate flex-1 ${isActive ? 'text-amber-300' : 'text-parchment'}`}>
                      {displayName}
                    </span>
                    {track.moods && (
                      <span className="text-[10px] text-stone-600 font-sans flex-shrink-0 hidden sm:block">
                        {track.moods.join(' · ')}
                      </span>
                    )}
                    {isCurrentlyPlaying && (
                      <div className="flex gap-0.5 items-end h-3 flex-shrink-0">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-amber-500 rounded-sm playing-pulse"
                            style={{ height: `${35 + i * 20}%`, animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl z-50">
          <p className="px-4 py-3 text-stone-600 text-sm font-sans italic">
            No tracks matching "{query}"
          </p>
        </div>
      )}
    </div>
  );
}
