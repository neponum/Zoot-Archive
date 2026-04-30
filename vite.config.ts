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
        includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'ZOOT.svg'],
        manifest: {
          name: 'Zoot Archive',
          short_name: 'Zoot',
          description: 'Zoot Archive App - Story Viewer and Translation Tool',
          theme_color: '#0e0e0e',
          background_color: '#0e0e0e',
          display: 'standalone',
          orientation: 'any',
          icons: [
            {
              src: 'ZOOT.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'ZOOT.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
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
