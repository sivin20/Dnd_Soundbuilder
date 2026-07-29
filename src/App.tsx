import { useState } from 'react';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import CampaignView from './components/Campaign/CampaignView';
import NpcView from './components/Npcs/NpcView';
import MusicLibrary from './components/MusicLibrary/MusicLibrary';
import Soundboard from './components/Soundboard/Soundboard';
import type { View } from './types';
import { MusicEngine } from './hooks/useMusicPlayer';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
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

  return (
    <div className="h-screen bg-stone-950 flex flex-col">
      <MusicEngine />
      <Header currentView={view} onViewChange={changeView} />

      <main className="flex-1 overflow-y-auto">
        {view === 'dashboard' && <Dashboard onOpenCampaign={() => changeView('campaign')} />}
        {view === 'campaign' && (
          <CampaignView key={guideTarget?.mdPath ?? 'default'} initialPage={guideTarget} />
        )}
        {view === 'npcs' && <NpcView onOpenSource={openGuidePage} />}
        {view === 'music' && <MusicLibrary />}
        {view === 'soundboard' && <Soundboard />}
      </main>

      <footer className="border-t border-stone-800/60 px-6 py-2 text-center">
        <p className="text-stone-700 text-xs font-sans">
          Tavern Sounds — DnD Sound Builder ⚔️ May your sessions be legendary
        </p>
      </footer>
    </div>
  );
}
