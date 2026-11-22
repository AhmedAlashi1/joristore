import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.dirname(fileURLToPath(import.meta.url)), '');
  const backendOrigin = (env.VITE_BACKEND_ORIGIN || 'https://dashboard.sportsworldps.com').replace(/\/$/, '');
  const dashboardHostEscaped = new URL(backendOrigin).hostname.replace(/\./g, '\\.');

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
          'href="/index.php/api/store/manifest.webmanifest"',
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
        navigateFallbackDenylist: [/^\/api/, /^\/index\.php\/api/, /^\/storage/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/api/store/') || url.pathname.includes('/index.php/api/store/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'store-media',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
              plugins: [
                {
                  cacheWillUpdate: async ({ response }: { response: Response }) => {
                    if (!response?.ok) return null;
                    const ct = (response.headers.get('content-type') || '').toLowerCase();
                    if (ct.includes('text/html')) return null;
                    if (!ct.includes('image')) return null;
                    return response;
                  },
                },
              ],
            },
          },
          {
            urlPattern: new RegExp(`^https://${dashboardHostEscaped}/storage/.*`, 'i'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'store-media-remote',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
              plugins: [
                {
                  cacheWillUpdate: async ({ response }: { response: Response }) => {
                    if (!response?.ok) return null;
                    const ct = (response.headers.get('content-type') || '').toLowerCase();
                    if (ct.includes('text/html')) return null;
                    if (!ct.includes('image')) return null;
                    return response;
                  },
                },
              ],
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
