// Central volume-ducking bus.
// Audio owners (music player, ambient howls) register an applier that maps a
// duck factor (0..1) onto their own volumes. Two factors combine:
//   base      — held while combat mode is on (ambience sits lower)
//   transient — short dip while a one-shot plays, auto-restores
type Applier = (factor: number) => void;

const appliers = new Set<Applier>();
let base = 1;
let transient = 1;
let transientTimer: ReturnType<typeof setTimeout> | null = null;

function broadcast() {
  const f = base * transient;
  appliers.forEach((a) => a(f));
}

export function getDuckFactor(): number {
  return base * transient;
}

/** Register a callback that applies the combined duck factor. Returns unregister. */
export function registerDuckApplier(fn: Applier): () => void {
  appliers.add(fn);
  fn(base * transient);
  return () => appliers.delete(fn);
}

/** Held duck (combat mode). Pass 1 to release. */
export function setBaseDuck(factor: number) {
  base = factor;
  broadcast();
}

/** Short dip (one-shot playing). Restores automatically after holdMs. */
export function duckTransient(factor = 0.4, holdMs = 2500) {
  transient = Math.min(transient, factor);
  broadcast();
  if (transientTimer) clearTimeout(transientTimer);
  transientTimer = setTimeout(() => {
    transient = 1;
    transientTimer = null;
    broadcast();
  }, holdMs);
}
