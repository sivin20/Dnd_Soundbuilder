import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const AUDIO_EXT = /\.(mp3|ogg|wav|flac|m4a)$/i;

function prettifyName(filename: string): string {
  return filename
    .replace(AUDIO_EXT, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function idFromFilename(filename: string): string {
  return filename
    .replace(AUDIO_EXT, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function syncFolder(dir: string, configPath: string, defaultType: 'oneshot' | 'ambient') {
  if (!fs.existsSync(dir)) return;

  let config: Record<string, unknown>[] = [];
  if (fs.existsSync(configPath)) {
    try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch { /* ignore */ }
  }

  // Collect all known URLs — both top-level and inside levels arrays
  const existingUrls = new Set<string>();
  for (const s of config) {
    if (s.url) existingUrls.add(s.url as string);
    if (Array.isArray(s.levels)) {
      for (const u of s.levels as string[]) existingUrls.add(u);
    }
  }
  const folder = path.basename(dir); // "sounds" or "ambience"

  const files = fs.readdirSync(dir)
    .filter((f) => AUDIO_EXT.test(f) && !f.startsWith('.'))
    .sort();

  let changed = false;
  for (const filename of files) {
    const url = `/${folder}/${filename}`;
    if (!existingUrls.has(url)) {
      config.push({
        id:     idFromFilename(filename),
        name:   prettifyName(filename),
        emoji:  defaultType === 'ambient' ? '🌬️' : '🔊',
        type:   defaultType,
        url,
        volume: 80,
      });
      changed = true;
      console.log(`[${folder}] Auto-registered: ${filename}`);
    }
  }

  if (changed) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
function autoRegisterPlugin() {
  const soundsDir     = path.resolve('public/sounds');
  const ambienceDir   = path.resolve('public/ambience');
  const soundsConfig  = path.resolve('src/data/soundsConfig.json');
  const ambienceConfig = path.resolve('src/data/ambienceConfig.json');

  function syncAll() {
    syncFolder(soundsDir,   soundsConfig,   'oneshot');
    syncFolder(ambienceDir, ambienceConfig, 'ambient');
  }

  return {
    name: 'auto-register-sounds',
    buildStart() { syncAll(); },
    configureServer(server: { watcher: { add: (p: string) => void; on: (e: string, cb: (f: string) => void) => void } }) {
      syncAll();
      server.watcher.add(soundsDir);
      server.watcher.add(ambienceDir);
      server.watcher.on('add', (file) => {
        if (AUDIO_EXT.test(file)) syncAll();
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Campaign state API
// ---------------------------------------------------------------------------
// Prep data (arc notes, session log, scenes, cues) is hours of irreplaceable
// work, so it lives in campaign-state/*.json inside the repo rather than in one
// browser's localStorage. This serves that directory to the app:
//
//   GET    /api/state         → { "<store-name>": <parsed json>, … }  (one trip)
//   PUT    /api/state/<name>  → write campaign-state/<name>.json
//   POST   /api/state/<name>  → same (sendBeacon can only POST)
//   DELETE /api/state/<name>  → remove it
//
// Mounted on both the dev server and `vite preview`.
const STATE_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/; // no dots or slashes — no traversal
const MAX_STATE_BYTES = 8 * 1024 * 1024;

interface MinimalReq {
  url?: string;
  method?: string;
  on: (event: string, cb: (chunk?: never) => void) => void;
  destroy: () => void;
}
interface MinimalRes {
  statusCode: number;
  setHeader: (k: string, v: string) => void;
  end: (body?: string) => void;
}
type Middleware = (req: MinimalReq, res: MinimalRes, next: () => void) => void;

function stateApiPlugin() {
  const dir = path.resolve('campaign-state');

  const json = (res: MinimalRes, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };

  const readBody = (req: MinimalReq): Promise<string> =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => {
        const buf = chunk as unknown as Buffer;
        size += buf.length;
        if (size > MAX_STATE_BYTES) {
          req.destroy();
          reject(new Error('state payload too large'));
          return;
        }
        chunks.push(buf);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', () => reject(new Error('read failed')));
    });

  const middleware: Middleware = (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/state')) return next();

    const rest = url.slice('/api/state'.length).split('?')[0];

    // Collection: hand the client everything in one request so store hydration
    // doesn't waterfall one fetch per store.
    if (rest === '' || rest === '/') {
      if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' });
      const out: Record<string, unknown> = {};
      if (fs.existsSync(dir)) {
        for (const file of fs.readdirSync(dir)) {
          if (!file.endsWith('.json')) continue;
          try {
            out[file.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
          } catch {
            console.warn(`[state] ignoring unparseable ${file}`);
          }
        }
      }
      return json(res, 200, out);
    }

    const name = decodeURIComponent(rest.replace(/^\//, ''));
    if (!STATE_NAME.test(name)) return json(res, 400, { error: 'bad state name' });
    const file = path.join(dir, `${name}.json`);

    if (req.method === 'PUT' || req.method === 'POST') {
      readBody(req)
        .then((body) => {
          // Parse before writing: never replace good state with a broken payload
          const parsed = JSON.parse(body);
          fs.mkdirSync(dir, { recursive: true });
          // Write-then-rename so a crash mid-write can't truncate existing state
          const tmp = `${file}.${process.pid}.tmp`;
          fs.writeFileSync(tmp, JSON.stringify(parsed, null, 2) + '\n');
          fs.renameSync(tmp, file);
          json(res, 200, { ok: true });
        })
        .catch((e) => json(res, 400, { error: String(e instanceof Error ? e.message : e) }));
      return;
    }

    if (req.method === 'DELETE') {
      fs.rmSync(file, { force: true });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'method not allowed' });
  };

  return {
    name: 'campaign-state-api',
    configureServer(server: { middlewares: { use: (m: Middleware) => void } }) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: { middlewares: { use: (m: Middleware) => void } }) {
      server.middlewares.use(middleware);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoRegisterPlugin(), stateApiPlugin()],
  server: {
    proxy: {
      // D&D Beyond's character service has no CORS headers, so the dev
      // server proxies it: /ddb/character/<id> → character JSON.
      '/ddb': {
        target: 'https://character-service.dndbeyond.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ddb/, '/character/v5'),
        // DDB's WAF 403s on some browser header combinations. Strip
        // everything the browser sent and make a clean server-style request.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            for (const name of proxyReq.getHeaderNames()) {
              if (name !== 'host') proxyReq.removeHeader(name);
            }
            proxyReq.setHeader('accept', 'application/json');
            proxyReq.setHeader('user-agent', 'dnd-soundbuilder (personal DM tool)');
          });
        },
      },
    },
  },
});
