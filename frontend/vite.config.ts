import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.dirname(fileURLToPath(import.meta.url)), '');
  const backendOrigin = (env.VITE_BACKEND_ORIGIN || 'https://dashboard.joristore.com').replace(/\/$/, '');

  return {
  build: {
    /** Production SPA served from Laravel `public/spa` (cPanel docroot or subfolder). */
    outDir: path.join(repoRoot, 'public/spa'),
    emptyOutDir: true,
  },
  plugins: [
    {
      name: 'jori-production-html',
      transformIndexHtml(html) {
        if (mode !== 'production') return html;
        return html.replace(
          'href="/api/store/manifest.webmanifest"',
          `href="${backendOrigin}/api/store/manifest.webmanifest"`,
        );
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'logo.svg', 'pwa-192.png', 'pwa-512.png', 'push-sw.js'],
      manifest: {
        id: '/',
        name: 'المتجر',
        short_name: 'المتجر',
        description: 'متجر إلكتروني',
        theme_color: '#7367f0',
        background_color: '#eef0f8',
        display: 'standalone',
        display_override: ['standalone', 'browser'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'ar',
        dir: 'rtl',
        categories: ['shopping'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        importScripts: ['push-sw.js'],
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/storage/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/dashboard\.joristore\.com\/index.php\/api\/store\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'store-api-cache', networkTimeoutSeconds: 8 },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'store-media',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/dashboard\.joristore\.com\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'store-media-remote',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  };
});
