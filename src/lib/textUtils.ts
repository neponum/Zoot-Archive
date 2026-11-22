export interface TextSegment {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  size?: string;
}

/**
 * Parses Arknights and Visual Novel rich text tags:
 * - <color=#HEX or name>...</color>
 * - <b>...</b>
 * - <i>...</i>
 * - <u>...</u>
 * - <size=...>...</size>
 * Strips raw internal tags while preserving character stream for typewriter effect.
 */
/**
 * Приводит игровые inline-теги к обычному тексту.
 *
 * - `<p=1>строка</><p=2>строка</>` — это разбивка на строки (подписи места
 *   и времени, двуязычные цитаты), а не rich-text. Превращаем в `\n`.
 * - `<@tu.kw>слово</>` — подсветка термина в туториале; теги убираем,
 *   `</>` не должен становиться переносом строки.
 *
 * Важно: `</>` закрывает и `<p=N>`, и `<@tu.*>`. Поэтому перенос ставим
 * только между `<p>`-блоками, а не после каждого `</>`.
 */
export const normalizeInlineTags = (input: string): string => {
  if (!input) return '';

  let text = input;

  if (/<p=\d+>/i.test(text)) {
    text = text
      .split(/<p=\d+>/i)
      .map((part) => {
        // Последний `</>` в блоке закрывает сам <p>, остальные — inline-теги.
        const lastClose = part.lastIndexOf('</>');
        const withoutParagraphClose =
          lastClose === -1
            ? part
            : part.slice(0, lastClose) + part.slice(lastClose + 3);
        return withoutParagraphClose
          .replace(/<\/>/g, '')
          .replace(/<@tu\.[a-z]+>/gi, '')
          .trim();
      })
      .filter((part, index) => index > 0 || part.length > 0)
      .join('\n');
  } else {
    text = text.replace(/<\/>/g, '').replace(/<@tu\.[a-z]+>/gi, '');
  }

  return text.replace(/\n{3,}/g, '\n\n').trim();
};

export const parseTags = (rawInput: string): TextSegment[] => {
  if (!rawInput) return [];

  // `<p=1>строка</><p=2>строка</>` — это разбивка на строки, а не rich-text.
  // Обрабатываем и здесь, чтобы теги не просачивались в компоненты, которые
  // рендерят текст без парсера сценария (стикеры, субтитры).
  const input = normalizeInlineTags(rawInput);

  const segments: TextSegment[] = [];
  // Regex matching color, bold, italic, underline, size and closing tags
  const regex = /(<color=([^>]+)>)|(<\/color>)|(<b>)|(<\/b>)|(<i>)|(<\/i>)|(<u>)|(<\/u>)|(<size=([^>]+)>)|(<\/size>)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  const currentStyle: {
    color?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    size?: string;
  } = {};

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = input.slice(lastIndex, match.index);
      if (textChunk.length > 0) {
        segments.push({ 
          text: textChunk,
          ...currentStyle
        });
      }
    }

    if (match[1]) { // <color=...>
      const rawColor = match[2].replace(/['"]/g, '').trim();
      // Only allow valid hex, rgb, rgba, or alphanumeric named colors
      if (/^#[0-9a-fA-F]{3,8}$/.test(rawColor) || /^rgba?\([0-9,.\s%]+\)$/i.test(rawColor) || /^[a-zA-Z]+$/.test(rawColor)) {
        currentStyle.color = rawColor;
      }
    } else if (match[3]) { // </color>
      delete currentStyle.color;
    } else if (match[4]) { // <b>
      currentStyle.bold = true;
    } else if (match[5]) { // </b>
      delete currentStyle.bold;
    } else if (match[6]) { // <i>
      currentStyle.italic = true;
    } else if (match[7]) { // </i>
      delete currentStyle.italic;
    } else if (match[8]) { // <u>
      currentStyle.underline = true;
    } else if (match[9]) { // </u>
      delete currentStyle.underline;
    } else if (match[10]) { // <size=...>
      const rawSize = match[11].replace(/['"]/g, '').trim();
      // Only allow valid numeric sizes with optional unit
      if (/^[0-9]+(\.[0-9]+)?(px|pt|rem|em|%)?$/.test(rawSize)) {
        currentStyle.size = /^[0-9]+$/.test(rawSize) ? `${rawSize}px` : rawSize;
      }
    } else if (match[12]) { // </size>
      delete currentStyle.size;
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    const remainingText = input.slice(lastIndex);
    if (remainingText.length > 0) {
      segments.push({ 
        text: remainingText,
        ...currentStyle
      });
    }
  }

  return segments;
};

