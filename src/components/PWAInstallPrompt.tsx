import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      return;
    }

    const hasPrompted = localStorage.getItem('ak-pwa-prompt-dismissed');
    if (hasPrompted) return;

    // Make sure we only show it on mobile/tablet devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Better iPadOS detection (they report as MacIntel but have touch points)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Listen for the beforeinstallprompt event (mostly Chrome/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback if beforeinstallprompt doesn't fire
    // For iOS and some Android browsers
    let fallbackTimer: any;
    if (isMobile && !hasPrompted) {
       // Wait slightly longer to ensure full load
       fallbackTimer = setTimeout(() => {
         setShowPrompt(true);
       }, 8000); 
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      // iOS doesn't have an automatic prompt, user must use share sheet
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
          alert("Чтобы установить приложение, нажмите кнопку 'Поделиться' в Safari и выберите 'На экран «Домой»'.");
      } else {
          alert("Используйте функцию меню браузера 'Установить приложение / Добавить на главный экран', чтобы скачать приложение.");
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ak-pwa-prompt-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed bottom-6 pb-[env(safe-area-inset-bottom)] left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm"
        >
          <div className="bg-[#1a1a1a] border border-white/10 backdrop-blur-xl rounded-xl p-4 flex gap-4 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <div className="bg-white/5 p-3 rounded-lg shrink-0 flex items-center justify-center">
              <Download className="w-6 h-6 text-[#2998ff]" />
            </div>
            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="text-[13px] font-bold text-white mb-1 tracking-wide">Установить как приложение</h3>
              <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                Скачайте Zoot Archive для более быстрого доступа с домашнего экрана вашего устройства.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-1.5 bg-[#2998ff] hover:bg-[#2998ff]/80 text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                >
                  Скачать
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                >
                  Позже
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-2 text-white/30 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
