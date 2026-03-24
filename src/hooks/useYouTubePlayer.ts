import { useEffect, useRef, useCallback } from 'react';
import { loadYouTubeAPI } from '../utils/youtube';
import { useMusicStore } from '../store/musicStore';

const PLAYER_DIV_ID = 'yt-player-hidden';

export function useYouTubePlayer() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const pendingVideoId = useRef<string | null>(null);
  const pendingPlay = useRef(false);

  const { currentTrackId, isPlaying, volume, tracks, setIsPlaying } = useMusicStore();

  const currentTrack = tracks.find((t) => t.id === currentTrackId) ?? null;

  const initPlayer = useCallback(() => {
    if (playerRef.current || !document.getElementById(PLAYER_DIV_ID)) return;

    playerRef.current = new window.YT.Player(PLAYER_DIV_ID, {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => {
          readyRef.current = true;
          playerRef.current!.setVolume(volume);
          if (pendingVideoId.current) {
            playerRef.current!.loadVideoById(pendingVideoId.current);
            if (!pendingPlay.current) playerRef.current!.pauseVideo();
            pendingVideoId.current = null;
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
          }
        },
      },
    });
  }, [volume, setIsPlaying]);

  // Load API and init player on mount
  useEffect(() => {
    loadYouTubeAPI().then(initPlayer);
  }, [initPlayer]);

  // React to track changes
  useEffect(() => {
    if (!currentTrack) {
      playerRef.current?.stopVideo();
      return;
    }
    const { videoId } = currentTrack;
    if (!readyRef.current) {
      pendingVideoId.current = videoId;
      pendingPlay.current = isPlaying;
      return;
    }
    const player = playerRef.current;
    if (!player) return;

    const currentVideoId = player.getVideoData?.()?.video_id;
    if (currentVideoId !== videoId) {
      player.loadVideoById(videoId);
      if (!isPlaying) player.pauseVideo();
    }
  }, [currentTrack, isPlaying]);

  // React to play/pause
  useEffect(() => {
    if (!readyRef.current || !playerRef.current || !currentTrack) return;
    if (isPlaying) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying, currentTrack]);

  // React to volume changes
  useEffect(() => {
    if (readyRef.current && playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  return { PLAYER_DIV_ID };
}
