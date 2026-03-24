import NowPlaying from './NowPlaying';
import ActiveAmbient from './ActiveAmbient';
import QuickSoundboard from './QuickSoundboard';

export default function Dashboard() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-amber-400 text-glow">
          The Tavern Board
        </h1>
        <p className="text-stone-500 font-sans text-sm mt-1">
          Control your scene's atmosphere from here
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <NowPlaying />
          <QuickSoundboard />
        </div>
        <div>
          <ActiveAmbient />
        </div>
      </div>
    </div>
  );
}
