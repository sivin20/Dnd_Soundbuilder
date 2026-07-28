import { Howler } from 'howler';

// Short synthesized victory fanfare ("ta-ta-ta-daaa!") played when combat
// ends. Web Audio synthesis — no audio asset required.

interface Note {
  freq: number;   // Hz
  start: number;  // seconds from fanfare start
  dur: number;    // seconds
  vol?: number;
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;

const FANFARE: Note[] = [
  { freq: C5, start: 0.0,  dur: 0.16 },
  { freq: C5, start: 0.18, dur: 0.16 },
  { freq: C5, start: 0.36, dur: 0.16 },
  { freq: E5, start: 0.54, dur: 0.42, vol: 1.1 },
  { freq: C5, start: 1.0,  dur: 0.16 },
  { freq: E5, start: 1.18, dur: 0.16 },
  { freq: G5, start: 1.36, dur: 0.8,  vol: 1.2 },
  { freq: C6, start: 1.36, dur: 0.8,  vol: 0.5 }, // octave shimmer on the final chord
  { freq: E5, start: 1.36, dur: 0.8,  vol: 0.4 },
];

export function playVictoryFanfare(volume = 0.4) {
  const ctx: AudioContext = Howler.ctx ?? new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();

  const master = ctx.createGain();
  master.gain.value = volume;
  // Route through Howler's master gain so the global volume still applies
  master.connect(Howler.masterGain ?? ctx.destination);

  const t0 = ctx.currentTime + 0.05;

  for (const note of FANFARE) {
    const start = t0 + note.start;
    const end = start + note.dur;
    const noteVol = note.vol ?? 1;

    // Two slightly detuned sawtooths through a lowpass ≈ cheap brass
    for (const detune of [0, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = note.freq;
      osc.detune.value = detune;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, start);
      filter.frequency.exponentialRampToValueAtTime(2800, start + 0.05);
      filter.frequency.exponentialRampToValueAtTime(900, end);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5 * noteVol, start + 0.03); // brass attack
      gain.gain.setValueAtTime(0.5 * noteVol, end - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.08);

      osc.connect(filter).connect(gain).connect(master);
      osc.start(start);
      osc.stop(end + 0.1);
    }
  }
}
