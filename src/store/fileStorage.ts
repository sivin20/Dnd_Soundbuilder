import type { StateStorage } from 'zustand/middleware';

// Durable storage for prep data: arc notes, session log, scenes, cues.
//
// localStorage is the wrong home for hours of prep — it's scoped to one browser
// profile and one origin, and "clear site data" takes the campaign with it. This
// adapter talks to the dev server's /api/state endpoint instead, so each store
// becomes a git-tracked file in campaign-state/.
//
// Behaviour worth knowing:
//  - One GET fetches every store, so hydration is a single request.
//  - Existing localStorage data is migrated into files once, automatically.
//  - If the endpoint isn't there (a static build with no server), it degrades to
//    localStorage rather than losing writes. Check backendKind() to report which.

const API = '/api/state';
const WRITE_DEBOUNCE_MS = 400;
/** Set once a store's localStorage data has been copied into a file, so
 *  deleting that file later doesn't resurrect it from the browser. */
const MIGRATED_SUFFIX = '::migrated-to-file';

export type BackendKind = 'file' | 'browser' | 'unknown';

let backend: BackendKind = 'unknown';
let snapshot: Record<string, unknown> = {};
let loadPromise: Promise<void> | null = null;

const pending = new Map<string, string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function backendKind(): BackendKind {
  return backend;
}

/** Fetch every stored state file in one request. Memoised. */
function loadOnce(): Promise<void> {
  if (!loadPromise) {
    loadPromise = fetch(API)
      .then(async (res) => {
        if (!res.ok) throw new Error(`state api ${res.status}`);
        snapshot = (await res.json()) as Record<string, unknown>;
        backend = 'file';
      })
      .catch(() => {
        backend = 'browser';
        console.warn(
          '[state] /api/state unavailable — prep is saving to this browser only. ' +
            'Run the app with `npm run dev` to store it in campaign-state/.'
        );
      });
  }
  return loadPromise;
}

async function put(name: string, value: string): Promise<void> {
  const res = await fetch(`${API}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: value,
  });
  if (!res.ok) throw new Error(`state api ${res.status}`);
}

function flush(): void {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  const batch = [...pending.entries()];
  pending.clear();
  for (const [name, value] of batch) {
    put(name, value).catch((e) => {
      // Keep the value queued so the next write retries it
      if (!pending.has(name)) pending.set(name, value);
      console.error(`[state] failed to save ${name}:`, e);
    });
  }
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, WRITE_DEBOUNCE_MS);
}

/** Push queued writes out before the page goes away. */
if (typeof window !== 'undefined') {
  const flushNow = () => {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    for (const [name, value] of pending) {
      // keepalive lets the request outlive the page; sendBeacon can't send PUT
      void fetch(`${API}/${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: value,
        keepalive: true,
      }).catch(() => {});
    }
    pending.clear();
  };
  window.addEventListener('pagehide', flushNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
}

export const fileStorage: StateStorage = {
  getItem: async (name) => {
    await loadOnce();
    if (backend !== 'file') return localStorage.getItem(name);

    if (name in snapshot) return JSON.stringify(snapshot[name]);

    // One-time upgrade: adopt whatever this browser already had
    const legacy = localStorage.getItem(name);
    if (legacy && !localStorage.getItem(name + MIGRATED_SUFFIX)) {
      try {
        snapshot[name] = JSON.parse(legacy);
        await put(name, legacy);
        localStorage.setItem(name + MIGRATED_SUFFIX, new Date().toISOString());
        console.info(`[state] migrated ${name} from localStorage into campaign-state/`);
      } catch (e) {
        console.error(`[state] could not migrate ${name}:`, e);
      }
      return legacy;
    }

    return null;
  },

  setItem: async (name, value) => {
    if (backend !== 'file') { localStorage.setItem(name, value); return; }
    try {
      snapshot[name] = JSON.parse(value);
    } catch {
      // zustand always hands us JSON; if that ever changes, don't lose the write
    }
    pending.set(name, value);
    scheduleFlush();
  },

  removeItem: async (name) => {
    if (backend !== 'file') { localStorage.removeItem(name); return; }
    delete snapshot[name];
    pending.delete(name);
    await fetch(`${API}/${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(() => {});
  },
};
