import type { Platform, PlatformKind } from './types';
import { webPlatform } from './web';
import { createCapacitorPlatform } from './capacitor';

function detectPlatform(): PlatformKind {
  if (typeof window === 'undefined') return 'web';
  const candidate = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  };
  if (candidate.Capacitor?.isNativePlatform?.()) return 'capacitor';
  return 'web';
}

const detected = detectPlatform();

function selectPlatform(): Platform {
  switch (detected) {
    case 'capacitor':
      return createCapacitorPlatform();
    default:
      return webPlatform;
  }
}

export const platform: Platform = selectPlatform();

export type { Platform, PlatformKind } from './types';
