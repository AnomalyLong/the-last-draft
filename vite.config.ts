import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { devvit } from '@devvit/start/vite';
import { builtinModules } from 'node:module';

const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    devvit({
      server: {
        build: {
          rollupOptions: {
            external: nodeBuiltins,
          },
        },
      },
    }),
  ],
});
