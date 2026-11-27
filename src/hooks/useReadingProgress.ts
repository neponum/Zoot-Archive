import { useState, useCallback, useEffect } from 'react';
import { fetchChapterList } from '../services/storyService';
import { StoryEpisode } from '../types';

const READ_KEY = 'ak-read-chapters';
/**
 * Резервная копия прогресса в cookie на `.rhodes.monster`.
 *
 * localStorage привязан к конкретному хосту: отметки на `rhodes.monster`
 * не видны на `www.rhodes.monster`, `terminal.rhodes.monster` и наоборот,
 * поэтому после смены адреса главы выглядели непрочитанными. Cookie с
 * общим доменом переносит прогресс на новый хост.
 */
const PROGRESS_COOKIE = 'ak_read_progress';
const COOKIE_LIMIT = 3800;

function loadSavedRead(): Set<string> {
  try {
    const saved = localStorage.getItem(READ_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch (e) {
    console.error('Failed to parse read chapters from localStorage:', e);
    return new Set();
  }
}

function readProgressCookie(): string[] {
  try {
    const row = document.cookie
      .split('; ')
      .find((item) => item.startsWith(`${PROGRESS_COOKIE}=`));
    if (!row) return [];
    const raw = decodeURIComponent(row.slice(PROGRESS_COOKIE.length + 1));
    return raw.split('|').filter(Boolean);
  } catch {
    return [];
  }
}

function writeProgressCookie(keys: Set<string>): void {
  if (typeof document === 'undefined') return;
  try {
    const all = Array.from(keys);
    // Сначала все отметки глав, затем самые свежие операции — пока влезает
    // в лимит cookie. Старые операции при переполнении отбрасываются.
    const chapters = all.filter((key) => !key.startsWith('op:'));
    const operations = all.filter((key) => key.startsWith('op:'));
    const chosen: string[] = [];
    const fits = (candidate: string[]) =>
      encodeURIComponent(candidate.join('|')).length <= COOKIE_LIMIT;
    for (const key of chapters) {
      if (fits([...chosen, key])) chosen.push(key);
    }
    for (let i = operations.length - 1; i >= 0; i -= 1) {
      if (!fits([...chosen, operations[i]])) break;
      chosen.push(operations[i]);
    }
    const host = window.location.hostname;
    const domain =
      host === 'rhodes.monster' || host.endsWith('.rhodes.monster')
        ? '; domain=.rhodes.monster'
        : '';
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${PROGRESS_COOKIE}=${encodeURIComponent(
      chosen.join('|')
    )}; path=/; max-age=31536000; SameSite=Lax${secure}${domain}`;
  } catch {
    /* cookie могут быть запрещены — остаётся localStorage */
  }
}

export function useReadingProgress(setTranslationEpisode?: (ep: StoryEpisode | null) => void) {
  const [readChapters, setReadChapters] = useState<Set<string>>(() => {
    const local = loadSavedRead();
    if (local.size > 0) return local;

    // На этом хосте отметок ещё нет — забираем их из общей cookie.
    const fromCookie = readProgressCookie();
    if (fromCookie.length > 0) {
      const restored = new Set(fromCookie);
      try {
        localStorage.setItem(READ_KEY, JSON.stringify(Array.from(restored)));
      } catch {
        /* приватный режим */
      }
      return restored;
    }
    return local;
  });

  const [bookmarkedChapters, setBookmarkedChapters] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ak-bookmarked-chapters');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      console.error('Failed to parse bookmarked chapters from localStorage:', e);
      return new Set();
    }
  });

  // Зеркалим прогресс в localStorage и в общую cookie при каждом изменении.
  useEffect(() => {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readChapters)));
    } catch {
      /* приватный режим */
    }
    writeProgressCookie(readChapters);
  }, [readChapters]);

  const handleToggleRead = useCallback((chapterId: string) => {
    setReadChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }, []);

  const handleChapterComplete = useCallback(async (storyTxt: string) => {
    try {
      const episodes = await fetchChapterList();
      let chapterId = storyTxt;
      let foundEpisode: StoryEpisode | null = null;
      for (const ep of episodes) {
        const chapter = ep.chapters.find(c => c.storyTxt === storyTxt);
        if (chapter) {
          chapterId = chapter.id;
          foundEpisode = ep;
          break;
        }
      }

      if (foundEpisode && setTranslationEpisode) {
        setTranslationEpisode(foundEpisode);
      }

      setReadChapters(prev => {
        const next = new Set(prev);
        next.add(chapterId);
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  }, [setTranslationEpisode]);

  return {
    readChapters,
    bookmarkedChapters,
    setReadChapters,
    setBookmarkedChapters,
    handleToggleRead,
    handleChapterComplete,
  };
}
