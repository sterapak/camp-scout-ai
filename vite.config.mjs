import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { askApiPlugin } from './src/server/api/askApiPlugin.js';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/camp-scout-ai/' : '/',
  plugins: [react(), askApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'docs',
    emptyOutDir: false,
  },
  server: {
    hmr: true,
  },
}));
