export interface Track {
  id: string;
  url: string;
  videoId: string;
  title: string;
  customName: string;
  addedAt: number;
}

export type SoundType = 'ambient' | 'oneshot';

export interface Sound {
  id: string;
  name: string;
  url: string;
  type: SoundType;
  volume: number;
  emoji: string;
  isActive: boolean; // for ambient; ignored for oneshot
}

export type View = 'dashboard' | 'music' | 'soundboard';
