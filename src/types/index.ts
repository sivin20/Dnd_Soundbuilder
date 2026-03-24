export interface Track {
  id: string;
  filename: string;   // e.g. "exploring-death-house.mp3" — file lives in public/music/
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
  isActive: boolean;
}

export type View = 'dashboard' | 'music' | 'soundboard';
