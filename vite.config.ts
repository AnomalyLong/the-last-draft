import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { devvit } from '@devvit/start/vite';
import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs';

const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

// Build stamp, injected into BOTH the client and server bundles so the `version`
// debug command can compare them. A client/server mismatch means one half is
// stale (browser cache, or a partial deploy) — which is otherwise invisible and
// very easy to misdiagnose as a code bug.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
// NOTE: the devvit plugin runs a SECOND vite build for the server half, which
// re-evaluates this config file. A plain `new Date()` here therefore produces a
// different value for each half (observed: 5ms apart) and made the `version`
// command report MISMATCH on every single build. Memoising through process.env
// (inherited by the child build) keeps both halves on one identical stamp.
const BUILD_TIME = process.env.__APP_BUILD_TIME__ ?? new Date().toISOString();
process.env.__APP_BUILD_TIME__ = BUILD_TIME;

const buildDefine = {
  __BUILD_VERSION__: JSON.stringify(pkg.version ?? '0.0.0'),
  __BUILD_TIME__: JSON.stringify(BUILD_TIME),
};

export default defineConfig({
  define: buildDefine,
  plugins: [
    react(),
    tailwind(),
    devvit({
      server: {
        define: buildDefine,
        build: {
          rollupOptions: {
            external: nodeBuiltins,
          },
        },
      },
    }),
  ],
});
