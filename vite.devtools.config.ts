import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, 'dev-tools'),
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    open: true,
    proxy: {
      // Forward /dev-admin to the Devvit server (WEBBIT_PORT, default 3000)
      '/dev-admin': {
        target: `http://localhost:${process.env.WEBBIT_PORT ?? 3000}`,
        changeOrigin: true,
      },
    },
  },
});
