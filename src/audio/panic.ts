import { Howler } from 'howler';
import { useMusicStore } from '../store/musicStore';
import { useSoundStore } from '../store/soundStore';
import { useSceneStore } from '../store/sceneStore';
import { fadeOutMusic } from '../hooks/useMusicPlayer';

// Silence. Lives here rather than in a store because it reaches across all three.

/** How long the panic fade takes. Short enough to still feel like a stop. */
const PANIC_FADE_MS = 2000;

let sweep: ReturnType<typeof setTimeout> | null = null;

/** Is anything playing (or cued to play) right now? */
function boardIsLive(): boolean {
  const { currentTrackId } = useMusicStore.getState();
  const ambientActive = useSoundStore
    .getState()
    .sounds.some((s) => s.type === 'ambient' && s.isActive);
  return currentTrackId !== null || ambientActive;
}

/**
 * Stop everything — music, ambience, one-shots, sprinkles — over a two-second fade.
 *
 * Each source is faded individually rather than by riding Howler's master gain
 * down: every loop here is `html5: true`, and html5 sounds are plain <audio>
 * elements that never route through the master gain node, so a master fade moves
 * the number and nothing else. The trailing Howler.stop() is the backstop for
 * one-shots and sprinkles, which are fire-and-forget Howls nothing holds a
 * reference to and which are too short to be worth fading.
 */
export function panicStop() {
  const music = useMusicStore.getState();
  if (music.combatActive) music.exitCombat();

  // Tear the engine down before clearing the store, or the store change kicks
  // off the engine's own 3s crossfade instead of this 2s one.
  fadeOutMusic(PANIC_FADE_MS);
  music.clearTrack();
  useSoundStore.getState().stopAllAmbient(PANIC_FADE_MS);
  useSceneStore.getState().clearActiveScene();

  if (sweep !== null) clearTimeout(sweep);
  sweep = setTimeout(() => {
    sweep = null;
    // Only sweep if the board is still empty. Panicking and then immediately
    // cueing the right scene is a normal move, and that audio must survive.
    if (!boardIsLive()) Howler.stop();
  }, PANIC_FADE_MS);
}

/** Longer than a panic — this is "the scene is over", not "stop, now". */
const SCENE_OUT_FADE_MS = 3000;

/**
 * Wind the board down gracefully. Used when you tap the playing scene again to
 * turn it off. Music and ambience share one duration so it reads as a single
 * gesture rather than two layers ending at different times.
 */
export function fadeEverythingOut() {
  const music = useMusicStore.getState();
  if (music.combatActive) music.exitCombat();
  fadeOutMusic(SCENE_OUT_FADE_MS);
  music.clearTrack();
  useSoundStore.getState().stopAllAmbient(SCENE_OUT_FADE_MS);
  useSceneStore.getState().clearActiveScene();
}
