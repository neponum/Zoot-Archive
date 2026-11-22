import { platform } from './index';

let viewportInstalled = false;

/**
 * Android-приложение в горизонтали показывает десктопную раскладку.
 *
 * Телефон в landscape — это ~800 CSS px, из-за чего сайт выбирает планшетные
 * брейкпоинты. Фиксируем layout viewport на 1280 px: страница получает ту же
 * сетку, что на десктопе, и масштабируется целиком под экран. На сайте и в
 * портретной ориентации остаётся обычный `width=device-width`.
 */
export function applyNativeViewport(): void {
  if (platform.kind !== 'capacitor' || viewportInstalled) return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  viewportInstalled = true;

  const minScreen = Math.min(
    window.screen?.width || 0,
    window.screen?.height || 0
  );
  // Планшеты и десктопные окна не трогаем: им хватает собственной ширины.
  if (!minScreen || minScreen >= 768) return;

  const isLandscape = (): boolean => {
    const type = window.screen?.orientation?.type;
    if (type) return type.startsWith('landscape');
    const angle = (window as unknown as { orientation?: number }).orientation;
    if (typeof angle === 'number') return Math.abs(angle) === 90;
    return window.screen.width > window.screen.height;
  };

  const apply = () => {
    const content = isLandscape()
      ? 'width=1280'
      : 'width=device-width, initial-scale=1.0';
    if (meta.getAttribute('content') !== content) {
      meta.setAttribute('content', content);
    }
  };

  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}

/**
 * Нативная инициализация оболочки.
 *
 * Android: кнопка «назад» сначала листает историю WebView, а на корне
 * закрывает приложение; системный статус-бар (часы, заряд) скрыт, чтобы
 * приложение занимало весь экран и не показывало панель телефона.
 */
export async function initNativeShell(): Promise<void> {
  if (platform.kind !== 'capacitor') return;

  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        window.history.back();
        return;
      }
      void App.exitApp();
    });

    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    // WebView рисуется под системными панелями: скрытый статус-бар не оставляет
    // чёрную полосу, вместо неё виден фон самой страницы (как на сайте).
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.hide();

    // После диалогов/возврата из фона Android может показать статус-бар снова.
    await App.addListener('resume', () => {
      void StatusBar.hide();
    });
  } catch {
    /* плагины недоступны — приложение всё равно работает */
  }
}
