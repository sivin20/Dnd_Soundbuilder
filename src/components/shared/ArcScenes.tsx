import { useMemo } from 'react';
import { scenesForArc } from '../../data/arcScenes';
import { useSceneStore, presetIsPlayable } from '../../store/sceneStore';
import { useMusicStore } from '../../store/musicStore';

interface Props {
  arcId: string | null;
  /** Compact rendering for the dashboard rail / cards. */
  dense?: boolean;
}

/**
 * Ready-made scenes for an arc. One click sets music + ambient beds together —
 * these ship with the app, so there is nothing to prepare first.
 */
export default function ArcScenes({ arcId, dense = false }: Props) {
  const applyPreset = useSceneStore((s) => s.applyPreset);
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const tracks = useMusicStore((s) => s.tracks);

  const presets = useMemo(() => (arcId ? scenesForArc(arcId) : []), [arcId]);

  if (!arcId) {
    return (
      <p className="text-stone-600 text-sm font-sans italic">
        No arc selected — mark one as “We are here” in the campaign tracker.
      </p>
    );
  }

  if (presets.length === 0) {
    return (
      <p className="text-stone-600 text-sm font-sans italic">
        No ready-made scenes for this arc yet.
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap ${dense ? 'gap-1.5' : 'gap-2'}`}>
      {presets.map((preset) => {
        const playable = presetIsPlayable(preset, tracks);
        const isActive = activeSceneId === `preset:${preset.id}`;
        const isCombat = preset.kind === 'combat';

        return (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            disabled={!playable}
            title={
              playable
                ? [preset.hint, `Music: ${preset.tracks[0]}`,
                   preset.ambients.length
                     ? `Ambience: ${preset.ambients.map((a) => a.id).join(', ')}`
                     : 'No ambience']
                    .filter(Boolean).join('\n')
                : `Needs a track that isn't in the library: ${preset.tracks.join(' / ')}`
            }
            className={`text-left rounded-lg border transition-colors disabled:opacity-30 ${
              dense ? 'px-2.5 py-1.5' : 'px-3 py-2'
            } ${
              isActive
                ? isCombat
                  ? 'bg-red-900/40 border-red-700/60 text-red-200'
                  : 'bg-amber-900/30 border-amber-700/60 text-amber-300'
                : isCombat
                  ? 'bg-stone-800/70 border-red-900/40 text-stone-300 hover:border-red-700/60 hover:text-red-200'
                  : 'bg-stone-800/70 border-stone-700 text-parchment hover:border-amber-800/60 hover:text-amber-200'
            }`}
          >
            <span className={`font-serif ${dense ? 'text-xs' : 'text-sm'}`}>
              {isCombat && <span className="mr-1">⚔️</span>}
              {preset.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
