import NowPlaying from './NowPlaying';
import ActiveAmbient from './ActiveAmbient';
import QuickSoundboard from './QuickSoundboard';
import MusicSearch from './MusicSearch';
import ScenePanel from './ScenePanel';
import CombatButton from './CombatButton';
import CurrentArcCard from './CurrentArcCard';
import PartyPanel from './PartyPanel';

interface Props {
  onOpenCampaign: () => void;
}

export default function Dashboard({ onOpenCampaign }: Props) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-amber-400 text-glow">
            The Tavern Board
          </h1>
          <p className="text-stone-500 font-sans text-sm mt-1">
            Control your scene's atmosphere from here
          </p>
        </div>
        <div className="w-64 flex-shrink-0">
          <CombatButton />
        </div>
      </div>

      <div className="mb-5">
        <CurrentArcCard onOpenCampaign={onOpenCampaign} />
      </div>

      <div className="mb-5">
        <MusicSearch />
      </div>

      <div className="mb-6">
        <ScenePanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <NowPlaying />
          <QuickSoundboard />
        </div>
        <div className="flex flex-col gap-6">
          <ActiveAmbient />
          <PartyPanel />
        </div>
      </div>
    </div>
  );
}
