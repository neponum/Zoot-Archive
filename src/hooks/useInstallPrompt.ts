import { useCallback, useEffect, useState } from 'react';

type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * `beforeinstallprompt` приходит один раз и только в Chromium-браузерах.
 * Держим его на уровне модуля: кнопка «Установить» на главной должна видеть
 * событие, даже если компонент смонтировался позже.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
const subscribers = new Set<() => void>();

const emit = () => {
  subscribers.forEach((notify) => notify());
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Не даём браузеру показывать свой баннер: установка — только по кнопке.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedFlag = true;
    emit();
  });
}

/**
 * Установка PWA по явному действию пользователя.
 * Никаких автоматических баннеров и таймеров — только кнопка на главной.
 */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(Boolean(deferredPrompt));
  const [installed, setInstalled] = useState(installedFlag || isStandalone());

  useEffect(() => {
    const sync = () => {
      setCanInstall(Boolean(deferredPrompt));
      setInstalled(installedFlag || isStandalone());
    };
    subscribers.add(sync);
    sync();
    return () => {
      subscribers.delete(sync);
    };
  }, []);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    const event = deferredPrompt;
    if (!event) return 'unavailable';

    deferredPrompt = null;
    emit();

    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') {
      installedFlag = true;
      emit();
    }
    return choice.outcome;
  }, []);

  return { canInstall, installed, install };
}
