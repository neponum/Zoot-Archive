export interface TextSegment {
  text: string;
  color?: string;
  bold?: boolean;
}

export const parseTags = (input: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  // Regex to match <color=...>content</color> or <b>content</b>
  const regex = /(<color=([^>]+)>)|(<\/color>)|(<b>)|(<\/b>)/g;
  let lastIndex = 0;
  let match;
  
  const currentStyle: { color?: string; bold?: boolean } = {};

  while ((match = regex.exec(input)) !== null) {
    // Add text before the tag
    if (match.index > lastIndex) {
      segments.push({ 
        text: input.slice(lastIndex, match.index),
        ...currentStyle
      });
    }

    if (match[1]) { // <color=...>
      currentStyle.color = match[2].replace(/['"]/g, '');
    } else if (match[3]) { // </color>
      delete currentStyle.color;
    } else if (match[4]) { // <b>
      currentStyle.bold = true;
    } else if (match[5]) { // </b>
      delete currentStyle.bold;
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({ 
      text: input.slice(lastIndex),
      ...currentStyle
    });
  }

  return segments;
};
