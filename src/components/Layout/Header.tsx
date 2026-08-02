import type { View } from '../../types';

interface Props {
  currentView: View;
  onViewChange: (v: View) => void;
  onOpenPalette: () => void;
}

const navItems: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⚔️' },
  { id: 'campaign', label: 'Campaign', icon: '🗺️' },
  { id: 'npcs', label: 'NPCs', icon: '🎭' },
  { id: 'music', label: 'Music Library', icon: '🎵' },
];

export default function Header({ currentView, onViewChange, onOpenPalette }: Props) {
  // Mac shows ⌘K, everyone else Ctrl+K
  const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform);

  return (
    <header className="bg-stone-900 border-b border-amber-900/40 px-6 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎲</span>
        <div>
          <h1 className="text-lg font-bold text-amber-400 leading-none font-serif tracking-wide">
            Tavern Sounds
          </h1>
          <p className="text-xs text-stone-500 font-sans">DnD Sound Builder</p>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        <button
          onClick={onOpenPalette}
          className="flex items-center gap-2 mr-2 px-3 py-2 rounded-lg border border-stone-700 bg-stone-800/60 text-stone-400 text-sm font-sans hover:border-amber-800/60 hover:text-amber-300 transition-colors"
          title="Search the guide, jump anywhere, play a scene"
        >
          <span>⌕</span>
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden md:inline text-[10px] text-stone-500 border border-stone-700 rounded px-1 py-0.5">
            {isMac ? '⌘' : 'Ctrl+'}K
          </kbd>
        </button>

        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans transition-all duration-200 ${
              currentView === item.id
                ? 'bg-amber-700/30 text-amber-400 border border-amber-700/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <span>{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
