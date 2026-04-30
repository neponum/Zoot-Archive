import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'ZOOT.png'],
        manifest: {
          name: 'ZOOT Archive',
          short_name: 'ZOOT',
          description: 'ZOOT Archive App',
          theme_color: '#0e0e0e',
          background_color: '#0e0e0e',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'ZOOT.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'ZOOT.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'ZOOT.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'ZOOT.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000 // 5MB
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
