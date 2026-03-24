import type { View } from '../../types';

interface Props {
  currentView: View;
  onViewChange: (v: View) => void;
}

const navItems: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⚔️' },
  { id: 'music', label: 'Music Library', icon: '🎵' },
  { id: 'soundboard', label: 'Soundboard', icon: '🔊' },
];

export default function Header({ currentView, onViewChange }: Props) {
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
