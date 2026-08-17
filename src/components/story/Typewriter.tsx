import React, { useState, useEffect, useRef, useMemo } from 'react';
import { parseTags } from '../../lib/textUtils';

interface TypewriterProps {
  text: string;
  speed?: number;
  onFinished?: () => void;
  skip?: boolean;
  paused?: boolean;
  className?: string;
  style?: React.CSSProperties;
  // Aliases for compatibility
  isSkipping?: boolean;
  skipSpeed?: number;
  forceComplete?: boolean;
  onComplete?: () => void;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 30,
  onFinished,
  skip = false,
  paused = false,
  className,
  style,
  isSkipping = false,
  skipSpeed,
  forceComplete = false,
  onComplete,
}) => {
  const effectiveSkip = skip || forceComplete || isSkipping;
  const effectiveSpeed = skipSpeed !== undefined ? skipSpeed : speed;
  const effectiveOnFinished = onFinished || onComplete;

  const segments = useMemo(() => parseTags(text), [text]);
  const totalVisibleLength = useMemo(() => 
    segments.reduce((acc, seg) => acc + seg.text.length, 0), 
    [segments]
  );

  const [visibleChars, setVisibleChars] = useState(0);
  const finishedCalledRef = useRef<string | null>(null);
  const currentCharsRef = useRef(0);
  
  const handleFinished = () => {
    if (finishedCalledRef.current !== text) {
      finishedCalledRef.current = text;
      effectiveOnFinished?.();
    }
  };

  useEffect(() => {
    if (effectiveSkip) {
      setVisibleChars(totalVisibleLength);
      currentCharsRef.current = totalVisibleLength;
      handleFinished();
      return;
    }

    if (paused) return;

    if (currentCharsRef.current >= totalVisibleLength && finishedCalledRef.current === text) {
      return;
    }

    if (currentCharsRef.current === 0 || finishedCalledRef.current !== null) {
      // If the new text simply appends to the old text that just finished,
      // we shouldn't reset the typed characters. We just clear the finished flag.
      if (finishedCalledRef.current !== null && text.startsWith(finishedCalledRef.current)) {
        finishedCalledRef.current = null;
      } else {
        setVisibleChars(0);
        currentCharsRef.current = 0;
        finishedCalledRef.current = null;
      }
    }
    
    if (totalVisibleLength === 0) {
      handleFinished();
      return;
    }

    const interval = setInterval(() => {
      if (paused) return;
      
      currentCharsRef.current++;
      if (currentCharsRef.current >= totalVisibleLength) {
        setVisibleChars(totalVisibleLength);
        clearInterval(interval);
        handleFinished();
      } else {
        setVisibleChars(currentCharsRef.current);
      }
    }, effectiveSpeed);

    return () => clearInterval(interval);
  }, [text, effectiveSpeed, totalVisibleLength, effectiveSkip, paused]);

  const renderSegments = () => {
    let charsLeft = visibleChars;
    return segments.map((seg, idx) => {
      if (charsLeft <= 0) return null;
      
      const textToShow = seg.text.slice(0, charsLeft);
      charsLeft -= seg.text.length;
      
      return (
        <span 
          key={idx} 
          style={{ 
            color: seg.color,
            fontWeight: seg.bold ? 'bold' : undefined,
            fontStyle: seg.italic ? 'italic' : undefined,
            textDecoration: seg.underline ? 'underline' : undefined,
            fontSize: seg.size ? seg.size : undefined,
          }}
        >
          {textToShow}
        </span>
      );
    });
  };

  return (
    <span className={className} style={style}>
      {renderSegments()}
    </span>
  );
};

export const MemoizedTypewriter = React.memo(Typewriter);
