import { useMusicStore } from '../../store/musicStore';
import AddMusicForm from './AddMusicForm';
import MusicCard from './MusicCard';
import VolumeSlider from '../shared/VolumeSlider';

export default function MusicLibrary() {
  const { tracks, volume, setVolume } = useMusicStore();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-amber-400 text-glow">
          Music Library
        </h1>
        <p className="text-stone-500 font-sans text-sm mt-1">
          Add and manage your background tracks
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <AddMusicForm />

        {/* Master volume */}
        {tracks.length > 0 && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl px-5 py-4">
            <p className="text-xs uppercase tracking-widest text-stone-500 font-sans mb-3">
              Master Music Volume
            </p>
            <VolumeSlider value={volume} onChange={setVolume} label="Master volume" />
          </div>
        )}

        {/* Track list */}
        {tracks.length > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-600 font-sans mb-3">
              {tracks.length} track{tracks.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-col gap-2">
              {tracks.map((track) => (
                <MusicCard key={track.id} track={track} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-stone-600">
            <p className="text-5xl mb-3">🎼</p>
            <p className="font-serif italic text-lg">Your library is empty</p>
            <p className="text-sm font-sans mt-2">
              Paste a YouTube URL above to add your first track
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
