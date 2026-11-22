import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getUiLanguage } from '../utils/uiLanguage';

export function usePageMeta() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const uiLang = getUiLanguage();
    const isRu = uiLang === 'ru_RU' || uiLang === 'ru_RU_CN';
    let pageTitle = isRu
      ? 'rhodes.monster — Читалка Arknights и архив переводов'
      : 'rhodes.monster — Arknights Story Reader & Translation Archive';

    if (path === '/story/map' || path === '/maps' || path === '/story') {
      pageTitle = isRu
        ? 'Карта сюжета Arknights — rhodes.monster'
        : 'Arknights Story Map — rhodes.monster';
    } else if (path === '/story/grid' || path === '/story/grid/lines' || path === '/grid') {
      pageTitle = isRu
        ? 'Сетка глав Arknights — rhodes.monster'
        : 'Arknights Story Grid — rhodes.monster';
    } else if (path === '/terminal') {
      pageTitle = isRu ? 'Терминал — rhodes.monster' : 'Terminal — rhodes.monster';
    } else if (path.startsWith('/story/')) {
      const storyName = path.replace('/story/', '').replace(/\.txt$/, '').split('/').pop() || 'Story';
      pageTitle = `${storyName} — ${isRu ? 'Читалка Arknights' : 'Arknights Story Viewer'} — rhodes.monster`;
    } else if (path.startsWith('/event/')) {
      const eventId = path.replace('/event/', '');
      pageTitle = isRu
        ? `Эпизод ${eventId} — Сюжет Arknights — rhodes.monster`
        : `Episode ${eventId} — Arknights Story — rhodes.monster`;
    } else if (path.startsWith('/translate') || path.startsWith('/export')) {
      pageTitle = isRu ? 'Перевод — rhodes.monster' : 'Translation — rhodes.monster';
    } else if (path.startsWith('/operators')) {
      pageTitle = isRu
        ? 'Оперативники и личные истории — rhodes.monster'
        : 'Operators and Personal Stories — rhodes.monster';
    } else if (path.startsWith('/privacy')) {
      pageTitle = isRu
        ? 'Политика конфиденциальности — rhodes.monster'
        : 'Privacy Policy — rhodes.monster';
    } else if (path.startsWith('/takedown')) {
      pageTitle = isRu ? 'Правообладателям — rhodes.monster' : 'Takedown — rhodes.monster';
    } else if (path.startsWith('/disclaimer')) {
      pageTitle = isRu ? 'О нас — rhodes.monster' : 'About — rhodes.monster';
    }

    document.title = pageTitle;

    // Update Open Graph Title if tag exists
    const ogTitleMeta = document.querySelector('meta[property="og:title"]');
    if (ogTitleMeta) {
      ogTitleMeta.setAttribute('content', pageTitle);
    }
  }, [location.pathname]);
}
