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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoRegisterPlugin()],
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
