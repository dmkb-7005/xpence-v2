import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from https://dmkb-7005.github.io/xpence/
export default defineConfig({
  base: '/xpence/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Xpence',
        short_name: 'Xpence',
        description: 'Local-first personal expense tracker',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#5fa86a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Add expense',
            short_name: 'Add',
            url: './#/expenses/new',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      // App shell only. The service worker never touches IndexedDB.
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'] },
    }),
  ],
  test: { globals: true, environment: 'node' },
});
