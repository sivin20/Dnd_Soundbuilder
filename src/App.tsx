import { useEffect, useState } from 'react';
import Header from './components/Layout/Header';
import CommandPalette from './components/Palette/CommandPalette';
import Dashboard from './components/Dashboard/Dashboard';
import CampaignView from './components/Campaign/CampaignView';
import NpcView from './components/Npcs/NpcView';
import MusicLibrary from './components/MusicLibrary/MusicLibrary';
import Soundboard from './components/Soundboard/Soundboard';
import type { View } from './types';
import { MusicEngine } from './hooks/useMusicPlayer';
import { useStoresHydrated } from './store/useHydrated';
import { backendKind } from './store/fileStorage';
import { usePrefsStore, FONT_SCALES } from './store/prefsStore';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Set when something outside the campaign view asks it to open a specific
  // guide page (e.g. an NPC's source link). Cleared on plain navigation.
  const [guideTarget, setGuideTarget] = useState<{ mdPath: string; anchor?: string } | null>(null);

  const changeView = (v: View) => {
    setGuideTarget(null);
    setView(v);
  };

  const openGuidePage = (mdPath: string, anchor?: string) => {
    setGuideTarget({ mdPath, anchor });
    setView('campaign');
  };

  // Prep data loads from campaign-state/ — hold the views until it's in
  const hydrated = useStoresHydrated();

  // Cmd+K / Ctrl+K anywhere. Bound on the window in capture phase so it still
  // fires while focus is inside a notes textarea.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, []);

  // Guide text size lives on :root so plain CSS can scale off it
  const fontScaleIndex = usePrefsStore((s) => s.fontScaleIndex);
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--guide-scale',
      String(FONT_SCALES[fontScaleIndex] ?? 1)
    );
  }, [fontScaleIndex]);

  return (
    <div className="h-screen bg-stone-950 flex flex-col">
      <MusicEngine />
      <Header currentView={view} onViewChange={changeView} onOpenPalette={() => setPaletteOpen(true)} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenGuide={openGuidePage}
        onChangeView={changeView}
      />

      <main className="flex-1 overflow-y-auto">
        {!hydrated ? (
          <p className="text-stone-600 font-sans text-sm italic py-16 text-center">
            Opening the campaign ledger…
          </p>
        ) : (
          <>
            {view === 'dashboard' && <Dashboard onOpenCampaign={() => changeView('campaign')} onOpenGuide={openGuidePage} />}
            {view === 'campaign' && (
              <CampaignView key={guideTarget?.mdPath ?? 'default'} initialPage={guideTarget} />
            )}
            {view === 'npcs' && <NpcView onOpenSource={openGuidePage} />}
            {view === 'music' && <MusicLibrary />}
            {view === 'soundboard' && <Soundboard />}
          </>
        )}
      </main>

      <footer className="border-t border-stone-800/60 px-6 py-2 text-center">
        <p className="text-stone-700 text-xs font-sans">
          Tavern Sounds — DnD Sound Builder ⚔️ May your sessions be legendary
          {hydrated && backendKind() === 'browser' && (
            <span
              className="text-amber-700/80 ml-2"
              title="The /api/state endpoint isn't reachable, so notes, scenes and cues are only in this browser. Run with npm run dev to save them to campaign-state/."
            >
              · ⚠ prep saving to this browser only
            </span>
          )}
        </p>
      </footer>
    </div>
  );
}
