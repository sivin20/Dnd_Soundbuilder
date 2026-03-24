import { useYouTubePlayer } from '../../hooks/useYouTubePlayer';

/** Hidden YouTube IFrame player — must be mounted at app root level */
export default function YouTubePlayer() {
  const { PLAYER_DIV_ID } = useYouTubePlayer();
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: 1,
        height: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0,
      }}
    >
      <div id={PLAYER_DIV_ID} />
    </div>
  );
}
