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
export const parseTags = (input: string): TextSegment[] => {
  if (!input) return [];

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
      currentStyle.color = match[2].replace(/['"]/g, '').trim();
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
      currentStyle.size = match[11].replace(/['"]/g, '').trim();
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

