import NowPlaying from './NowPlaying';
import ActiveAmbient from './ActiveAmbient';
import QuickSoundboard from './QuickSoundboard';
import MusicSearch from './MusicSearch';
import ScenePanel from './ScenePanel';
import CombatButton from './CombatButton';
import CurrentArcCard from './CurrentArcCard';
import PartyPanel from './PartyPanel';
import BarovianClock from './BarovianClock';
import LastSessionCard from './LastSessionCard';

interface Props {
  onOpenCampaign: () => void;
  /** Jump to a specific guide page/section — used by deadline "read up" links. */
  onOpenGuide: (mdPath: string, anchor?: string) => void;
}

// Two columns on a wide screen: the audio board you drive during play on the
// left, and the at-a-glance campaign state — clock, party, where you left them
// — in a rail on the right. Everything stacks on narrow screens.

export default function Dashboard({ onOpenCampaign, onOpenGuide }: Props) {
  return (
    <div className="p-6 max-w-[110rem] mx-auto">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Audio board */}
        <div className="flex-1 min-w-0 w-full">
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
              <ActiveAmbient />
            </div>
            <QuickSoundboard />
          </div>
        </div>

        {/* Campaign state rail — stays put while the board scrolls, and scrolls
            internally when the three cards exceed the viewport.
            9rem = header (63px) + footer (33px) + the 24px offset top and bottom. */}
        <aside
          className="w-full xl:w-[23rem] 2xl:w-[25rem] flex-shrink-0 flex flex-col gap-5
                     xl:sticky xl:top-6 xl:self-start
                     xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto xl:pr-0.5"
        >
          <BarovianClock onOpenGuide={onOpenGuide} />
          <PartyPanel />
          <LastSessionCard onOpenCampaign={onOpenCampaign} />
        </aside>
      </div>
    </div>
  );
}
