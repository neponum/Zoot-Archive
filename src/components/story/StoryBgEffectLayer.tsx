import React from 'react';
import { StoryFxCanvas } from './StoryFxCanvas';

/**
 * Фоновые эффекты сценария (`[bgeffect]`).
 *
 * Настоящие `$eb_*` — Unity-префабы с частицами: они выгружены в
 * `ZOOT-DATA/avgfx` и рисуются `StoryFxCanvas`. Приближённых CSS-заглушек
 * больше нет: если данных эффекта нет, сцена остаётся без него — лучше
 * пусто, чем неверная картинка.
 */

export interface BgEffectState {
  name: string;
  layer: number;
}

export const StoryBgEffectLayer: React.FC<{ effect: BgEffectState | null }> = ({
  effect,
}) => {
  if (!effect) return null;
  return <StoryFxCanvas key={effect.name} name={effect.name} />;
};
