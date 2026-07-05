import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from 'path';

export default defineConfig(({ mode }) => ({
  // Statically replace process.env.NODE_ENV so no runtime `process` reference
  // remains in the content scripts / service worker (where `process` is undefined).
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
  },
  plugins: [
    preact(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@swovid/detection': path.resolve(__dirname, '../../packages/detection/src/index.ts'),
      '@swovid/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        settings: 'src/settings/index.html',
        onboarding: 'src/onboarding/index.html',
        offscreen: 'src/offscreen/index.html',
      },
    },
  },
}));
