import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone } from 'lucide-react';

export const OrientationOverlay: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      setIsPortrait(portrait);
      setIsMobile(mobile);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return (
    <AnimatePresence>
      {isMobile && isPortrait && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-8 text-center"
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
};
