import React from 'react';

export function getCssEase(ease?: string): string {
  if (!ease) return 'cubic-bezier(0.25, 0.1, 0.25, 1)';
  const e = ease.toLowerCase();
  if (e.includes('linear')) return 'linear';
  if (e.includes('easeinout') || e.includes('ease-in-out')) return 'cubic-bezier(0.42, 0, 0.58, 1)';
  if (e.includes('easein') || e.includes('ease-in')) return 'cubic-bezier(0.42, 0, 1, 1)';
  if (e.includes('easeout') || e.includes('ease-out')) return 'cubic-bezier(0, 0, 0.58, 1)';
  return 'cubic-bezier(0.25, 0.1, 0.25, 1)';
}

export interface CssTransformBoxProps {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  xFrom?: number;
  yFrom?: number;
  scaleXFrom?: number;
  scaleYFrom?: number;
  duration?: number;
  ease?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const CssTransformBox: React.FC<CssTransformBoxProps> = React.memo(({
  x = 0,
  y = 0,
  scaleX = 1,
  scaleY = 1,
  xFrom,
  yFrom,
  scaleXFrom,
  scaleYFrom,
  duration = 0,
  ease = "easeInOut",
  className = "",
  style = {},
  children
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastTargetRef = React.useRef({ x, y, scaleX, scaleY });
  const isFirstRender = React.useRef(true);

  React.useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const last = lastTargetRef.current;
    const targetChanged = 
      last.x !== x || 
      last.y !== y || 
      last.scaleX !== scaleX || 
      last.scaleY !== scaleY;

    const fromProvided = 
      xFrom !== undefined || 
      yFrom !== undefined || 
      scaleXFrom !== undefined || 
      scaleYFrom !== undefined;

    const cssEase = getCssEase(ease);
    const targetTransform = `translate3d(${x}px, ${y}px, 0px) scale(${scaleX}, ${scaleY})`;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastTargetRef.current = { x, y, scaleX, scaleY };

      if (fromProvided && duration > 0) {
        const startX = xFrom ?? x;
        const startY = yFrom ?? y;
        const startScaleX = scaleXFrom ?? scaleX;
        const startScaleY = scaleYFrom ?? scaleY;
        const startTransform = `translate3d(${startX}px, ${startY}px, 0px) scale(${startScaleX}, ${startScaleY})`;

        node.style.transition = 'none';
        node.style.transform = startTransform;

        // Force browser layout flush
        void node.offsetHeight;

        const animationFrame = requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.style.transition = `transform ${duration}s ${cssEase}`;
            containerRef.current.style.transform = targetTransform;
          }
        });
        return () => cancelAnimationFrame(animationFrame);
      } else {
        node.style.transition = 'none';
        node.style.transform = targetTransform;
      }
      return;
    }

    if (targetChanged || fromProvided) {
      lastTargetRef.current = { x, y, scaleX, scaleY };

      let startTransform: string;
      if (fromProvided) {
        startTransform = `translate3d(${xFrom ?? x}px, ${yFrom ?? y}px, 0px) scale(${scaleXFrom ?? scaleX}, ${scaleYFrom ?? scaleY})`;
      } else {
        const computed = window.getComputedStyle(node).transform;
        startTransform = (computed && computed !== 'none') 
          ? computed 
          : `translate3d(${last.x}px, ${last.y}px, 0px) scale(${last.scaleX}, ${last.scaleY})`;
      }

      node.style.transition = 'none';
      node.style.transform = startTransform;

      // Force browser reflow
      void node.offsetHeight;

      const animationFrame = requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = duration > 0 ? `transform ${duration}s ${cssEase}` : 'none';
          containerRef.current.style.transform = targetTransform;
        }
      });
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [x, y, scaleX, scaleY, xFrom, yFrom, scaleXFrom, scaleYFrom, duration, ease]);

  return (
    <div 
      ref={containerRef}
      className={className} 
      style={{ 
        ...style, 
        transformOrigin: 'center center',
        willChange: 'transform'
      }}
    >
      {children}
    </div>
  );
});

