import { useState } from 'react';
import { useMusicStore } from '../../store/musicStore';
import { panicStop } from '../../audio/panic';

export default function CombatButton() {
  const { tracks, combatActive, combatTrackId, enterCombat, exitCombat } = useMusicStore();
  const [picking, setPicking] = useState(false);

  const combatTracks = tracks.filter((t) => t.moods?.includes('combat'));
  const savedCombatTrack = tracks.find((t) => t.id === combatTrackId) ?? null;

  const handleMainClick = () => {
    if (combatActive) {
      exitCombat();
      return;
    }
    if (savedCombatTrack) enterCombat(savedCombatTrack.id);
    else setPicking(true);
  };

  return (
    <div
      className={`rounded-xl border p-4 shadow-xl transition-all ${
        combatActive
          ? 'bg-red-950/60 border-red-700/60 shadow-red-900/30'
          : 'bg-stone-900 border-amber-900/30'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={handleMainClick}
          className={`flex-1 h-12 rounded-lg font-serif font-bold text-lg tracking-wide transition-all active:scale-95 ${
            combatActive
              ? 'bg-red-700 hover:bg-red-600 text-red-100 animate-pulse'
              : 'bg-red-900/70 hover:bg-red-800 text-red-200 border border-red-800/60'
          }`}
          title={
            combatActive
              ? 'End combat — restore previous music and ambience'
              : savedCombatTrack
                ? `Start combat: ${savedCombatTrack.customName || savedCombatTrack.title}`
                : 'Pick a combat track'
          }
        >
          {combatActive ? '🕊 End Combat' : '⚔️ Combat!'}
        </button>

        <button
          onClick={() => setPicking(!picking)}
          className="h-12 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-amber-400 text-sm border border-stone-700 transition-colors"
          title="Choose combat track"
        >
          🎯
        </button>

        {/* Next to Combat! because that's where your hand already is when the
            wrong thing is playing. */}
        <button
          onClick={panicStop}
          className="h-12 px-3 rounded-lg bg-stone-800 hover:bg-red-900/60 text-stone-400 hover:text-red-200 text-lg border border-stone-700 hover:border-red-700/60 transition-colors"
          title="Stop everything — music, ambience and one-shots — over a 2s fade (⌘.)"
        >
          🔇
        </button>
      </div>

      {!combatActive && savedCombatTrack && !picking && (
        <p className="text-xs text-stone-500 font-sans mt-2 truncate">
          Ready: {savedCombatTrack.customName || savedCombatTrack.title}
        </p>
      )}

      {picking && (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-stone-700 divide-y divide-stone-800/60">
          {combatTracks.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setPicking(false);
                enterCombat(t.id);
              }}
              className={`w-full text-left px-3 py-2 text-sm font-serif transition-colors ${
                t.id === combatTrackId
                  ? 'bg-red-900/30 text-red-300'
                  : 'bg-stone-900 text-parchment hover:bg-stone-800'
              }`}
            >
              <span className="text-stone-600 mr-2 text-xs">
                {t.moods?.includes('boss') ? '👑' : '⚔️'}
              </span>
              {t.customName || t.title}
              {t.section && <span className="text-stone-600 text-xs ml-2">{t.section}</span>}
            </button>
          ))}
          {combatTracks.length === 0 && (
            <p className="px-3 py-2 text-sm text-stone-600 italic font-sans">No combat-tagged tracks</p>
          )}
        </div>
      )}
    </div>
  );
}
