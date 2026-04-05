import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone } from 'lucide-react';

export const OrientationOverlay: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const isNarrow = window.innerWidth < 1024;
      
      // Show overlay if it's portrait AND narrow (covers all phones/tablets and narrow desktop windows)
      const shouldShow = isPortrait && isNarrow;
      
      setShowOverlay(shouldShow);
    };

    checkOrientation();
    
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    const mql = window.matchMedia('(orientation: portrait)');
    const mqlListener = () => checkOrientation();
    mql.addEventListener('change', mqlListener);

    const interval = setInterval(checkOrientation, 1000);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      mql.removeEventListener('change', mqlListener);
      clearInterval(interval);
    };
  }, []);

  const overlay = (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          key="orientation-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ zIndex: 999999 }}
          className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center p-8 text-center touch-none select-none pointer-events-auto"
        >
          <motion.div
            animate={{ rotate: 90 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="mb-8"
          >
            <Smartphone className="w-24 h-24 text-white/40" />
          </motion.div>
          <h2 className="text-white text-2xl font-bold tracking-[0.2em] mb-4 uppercase">
            Please Rotate Your Device
          </h2>
          <p className="text-white/60 text-lg max-w-xs leading-relaxed">
            This experience is optimized for landscape orientation.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
};
