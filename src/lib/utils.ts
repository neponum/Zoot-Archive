import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { StoryChapter } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getChapterDisplayCode(chapter: StoryChapter): string {
  let displayCode = chapter.code;
  if (!displayCode) {
    const parts = chapter.id.split('_');
    if (['beg', 'mid', 'end'].includes(parts[parts.length - 1].toLowerCase())) {
      displayCode = parts[parts.length - 2]?.toUpperCase() || chapter.id;
    } else {
      displayCode = parts[parts.length - 1]?.toUpperCase() || chapter.id;
    }
  }
  return displayCode;
}

export function getChapterFullDisplayCode(chapter: StoryChapter): string {
  const baseCode = getChapterDisplayCode(chapter);
  const lowerId = chapter.id.toLowerCase();
  
  if (lowerId.includes('_beg')) return `${baseCode} BEG`;
  if (lowerId.includes('_mid')) return `${baseCode} MID`;
  if (lowerId.includes('_end')) return `${baseCode} END`;
  
  return baseCode;
}
