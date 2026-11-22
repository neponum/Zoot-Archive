import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'monster.rhodes.app',
  appName: 'rhodes',
  webDir: 'dist',
  android: {
    backgroundColor: '#0e0e0e',
    allowMixedContent: false,
  },
  server: {
    // https-схема нужна, чтобы WebView не считал приложение небезопасным
    // и мог ходить к https-зеркалам без mixed content.
    androidScheme: 'https',
  },
  plugins: {
    // Нативный HTTP поверх window.fetch: обходит CORS для PRTS и зеркал.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
