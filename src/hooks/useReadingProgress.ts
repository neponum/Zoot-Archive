import { useState, useCallback } from 'react';
import { fetchChapterList } from '../services/storyService';
import { StoryEpisode } from '../types';

export function useReadingProgress(setTranslationEpisode?: (ep: StoryEpisode | null) => void) {
  const [readChapters, setReadChapters] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ak-read-chapters');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      console.error('Failed to parse read chapters from localStorage:', e);
      return new Set();
    }
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

  const handleToggleRead = useCallback((chapterId: string) => {
    setReadChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      localStorage.setItem('ak-read-chapters', JSON.stringify(Array.from(next)));
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
        localStorage.setItem('ak-read-chapters', JSON.stringify(Array.from(next)));
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
