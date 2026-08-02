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

// ---------------------------------------------------------------------------
// Read-aloud translation API
// ---------------------------------------------------------------------------
// The guide's read-aloud boxes are the one thing you say out loud verbatim, so
// they're worth having in Danish. There are 681 of them (~61,000 words), which
// is too much to translate up front and too much to re-translate on every page
// view — so translations are produced once, on request, and cached in a
// git-tracked file:
//
//   GET  /api/translations/da  → the whole cache
//   POST /api/translations/da  → translate the posted blocks, cache, return them
//
// Needs ANTHROPIC_API_KEY. Without it the endpoint returns 501 and the app
// falls back to English with a note, rather than looking broken.
const TRANSLATION_MODEL = 'claude-opus-5';
const MAX_TRANSLATE_BYTES = 1024 * 1024;
/** Blocks translated at once. Keeps one failure from losing a whole page. */
const TRANSLATE_CONCURRENCY = 4;

const TRANSLATE_SYSTEM = `You translate read-aloud passages from the Dungeons & Dragons campaign "Curse of Strahd: Reloaded" from English into Danish.

This text is performed out loud by a Dungeon Master to players at a table. Translate for the ear, not the page: it must be natural to speak and immediately clear when heard once.

Rules:
- Reproduce the HTML structure exactly. Same tags, same order, same nesting. Translate only human-readable text. Never add, drop, or reorder tags.
- Keep the gothic-horror register of the original. Match its rhythm and imagery rather than its word order — a literal rendering that reads like translated English is wrong.
- Leave proper nouns untranslated: people (Strahd von Zarovich, Ireena Kolyana, Izek Strazni), places (Barovia, Vallaki, Ravenloft, St. Andral's Church), and in-world titles used as names (the Burgomaster, the Abbot).
- Translate game and world terms that have ordinary Danish equivalents (church → kirke, crypt → krypt, tarp → presenning).
- Address the players with "I" (plural/polite), which is the convention at Danish tables, not "du".
- Use Danish typographic quotes (»…«) where the English uses quotation marks.
- Output only the translated HTML fragment. No preamble, no code fences, no commentary.`;

function translationApiPlugin() {
  const file = path.resolve('translations/read-aloud.da.json');

  interface Entry { src: string; da: string }
  interface Cache { version: number; lang: string; entries: Record<string, Entry> }

  const EMPTY: Cache = { version: 1, lang: 'da', entries: {} };

  const read = (): Cache => {
    if (!fs.existsSync(file)) return { ...EMPTY, entries: {} };
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Cache;
      return { ...EMPTY, ...parsed, entries: parsed.entries ?? {} };
    } catch {
      console.warn('[translations] cache is unparseable — starting from empty');
      return { ...EMPTY, entries: {} };
    }
  };

  const write = (cache: Cache) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // Sorted keys so committing new translations produces a readable diff
    const entries: Record<string, Entry> = {};
    for (const key of Object.keys(cache.entries).sort()) entries[key] = cache.entries[key];
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ ...cache, entries }, null, 2) + '\n');
    fs.renameSync(tmp, file);
  };

  const json = (res: MinimalRes, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };

  const text = (res: MinimalRes, status: number, body: string) => {
    res.statusCode = status;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(body);
  };

  const readBody = (req: MinimalReq): Promise<string> =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => {
        const buf = chunk as unknown as Buffer;
        size += buf.length;
        if (size > MAX_TRANSLATE_BYTES) {
          req.destroy();
          reject(new Error('payload too large'));
          return;
        }
        chunks.push(buf);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', () => reject(new Error('read failed')));
    });

  async function translateOne(html: string): Promise<string> {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic();
    // Streaming: a long read-aloud passage at high effort can outlive the
    // default non-streaming timeout.
    const stream = client.messages.stream({
      model: TRANSLATION_MODEL,
      max_tokens: 8192,
      system: TRANSLATE_SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: html }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      throw new Error('translation was declined by the safety classifier');
    }
    const out = message.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!out) throw new Error('empty translation');
    // The model is told not to fence its output; strip it if it does anyway.
    return out.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '');
  }

  const middleware: Middleware = (req, res, next) => {
    const url = (req.url ?? '').split('?')[0];
    if (url !== '/api/translations/da') return next();

    if (req.method === 'GET') return json(res, 200, read());

    if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' });

    if (!process.env.ANTHROPIC_API_KEY) {
      return text(
        res,
        501,
        'No ANTHROPIC_API_KEY set, so new passages cannot be translated. ' +
          'Already-translated ones still work. Set the key and restart the dev server to translate more.'
      );
    }

    readBody(req)
      .then(async (body) => {
        const { mdPath, blocks } = JSON.parse(body) as {
          mdPath: string;
          blocks: { index: number; html: string; src: string }[];
        };
        if (typeof mdPath !== 'string' || !Array.isArray(blocks)) {
          return json(res, 400, { error: 'expected { mdPath, blocks }' });
        }

        const produced: Record<string, Entry> = {};
        const failures: string[] = [];

        for (let i = 0; i < blocks.length; i += TRANSLATE_CONCURRENCY) {
          const batch = blocks.slice(i, i + TRANSLATE_CONCURRENCY);
          await Promise.all(
            batch.map(async (block) => {
              try {
                produced[`${mdPath}#${block.index}`] = {
                  src: block.src,
                  da: await translateOne(block.html),
                };
              } catch (e) {
                failures.push(`#${block.index}: ${e instanceof Error ? e.message : String(e)}`);
              }
            })
          );
        }

        // Persist whatever succeeded — a partial page is still progress, and
        // re-reading the file means a concurrent write isn't clobbered.
        if (Object.keys(produced).length) {
          const cache = read();
          write({ ...cache, entries: { ...cache.entries, ...produced } });
        }
        if (failures.length) console.warn(`[translations] ${failures.length} failed:\n  ${failures.join('\n  ')}`);

        json(res, 200, { entries: produced, failures });
      })
      .catch((e) => json(res, 400, { error: e instanceof Error ? e.message : String(e) }));
  };

  return {
    name: 'read-aloud-translation-api',
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
  plugins: [react(), autoRegisterPlugin(), stateApiPlugin(), translationApiPlugin()],
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
