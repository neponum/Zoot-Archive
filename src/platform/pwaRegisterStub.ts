/**
 * Заглушка `virtual:pwa-register` для Android-сборки (Capacitor).
 * Плагин PWA там отключён, а `main.tsx` всё равно импортирует регистратор —
 * в приложении регистрировать нечего.
 */
export const registerSW = (_options?: unknown) => () => Promise.resolve();
export default registerSW;
