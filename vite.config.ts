import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  // В нативных сборках service worker не нужен: приложение уже установлено,
  // а precache на 22 МБ только замедляет первый запуск.
  const native = process.env.NATIVE_BUILD === '1';
  return {
    plugins: [
      react(), 
      tailwindcss(),
      !native &&
        VitePWA({
          // Автообновление: новая версия ставится сразу при заходе на сайт,
          // без баннера «доступна новая версия».
          registerType: 'autoUpdate',
          injectRegister: 'auto',
          devOptions: {
            enabled: true
          },
          includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'ZOOT.svg', 'ZOOT.png'],
          manifest: {
            id: '/',
            name: 'rhodes.monster',
            short_name: 'rhodes',
            description: 'rhodes.monster — читалка Arknights и архив переводов',
            theme_color: '#0e0e0e',
            background_color: '#0e0e0e',
            display: 'standalone',
            orientation: 'any',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: 'ZOOT.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any'
              },
              {
                src: 'ZOOT.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: 'ZOOT-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: 'maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ]
          },
        workbox: {
          maximumFileSizeToCacheInBytes: 25000000, // 25MB
          // Spine-runtime (300 КБ) нужен только на экране досье — грузим лениво,
          // без precache, чтобы не тянуть его каждому посетителю.
          globIgnores: ['**/vendor/**'],
          skipWaiting: true,
          clientsClaim: true,
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
          // Арт глав и событий лежит на внешнем зеркале и не меняется —
          // держим его в кэше браузера, чтобы карта и панель главы
          // открывались мгновенно при повторных заходах.
          runtimeCaching: [
            {
              urlPattern:
                /^https:\/\/torappu\.prts\.wiki\/.*\.(?:png|jpe?g|webp|avif|svg)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'mixstory-art',
                expiration: {
                  maxEntries: 250,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Основной путь для ассетов истории, когда PRTS недоступен
              // напрямую: wsrv.nl/weserv. Кэшируем, иначе каждая операция
              // заново тянет десятки картинок и упирается в бюджет загрузки.
              urlPattern: /^https:\/\/(?:images\.weserv\.nl|wsrv\.nl)\//i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'story-art-weserv',
                expiration: {
                  maxEntries: 400,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern:
                /^https:\/\/fastly\.jsdelivr\.net\/gh\/neponum\/zoot-data\/.*\.(?:png|jpe?g|webp|avif|svg)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'zoot-banners',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // zoot-data больше 50 МБ, поэтому часть баннеров идёт напрямую
              // с raw.githubusercontent (jsDelivr отдаёт 403). Их тоже держим
              // в кэше, иначе карта и сетка глав каждый раз тянут их заново.
              urlPattern:
                /^https:\/\/raw\.githubusercontent\.com\/neponum\/zoot-data\/.*\.(?:png|jpe?g|webp|avif|svg)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'zoot-banners-raw',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // В приложении PWA-плагина нет, а main.tsx всё равно его импортирует.
        ...(native
          ? { 'virtual:pwa-register': path.resolve(__dirname, 'src/platform/pwaRegisterStub.ts') }
          : {}),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Сборки Android и артефакты релиза лежат внутри проекта: без этого
      // Vite перезагружает страницу на каждый файл Gradle.
      watch: {
        ignored: ['**/android/**', '**/dist/**', '**/dist-server/**', '**/release/**', '**/dev-dist/**'],
      },
    },
  };
});
