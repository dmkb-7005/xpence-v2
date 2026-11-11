import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from https://dmkb-7005.github.io/xpence-v2/
export default defineConfig({
  base: '/xpence-v2/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg', 'icons/favicon-32.png'],
      manifest: {
        name: 'Xpence',
        short_name: 'Xpence',
        description: 'Local-first personal expense tracker',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1a1f2b',
        theme_color: '#1a1f2b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Add expense',
            short_name: 'Add',
            url: './#/expenses/new',
            icons: [
              { src: 'icons/shortcut-add-96.png', sizes: '96x96', type: 'image/png' },
              { src: 'icons/shortcut-add-192.png', sizes: '192x192', type: 'image/png' },
            ],
          },
        ],
      },
      // App shell only. The service worker never touches IndexedDB.
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'] },
    }),
  ],
  test: { globals: true, environment: 'node' },
});
