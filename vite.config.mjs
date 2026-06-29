import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { askApiPlugin } from './src/server/api/askApiPlugin.js';

export default defineConfig(({ command }) => ({
  base:
    process.env.CAMP_SCOUT_BASE ??
    (command === 'build' ? '/camp-scout-ai/' : '/'),
  plugins: [react(), askApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: process.env.BUILD_OUT_DIR ?? 'docs',
    emptyOutDir: false,
  },
  server: {
    hmr: true,
  },
}));
