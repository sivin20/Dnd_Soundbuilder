import { useEffect, useRef, useState } from 'react';
import { useCueStore, cueKey } from '../../store/cueStore';
import { useSceneStore } from '../../store/sceneStore';
import { useMusicStore } from '../../store/musicStore';
import { useSoundStore } from '../../store/soundStore';

interface Props {
  mdPath: string;
  headingId: string;
  headingText: string;
}

/** Strip the scene number off a heading so scene names read cleanly:
 *  "B5a. The Barricade" → "The Barricade" */
function sceneNameFor(headingText: string): string {
  return headingText.replace(/^[A-Z]?\d+[a-z]?\.\s*/, '').trim() || headingText;
}

/**
 * The ▶ button that sits inside a guide heading. Portalled into the .cue-slot
 * span that the markdown renderer leaves behind on every heading.
 */
export default function HeadingCue({ mdPath, headingId, headingText }: Props) {
  // Selective subscriptions: a page can carry 100+ of these buttons, so none of
  // them should re-render for state they don't display. Actions are read from
  // getState() at call time (zustand keeps them stable).
  const cue = useCueStore((s) => s.cues[cueKey(mdPath, headingId)]);
  const scenes = useSceneStore((s) => s.scenes);
  const activeSceneId = useSceneStore((s) => s.activeSceneId);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const scene = cue ? scenes.find((s) => s.id === cue.sceneId) ?? null : null;
  const orphaned = !!cue && !scene;
  const isLive = !!scene && scene.id === activeSceneId;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const bind = (sceneId: string) => {
    useCueStore.getState().setCue({ mdPath, headingId, headingText, sceneId });
    setOpen(false);
  };

  const saveBoardAsCue = () => {
    const id = useSceneStore.getState().saveCurrentAsScene(sceneNameFor(headingText));
    useCueStore.getState().setCue({ mdPath, headingId, headingText, sceneId: id });
    setOpen(false);
  };

  return (
    <span ref={wrapRef} className="cue-anchor">
      <button
        onClick={() =>
          cue && scene
            ? useCueStore.getState().fireCue(mdPath, headingId)
            : setOpen(!open)
        }
        onContextMenu={(e) => { e.preventDefault(); setOpen(!open); }}
        className={`cue-button ${cue ? 'cue-button-bound' : ''} ${isLive ? 'cue-button-live' : ''}`}
        title={
          orphaned
            ? 'This cue points at a deleted scene — click to fix'
            : scene
              ? `Play cue: ${scene.name}  (right-click to change)`
              : 'Set a scene cue for this heading'
        }
      >
        {orphaned ? '⚠' : cue ? '▶' : '♪'}
      </button>

      {cue && scene && (
        <button onClick={() => setOpen(!open)} className="cue-label" title="Change or remove this cue">
          {scene.name}
        </button>
      )}

      {open && (
        <span className="cue-popover">
          <span className="cue-popover-title">
            {cue ? 'Cue' : 'Set cue'} — {headingText}
          </span>

          <BoardSummary />

          <button onClick={saveBoardAsCue} className="cue-popover-action">
            💾 Save current board as “{sceneNameFor(headingText)}”
          </button>

          {scenes.length > 0 && (
            <>
              <span className="cue-popover-label">or use an existing scene</span>
              <span className="cue-scene-list">
                {scenes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => bind(s.id)}
                    className={`cue-scene-item ${s.id === cue?.sceneId ? 'cue-scene-item-active' : ''}`}
                  >
                    {s.id === cue?.sceneId ? '● ' : ''}{s.name}
                  </button>
                ))}
              </span>
            </>
          )}

          {cue && (
            <button
              onClick={() => {
                useCueStore.getState().clearCue(mdPath, headingId);
                setOpen(false);
              }}
              className="cue-popover-remove"
            >
              ✕ Remove cue
            </button>
          )}
        </span>
      )}
    </span>
  );
}

/** What "save current board" would capture, so you can check before binding. */
function BoardSummary() {
  const { tracks, currentTrackId } = useMusicStore();
  const sounds = useSoundStore((s) => s.sounds);

  const track = tracks.find((t) => t.id === currentTrackId);
  const active = sounds.filter((s) => s.type === 'ambient' && s.isActive);

  return (
    <span className="cue-board-summary">
      {track ? `🎵 ${track.customName || track.title}` : '🎵 no music'}
      {active.length > 0
        ? ` · ${active.map((a) => a.emoji).join('')} ${active.length} ambient`
        : ' · no ambience'}
    </span>
  );
}
