import { useEffect, useMemo, useState } from 'react';
import { loadPageToc } from '../../utils/obsidianMarkdown';
import type { TocEntry } from '../../utils/obsidianMarkdown';
import { useCampaignStore, sceneKey } from '../../store/campaignStore';
import { SCENE_STATUS, SCENE_STATUS_ORDER, isPlayableScene } from '../../data/sceneStatus';
import type { ArcDef } from '../../data/campaignArcs';
import type { SceneStatus } from '../../types';

interface Props {
  arc: ArcDef;
  /** Jump to the scene in the Guide tab. */
  onOpenScene: (headingId: string) => void;
}

/**
 * Scene-by-scene tracker for one arc. Beyond done/not-done it records scenes
 * that happened differently, which is the useful state when a table refuses the
 * order Reloaded assumes — along with a note of what they actually did.
 */
export default function ArcProgress({ arc, onOpenScene }: Props) {
  // Keyed by path rather than reset in the effect, so switching arcs can't
  // briefly show the previous arc's scenes.
  const [loaded, setLoaded] = useState<{ path: string; toc: TocEntry[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);

  const { sceneProgress, setSceneStatus, setSceneNote } = useCampaignStore();

  useEffect(() => {
    let cancelled = false;
    loadPageToc(arc.mdPath)
      .then((entries) => { if (!cancelled) setLoaded({ path: arc.mdPath, toc: entries }); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, [arc.mdPath]);

  const toc = loaded?.path === arc.mdPath ? loaded.toc : null;

  const scenes = useMemo(
    () => (toc ?? []).filter((t) => isPlayableScene(t.text, t.level)),
    [toc]
  );

  const counts = useMemo(() => {
    const tally: Record<SceneStatus, number> = { todo: 0, done: 0, diverged: 0, skipped: 0 };
    for (const s of scenes) {
      tally[sceneProgress[sceneKey(arc.mdPath, s.id)]?.status ?? 'todo'] += 1;
    }
    return tally;
  }, [scenes, sceneProgress, arc.mdPath]);

  if (error) {
    return (
      <div className="text-center py-10 text-stone-500 font-sans text-sm">
        <p className="text-3xl mb-2">🗺</p>
        <p>Couldn't read this arc's scenes.</p>
        <p className="text-stone-600 text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (!toc) {
    return <p className="text-stone-600 font-sans text-sm italic py-8 text-center">Reading the arc…</p>;
  }

  const played = counts.done + counts.diverged;

  return (
    <div>
      <p className="text-xs text-stone-500 font-sans mb-3">
        {scenes.length} scenes · {played} played
        {counts.diverged > 0 && <span className="text-amber-600"> ({counts.diverged} differently)</span>}
        {counts.skipped > 0 && <span className="text-stone-500"> · {counts.skipped} skipped</span>}
      </p>

      {/* Progress bar by status */}
      <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-stone-800 mb-5">
        {(['done', 'diverged', 'skipped'] as SceneStatus[]).map((s) =>
          counts[s] > 0 ? (
            <div
              key={s}
              className={SCENE_STATUS[s].dot}
              style={{ width: `${(counts[s] / scenes.length) * 100}%` }}
              title={`${counts[s]} ${SCENE_STATUS[s].label.toLowerCase()}`}
            />
          ) : null
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {scenes.map((scene) => {
          const key = sceneKey(arc.mdPath, scene.id);
          const progress = sceneProgress[key];
          const status: SceneStatus = progress?.status ?? 'todo';
          const meta = SCENE_STATUS[status];
          const noteOpen = openNote === key || (!!progress?.note && status !== 'todo');

          return (
            <div key={scene.id} className={`rounded-lg border px-3 py-2 transition-colors ${meta.row}`}>
              <div className="flex items-center gap-2.5">
                {/* Status picker */}
                <div className="flex gap-1 flex-shrink-0">
                  {SCENE_STATUS_ORDER.filter((s) => s !== 'todo').map((s) => {
                    const active = status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setSceneStatus(key, active ? 'todo' : s)}
                        className={`w-6 h-6 rounded border text-xs flex items-center justify-center transition-colors ${
                          active
                            ? SCENE_STATUS[s].button
                            : 'bg-stone-800 border-stone-700 text-stone-600 hover:border-stone-500'
                        }`}
                        title={`${SCENE_STATUS[s].label} — ${SCENE_STATUS[s].hint}`}
                      >
                        {SCENE_STATUS[s].icon}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => onOpenScene(scene.id)}
                  className={`text-sm font-sans text-left truncate flex-1 min-w-0 hover:text-amber-300 transition-colors ${
                    scene.level > 1 ? 'text-stone-400 pl-3' : 'text-parchment'
                  }`}
                  title="Open this scene in the guide"
                >
                  {scene.text}
                </button>

                <button
                  onClick={() => setOpenNote(noteOpen && openNote === key ? null : key)}
                  className={`text-xs flex-shrink-0 transition-colors ${
                    progress?.note ? 'text-amber-600 hover:text-amber-400' : 'text-stone-700 hover:text-stone-400'
                  }`}
                  title={progress?.note ? 'Edit what happened' : 'Note what happened'}
                >
                  {progress?.note ? '📝' : '＋'}
                </button>
              </div>

              {noteOpen && (
                <textarea
                  value={progress?.note ?? ''}
                  onChange={(e) => setSceneNote(key, e.target.value)}
                  rows={2}
                  placeholder={
                    status === 'diverged'
                      ? 'What did they do instead? How did you bring it back?'
                      : 'What happened here?'
                  }
                  className="w-full mt-2 bg-stone-950/70 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-stone-300 placeholder-stone-600 font-sans focus:outline-none focus:border-amber-700/60 resize-y"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
