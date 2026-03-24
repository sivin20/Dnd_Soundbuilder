import { useState } from 'react';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import MusicLibrary from './components/MusicLibrary/MusicLibrary';
import Soundboard from './components/Soundboard/Soundboard';
import YouTubePlayer from './components/shared/YouTubePlayer';
import type { View } from './types';

export default function App() {
  const [view, setView] = useState<View>('dashboard');

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Hidden YouTube audio player — always mounted */}
      <YouTubePlayer />

      <Header currentView={view} onViewChange={setView} />

      <main className="flex-1 overflow-y-auto">
        {view === 'dashboard' && <Dashboard />}
        {view === 'music' && <MusicLibrary />}
        {view === 'soundboard' && <Soundboard />}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/60 px-6 py-2 text-center">
        <p className="text-stone-700 text-xs font-sans">
          Tavern Sounds — DnD Sound Builder ⚔️ May your sessions be legendary
        </p>
      </footer>
    </div>
  );
}
