import { useEffect, useState } from 'react';
import { useCampaignStore } from './campaignStore';
import { useCueStore } from './cueStore';
import { useSceneStore } from './sceneStore';

// The file-backed stores hydrate asynchronously (one fetch to /api/state).
// Anything that reads their state on mount — CampaignView picking the current
// arc, cue buttons showing their binding — has to wait, or it decides against
// empty state and never revisits.

const FILE_BACKED = [useCampaignStore, useCueStore, useSceneStore];

export function useStoresHydrated(): boolean {
  const [ready, setReady] = useState(() => FILE_BACKED.every((s) => s.persist.hasHydrated()));

  useEffect(() => {
    if (ready) return;
    const check = () => {
      if (FILE_BACKED.every((s) => s.persist.hasHydrated())) setReady(true);
    };
    const unsubscribe = FILE_BACKED.map((s) => s.persist.onFinishHydration(check));
    check(); // covers stores that finished before we subscribed
    return () => unsubscribe.forEach((u) => u());
  }, [ready]);

  return ready;
}
