import { useState } from 'react';
import { useSceneStore } from '../../store/sceneStore';
import { useMusicStore } from '../../store/musicStore';
import { useSoundStore } from '../../store/soundStore';

export default function ScenePanel() {
  const { scenes, activeSceneId, saveCurrentAsScene, applyScene, deleteScene } = useSceneStore();
  const { tracks, currentTrackId } = useMusicStore();
  const { sounds } = useSoundStore();

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  const currentTrack = tracks.find((t) => t.id === currentTrackId);
  const activeAmbientCount = sounds.filter((s) => s.type === 'ambient' && s.isActive).length;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveCurrentAsScene(trimmed);
    setName('');
    setSaving(false);
  };

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans">Scenes</h2>
        {!saving && (
          <button
            onClick={() => setSaving(true)}
            className="text-xs font-sans bg-stone-800 hover:bg-stone-700 text-amber-500 px-2.5 py-1 rounded-full border border-stone-700 transition-colors"
            title="Save the current music + ambience mix as a scene"
          >
            + Save current
          </button>
        )}
      </div>

      {saving && (
        <div className="mb-3 bg-stone-800/70 border border-amber-800/40 rounded-lg p-3">
          <p className="text-xs text-stone-400 font-sans mb-2">
            Snapshot: {currentTrack ? `🎵 ${currentTrack.customName || currentTrack.title}` : 'no music'}
            {' · '}{activeAmbientCount} ambient layer{activeAmbientCount === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') { setSaving(false); setName(''); }
              }}
              placeholder="Scene name, e.g. Death House"
              className="flex-1 bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-parchment placeholder-stone-600 font-sans focus:outline-none focus:border-amber-700/60"
            />
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="text-xs font-sans bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-amber-100 px-3 rounded transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => { setSaving(false); setName(''); }}
              className="text-xs font-sans text-stone-500 hover:text-stone-300 px-1 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {scenes.length === 0 && !saving ? (
        <p className="text-stone-600 text-sm font-sans italic text-center py-2">
          No scenes yet — set up music + ambience, then save it here.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {scenes.map((scene) => {
            const isActive = scene.id === activeSceneId;
            return (
              <div
                key={scene.id}
                className={`group flex items-center rounded-lg border transition-all ${
                  isActive
                    ? 'bg-amber-900/30 border-amber-700/60'
                    : 'bg-stone-800/70 border-stone-700 hover:border-amber-800/50'
                }`}
              >
                <button
                  onClick={() => applyScene(scene.id)}
                  className={`px-3 py-2 text-sm font-serif transition-colors ${
                    isActive ? 'text-amber-300' : 'text-parchment hover:text-amber-200'
                  }`}
                  title={`Crossfade into "${scene.name}"`}
                >
                  {scene.name}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete scene "${scene.name}"?`)) deleteScene(scene.id);
                  }}
                  className="pr-2 text-stone-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete scene"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
