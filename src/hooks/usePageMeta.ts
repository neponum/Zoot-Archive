import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function usePageMeta() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let pageTitle = 'ZOOT Archive — Arknights Story Reader & Translation Archive | Читалка Arknights';

    if (path.startsWith('/story/')) {
      const storyName = path.replace('/story/', '').replace(/\.txt$/, '').split('/').pop() || 'Story';
      pageTitle = `${storyName} — Arknights Story Viewer | ZOOT Archive`;
    } else if (path.startsWith('/translate')) {
      pageTitle = 'Студия перевода Arknights | Translation Studio — ZOOT Archive';
    } else if (path.startsWith('/event/')) {
      const eventId = path.replace('/event/', '');
      pageTitle = `Эпизод ${eventId} — Сюжет Arknights | ZOOT Archive`;
    } else if (path.startsWith('/operators')) {
      pageTitle = 'Оперативники и личные истории | Operators — ZOOT Archive';
    } else if (path.startsWith('/music')) {
      pageTitle = 'Музыкальный плеер | Soundtrack — ZOOT Archive';
    }

    document.title = pageTitle;

    // Update Open Graph Title if tag exists
    const ogTitleMeta = document.querySelector('meta[property="og:title"]');
    if (ogTitleMeta) {
      ogTitleMeta.setAttribute('content', pageTitle);
    }
  }, [location.pathname]);
}
