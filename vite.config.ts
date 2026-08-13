import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'sounds/*.mp3'],
      manifest: {
        name: 'Sahadhyāna — Meditate Together',
        short_name: 'Sahadhyāna',
        description: 'Sit together, wherever you are. Shared meditation rooms with synchronized audio.',
        theme_color: '#f7f3ea',
        background_color: '#f7f3ea',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,mp3,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Never cache Supabase realtime/API traffic
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Cache audio/media loosely, always revalidate
            urlPattern: /\.(?:mp3|m4a|ogg|aac|wav)$/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'media-cache' },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
