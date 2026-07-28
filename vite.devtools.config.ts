import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dev:tools = the REAL game (src/App.jsx) rendered outside Reddit, for the
// Farnsworth live-preview canvas. This is intentionally as close to the live
// Reddit app as possible:
//   - `@devvit/web/client` is aliased to a shim so App.jsx runs unmodified
//   - /api/trpc is proxied to the Devvit dev server so live data flows in
//     when `npm run dev` (devvit playtest) is also running
//
// The old storybook harness (hand-authored screens) now lives in `story/`
// and runs via `npm run story` (vite.story.config.ts, port 5175).
export default defineConfig({
  root: path.resolve(__dirname, 'dev-tools'),
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      // Stub the Devvit client so the real game renders outside playtest.
      '@devvit/web/client': path.resolve(__dirname, 'dev-tools/devvit-shim.ts'),
      // Let the harness import the real source tree.
      '@src': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    // Farnsworth boots this server for its in-app canvas iframe — don't pop a
    // separate browser tab on Go Live. (`npm run story` keeps open:true for
    // manual browser iteration.)
    open: false,
    // App.jsx lives outside the dev-tools root and imports from ../lobby etc.
    fs: { allow: [path.resolve(__dirname)] },
    proxy: {
      // Real tRPC → Devvit dev server (WEBBIT_PORT, default 3000). Without a
      // running `npm run dev`, tRPC calls fail gracefully and the game still
      // renders (LoadingScreen → title); with it, live data populates.
      '/api/trpc': {
        target: `http://localhost:${process.env.WEBBIT_PORT ?? 3000}`,
        changeOrigin: true,
      },
      // Keep the storybook's admin proxy path working here too.
      '/dev-admin': {
        target: `http://localhost:${process.env.WEBBIT_PORT ?? 3000}`,
        changeOrigin: true,
      },
    },
  },
});
