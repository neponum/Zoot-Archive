import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function usePageMeta() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let pageTitle = 'rhodes.monster — Arknights Story Reader & Translation Archive | Читалка Arknights';

    if (path === '/story/map' || path === '/maps') {
      pageTitle = 'Карта сюжета Arknights | Story Map — rhodes.monster';
    } else if (path === '/story/grid' || path === '/story/grid/lines' || path === '/grid') {
      pageTitle = 'Сетка глав Arknights | Story Grid — rhodes.monster';
    } else if (path === '/story') {
      pageTitle = 'Карта сюжета Arknights | Story Map — rhodes.monster';
    } else if (path === '/terminal') {
      pageTitle = 'Терминал | Terminal — rhodes.monster';
    } else if (path.startsWith('/story/')) {
      const storyName = path.replace('/story/', '').replace(/\.txt$/, '').split('/').pop() || 'Story';
      pageTitle = `${storyName} — Arknights Story Viewer | rhodes.monster`;
    } else if (path.startsWith('/event/')) {
      const eventId = path.replace('/event/', '');
      pageTitle = `Эпизод ${eventId} — Сюжет Arknights | rhodes.monster`;
    } else if (path.startsWith('/translate') || path.startsWith('/export')) {
      pageTitle = 'Перевод | Translation — rhodes.monster';
    } else if (path.startsWith('/operators')) {
      pageTitle = 'Оперативники и личные истории | Operators — rhodes.monster';
    } else if (path.startsWith('/privacy')) {
      pageTitle = 'Политика конфиденциальности — rhodes.monster';
    } else if (path.startsWith('/takedown')) {
      pageTitle = 'Правообладателям — rhodes.monster';
    } else if (path.startsWith('/disclaimer')) {
      pageTitle = 'О нас — rhodes.monster';
    }

    document.title = pageTitle;

    // Update Open Graph Title if tag exists
    const ogTitleMeta = document.querySelector('meta[property="og:title"]');
    if (ogTitleMeta) {
      ogTitleMeta.setAttribute('content', pageTitle);
    }
  }, [location.pathname]);
}
